// Story — narrated picture-book pages. Not a loop: the composer sets page
// timings from the narration length and passes them in options.pages:
//   [{ text, caption, scene: { background, props[], motion }, start, end }]
// Each page is a layered storybook backdrop + a tableau of props (drawn
// characters where the cast has one, die-cut emoji stickers otherwise) with
// gentle motion, a title and a caption pill — framed like a picture book, with
// a page-turn between pages.
import { TAU, smoothstep, clamp, easeOutBack, easeInOutSine, blink, pulse, withAlpha, mixHex } from '../easing.mjs';
import { drawBackdrop, captionPill, shadow, label, sparkle } from '../draw.mjs';
import { drawProp } from '../critters/props.mjs';

// Each motion returns rotation, offsets (in prop sizes), scale and squash.
const MOTION = {
  sway: (t, i) => ({ rot: Math.sin(t * TAU * 0.35 + i) * 0.08, dx: 0, dy: 0, sc: 1, sq: 0 }),
  bounce: (t, i) => {
    const s = Math.abs(Math.sin(t * TAU * 0.7 * 0.5 + i * 0.9));
    return { rot: 0, dx: 0, dy: -s * 0.1, sc: 1, sq: Math.pow(1 - s, 6) * 0.7 - s * 0.25 };
  },
  float: (t, i) => ({ rot: Math.sin(t * TAU * 0.25 + i) * 0.04, dx: 0, dy: Math.sin(t * TAU * 0.3 + i) * 0.05, sc: 1, sq: 0 }),
  shake: (t, i) => ({ rot: Math.sin(t * TAU * 3 + i) * 0.05, dx: Math.sin(t * TAU * 4 + i) * 0.02, dy: 0, sc: 1, sq: 0 }),
  grow: (t) => ({ rot: 0, dx: 0, dy: 0, sc: 0.55 + 0.45 * smoothstep(t / 4), sq: 0 }),
  still: () => ({ rot: 0, dx: 0, dy: 0, sc: 1, sq: 0 }),
};

const PROP_SIZE = [0.38, 0.38, 0.33, 0.29, 0.25, 0.22, 0.2];

function drawPage(ctx, page, local, info) {
  const { W, H, phase, t, beat = 0, seconds } = info;
  const { horizon } = drawBackdrop(ctx, page.scene?.background || 'meadow', W, H, { phase, t });
  const props = page.scene?.props || [];
  const motion = MOTION[page.scene?.motion] || MOTION.sway;
  const n = props.length;
  const size = H * PROP_SIZE[Math.min(n, PROP_SIZE.length - 1)];
  const spacing = Math.min(W * 0.24, size * 1.32);
  // characters stand on the horizon line; the caption pill lives below them
  const baseY = (horizon || H * 0.72) - size * 0.4;
  props.forEach((p, i) => {
    const enter = easeOutBack(clamp((local - 0.1 - i * 0.12) / 0.6));
    if (enter <= 0) return;
    const m = motion(local, i);
    const x = W / 2 + (i - (n - 1) / 2) * spacing + m.dx * size;
    const y = baseY + m.dy * size;
    const lift = clamp(-m.dy / 0.1);
    shadow(ctx, x, baseY + size * 0.5, size * 0.85 * m.sc * (1 - 0.25 * lift) * clamp(enter, 0, 1), 0.2 - 0.08 * lift);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(m.rot);
    ctx.scale(enter * m.sc, enter * m.sc);
    drawProp(ctx, p, 0, 0, size, {
      blink: blink(t, seconds || 30, 3.1, i * 0.83),
      mouth: 0.2 + 0.3 * pulse(beat / 2 + i * 0.5),
      wave: Math.sin(TAU * (local * 0.45) + i * 1.3) * 0.6,
      squash: m.sq,
      look: [Math.sin(local * 0.7 + i) * 0.6, 0.1],
      brow: 0.5,
    });
    ctx.restore();
    // a little sparkle burst as each prop lands
    const since = local - 0.1 - i * 0.12;
    if (since > 0.15 && since < 0.95) {
      const k = (since - 0.15) / 0.8;
      for (let j = 0; j < 5; j++) {
        const a = -Math.PI * (0.15 + 0.7 * (j / 4));
        const d = size * (0.45 + 0.35 * k);
        sparkle(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, size * 0.06 * (1 - k * 0.6), '#fff4b0', 1 - k);
      }
    }
  });
  if (page.title) {
    const pop = easeOutBack(clamp(local / 0.7));
    ctx.save();
    ctx.translate(W / 2, H * 0.17);
    ctx.scale(pop, pop);
    label(ctx, page.title, 0, 0, { size: H * 0.13, gradient: ['#ffffff', '#ffe08a'], stroke: '#2b2b3a', lw: H * 0.02, maxWidth: W * 0.72, shadow: H * 0.025 });
    ctx.restore();
  }
  captionPill(ctx, page.caption, W, H, { y: H * 0.865, alpha: smoothstep((local - 0.2) / 0.5), accent: '#ffcf5a' });
}

// Picture-book cover band around the page: cloth colour, gold stitching and an
// inner shadow so the page reads as sitting inside the book.
function bookFrame(ctx, W, H, color) {
  const m = Math.round(H * 0.026), r = H * 0.045;
  const inner = () => {
    const x = m, y = m, w = W - 2 * m, h = H - 2 * m;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  ctx.save();
  // inner shadow cast by the cover onto the page
  ctx.save();
  ctx.beginPath(); inner(); ctx.clip();
  ctx.shadowColor = 'rgba(30,15,50,0.4)'; ctx.shadowBlur = H * 0.03;
  ctx.beginPath(); ctx.rect(-m * 4, -m * 4, W + m * 8, H + m * 8); inner();
  ctx.fillStyle = color; ctx.fill('evenodd');
  ctx.restore();
  // the cover band itself
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, mixHex(color, '#ffffff', 0.15)); g.addColorStop(1, mixHex(color, '#000000', 0.2));
  ctx.beginPath(); ctx.rect(0, 0, W, H); inner();
  ctx.fillStyle = g; ctx.fill('evenodd');
  // stitching
  ctx.beginPath();
  const s = m * 0.45;
  ctx.moveTo(s + r, s);
  ctx.arcTo(W - s, s, W - s, H - s, r);
  ctx.arcTo(W - s, H - s, s, H - s, r);
  ctx.arcTo(s, H - s, s, s, r);
  ctx.arcTo(s, s, W - s, s, r);
  ctx.closePath();
  ctx.setLineDash([H * 0.012, H * 0.009]);
  ctx.strokeStyle = withAlpha('#ffe08a', 0.75); ctx.lineWidth = Math.max(1.5, H * 0.0028);
  ctx.stroke();
  ctx.setLineDash([]);
  // gilt page edge
  ctx.beginPath(); inner();
  ctx.strokeStyle = withAlpha('#fff1c4', 0.9); ctx.lineWidth = Math.max(1.5, H * 0.003);
  ctx.stroke();
  ctx.restore();
}

// Page turn: the old page peels away from the right edge, its paper back
// folding over, revealing the new page underneath. e: 0..1.
function pageTurn(ctx, drawOld, e, W, H) {
  const xf = W * (1.08 - 1.16 * e);                 // fold line position (bottom-ish)
  const lean = H * 0.28 * Math.sin(Math.PI * e);    // fold leans: the top corner leads
  const xt = xf - lean * 0.5, xb = xf + lean * 0.5;
  // old page, left of the fold
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-2, -2); ctx.lineTo(xt, -2); ctx.lineTo(xb, H + 2); ctx.lineTo(-2, H + 2); ctx.closePath();
  ctx.clip();
  drawOld();
  ctx.restore();
  // shadow on the new page just right of the fold
  const sw = W * 0.06;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(xt, 0); ctx.lineTo(xt + sw, 0); ctx.lineTo(xb + sw, H); ctx.lineTo(xb, H); ctx.closePath();
  const sg = ctx.createLinearGradient(Math.min(xt, xb), 0, Math.min(xt, xb) + sw, 0);
  sg.addColorStop(0, 'rgba(20,10,40,0.28)'); sg.addColorStop(1, 'rgba(20,10,40,0)');
  ctx.fillStyle = sg; ctx.fill();
  ctx.restore();
  // the flap: back of the turning page, lying over the old page
  const ft = (W - xt) * 0.42, fb = (W - xb) * 0.42;
  if (ft + fb > 1) {
    ctx.save();
    ctx.shadowColor = 'rgba(20,10,40,0.3)'; ctx.shadowBlur = H * 0.03; ctx.shadowOffsetX = -H * 0.01;
    ctx.beginPath();
    ctx.moveTo(xt, 0);
    ctx.lineTo(xb, H);
    ctx.lineTo(xb - fb, H);
    ctx.quadraticCurveTo((xt - ft + xb - fb) / 2 - W * 0.02, H * 0.5, xt - ft, 0);
    ctx.closePath();
    const fg = ctx.createLinearGradient(xf, 0, xf - Math.max(ft, fb), 0);
    fg.addColorStop(0, '#d9ccb4'); fg.addColorStop(0.35, '#fbf4e6'); fg.addColorStop(1, '#efe4cf');
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }
}

export default {
  id: 'story',
  name: 'Story pages (narrated)',
  ageBand: '18–60 months',
  kind: 'timeline',
  defaults: { bpm: 72, music: 'lullaby' },

  init({ options = {} }) {
    const pages = options.pages || [
      { title: 'Story time', caption: 'Once upon a time…', scene: { background: 'meadow', props: ['🏠', '👦', '👩'], motion: 'sway' }, start: 0, end: 6 },
    ];
    return { pages, turn: 0.9, frame: options.frameColor || '#6d4bb3', total: pages[pages.length - 1].end };
  },

  draw(ctx, t, s, info) {
    const { pages, turn } = s;
    const { W, H } = info;
    let i = pages.findIndex((p) => t < p.end);
    if (i < 0) i = pages.length - 1;
    const p = pages[i];
    const since = t - p.start;
    drawPage(ctx, p, since, info);
    if (i > 0 && since < turn) {
      const prev = pages[i - 1];
      pageTurn(ctx, () => drawPage(ctx, prev, t - prev.start, info), easeInOutSine(since / turn), W, H);
    }
    bookFrame(ctx, W, H, s.frame);
  },
};
