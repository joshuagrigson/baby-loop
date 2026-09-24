// Flashcards — the LEARN track. One item per card: a soft lit paper card pops
// in on an atmospheric field carrying a big glossy shape with a happy face, a
// drawn character / emoji sticker, or a numeral + count grid; the word lands
// underneath in big friendly gradient type, with sparkles on the reveal.
// Exposes `state.cues` so the composer can narrate each card ("Red! A red apple.").
// options.items: [{ word, emoji?, shape?, color?, hex?, count?, say? }]
import { TAU, easeOutBack, smoothstep, withAlpha, clamp, mixHex, hexToRgb, blink, pulse } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { label, circle, roundRect, face, atmosphere, sparkle } from '../draw.mjs';
import { drawProp } from '../critters/props.mjs';

const SHAPE_HEX = { circle: '#ff4d6d', square: '#3a86ff', triangle: '#ffbe0b', star: '#ffd60a', heart: '#ff5da2' };
const INK = '#1b1030';

// Shape outlines as paths centred on 0,0 with overall size s.
const SHAPE_PATH = {
  circle: (ctx, s) => { ctx.beginPath(); ctx.arc(0, 0, s * 0.5, 0, TAU); },
  square: (ctx, s) => roundPath(ctx, [[-0.45, -0.45], [0.45, -0.45], [0.45, 0.45], [-0.45, 0.45]], s, 0.16),
  triangle: (ctx, s) => roundPath(ctx, [[0, -0.5], [0.55, 0.45], [-0.55, 0.45]], s, 0.12),
  star: (ctx, s) => {
    const pts = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 0.25 : 0.56; pts.push([Math.cos(a) * r, Math.sin(a) * r + 0.04]); }
    roundPath(ctx, pts, s, 0.06);
  },
  heart: (ctx, s) => {
    const h = s / 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.95);
    ctx.bezierCurveTo(-h * 1.7, -h * 0.15, -h * 0.95, -h * 1.25, 0, -h * 0.45);
    ctx.bezierCurveTo(h * 0.95, -h * 1.25, h * 1.7, -h * 0.15, 0, h * 0.95);
    ctx.closePath();
  },
};
// where the face sits on each shape: [y offset, face size] in shape sizes
const SHAPE_FACE = { circle: [0.02, 0.78], square: [0.02, 0.8], triangle: [0.16, 0.56], star: [0.07, 0.5], heart: [-0.02, 0.66] };

// polygon with rounded corners (radius r in shape sizes)
function roundPath(ctx, pts, s, r) {
  const P = pts.map(([x, y]) => [x * s, y * s]);
  const n = P.length;
  ctx.beginPath();
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const m0 = mid(P[n - 1], P[0]);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) {
    const p = P[i], q = mid(p, P[(i + 1) % n]);
    ctx.arcTo(p[0], p[1], q[0], q[1], r * s);
  }
  ctx.closePath();
}

const luminance = (hex) => { const [r, g, b] = hexToRgb(hex); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

function drawShape(ctx, kind, size, hex, o) {
  const path = SHAPE_PATH[kind];
  const g = ctx.createRadialGradient(-size * 0.2, -size * 0.25, size * 0.03, 0, 0, size * 0.62);
  g.addColorStop(0, mixHex(hex, '#ffffff', 0.45));
  g.addColorStop(0.5, hex);
  g.addColorStop(1, mixHex(hex, '#3a1d3a', 0.3));
  ctx.save();
  ctx.lineJoin = 'round';
  // thick dark outline behind, then the lit body
  path(ctx, size);
  ctx.strokeStyle = mixHex(hex, INK, 0.62); ctx.lineWidth = size * 0.05; ctx.stroke();
  ctx.fillStyle = g; ctx.fill();
  // glossy highlight + rim light, clipped to the body
  ctx.save();
  ctx.clip();
  ctx.beginPath(); ctx.ellipse(-size * 0.2, -size * 0.28, size * 0.2, size * 0.1, -0.6, 0, TAU);
  ctx.fillStyle = withAlpha('#ffffff', 0.55); ctx.fill();
  circle(ctx, -size * 0.34, -size * 0.12, size * 0.035, withAlpha('#ffffff', 0.8));
  const rim = ctx.createLinearGradient(-size * 0.5, -size * 0.5, size * 0.5, size * 0.5);
  rim.addColorStop(0.6, withAlpha('#ffffff', 0)); rim.addColorStop(1, withAlpha('#ffffff', 0.35));
  path(ctx, size);
  ctx.strokeStyle = rim; ctx.lineWidth = size * 0.07; ctx.stroke();
  ctx.restore();
  const [fy, fs] = SHAPE_FACE[kind] || [0, 0.7];
  face(ctx, { x: 0, y: fy * size, size: fs * size, ...o, cheeks: true });
  ctx.restore();
}

// Paper card: drop shadow, warm paper gradient, speckle texture, tinted inner
// frame and a diagonal gloss sheen.
function drawCard(ctx, w, h, tint, specks, H) {
  const r = Math.min(w, h) * 0.1;
  ctx.save();
  ctx.shadowColor = 'rgba(40,20,70,0.32)'; ctx.shadowBlur = H * 0.045; ctx.shadowOffsetY = H * 0.022;
  const pg = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  pg.addColorStop(0, '#ffffff'); pg.addColorStop(1, '#fff3e2');
  roundRect(ctx, -w / 2, -h / 2, w, h, r, pg);
  ctx.restore();
  ctx.save();
  roundRect(ctx, -w / 2, -h / 2, w, h, r, null);
  ctx.clip();
  // soft tint wash toward the bottom
  const tg = ctx.createRadialGradient(0, h * 0.1, h * 0.1, 0, h * 0.1, h * 0.75);
  tg.addColorStop(0, withAlpha(tint, 0)); tg.addColorStop(1, withAlpha(tint, 0.12));
  ctx.fillStyle = tg; ctx.fillRect(-w / 2, -h / 2, w, h);
  for (const p of specks) circle(ctx, p.x * w, p.y * h, p.r * H, withAlpha(p.dark ? '#8a6a4a' : '#ffffff', p.a));
  // gloss sheen across the top-left
  const sg = ctx.createLinearGradient(-w / 2, -h / 2, -w * 0.1, h * 0.1);
  sg.addColorStop(0, withAlpha('#ffffff', 0.55)); sg.addColorStop(0.5, withAlpha('#ffffff', 0.12)); sg.addColorStop(0.51, withAlpha('#ffffff', 0));
  ctx.fillStyle = sg; ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.restore();
  const inset = H * 0.022;
  roundRect(ctx, -w / 2 + inset, -h / 2 + inset, w - inset * 2, h - inset * 2, r * 0.75, null, withAlpha(tint, 0.55), H * 0.008);
  roundRect(ctx, -w / 2 + 1, -h / 2 + 1, w - 2, h - 2, r, null, withAlpha('#ffffff', 0.9), Math.max(1.5, H * 0.003));
}

export default {
  id: 'flashcards',
  name: 'Flashcards (learn)',
  ageBand: '12–36 months',
  kind: 'timeline',
  defaults: { bpm: 94, music: 'learn', palette: 'primary', perCard: 6 },

  init({ W, H, rng, loopSeconds, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'primary', options.theme || null);
    const items = options.items && options.items.length ? options.items : [
      { word: 'circle', shape: 'circle', hex: '#e63946' }, { word: 'square', shape: 'square', hex: '#1d7bf2' },
      { word: 'triangle', shape: 'triangle', hex: '#ffb400' }, { word: 'star', shape: 'star', hex: '#f4d35e' }, { word: 'heart', shape: 'heart', hex: '#ff4d8d' },
    ];
    const per = options.perCard || loopSeconds / items.length;
    const bgs = rng.shuffle(pal.bgs);
    const pops = (pal.pops || []).filter((c) => luminance(c) < 0.85);
    const cards = items.map((it, i) => {
      let hex = it.hex || SHAPE_HEX[it.shape] || pops[i % (pops.length || 1)] || '#ff4d6d';
      if (luminance(hex) > 0.9) hex = SHAPE_HEX[it.shape] || pops[i % (pops.length || 1)] || '#ff4d6d';
      return {
        ...it, hex,
        start: i * per, end: (i + 1) * per,
        bg: it.bg || bgs[i % bgs.length],
        title: (it.title || it.word || '').toUpperCase(),
      };
    });
    const specks = Array.from({ length: 90 }, () => ({ x: rng.range(-0.5, 0.5), y: rng.range(-0.5, 0.5), r: rng.range(0.0008, 0.0022), a: rng.range(0.05, 0.14), dark: rng.chance(0.7) }));
    // Narration cues: what to say and when (relative to segment start)
    const cues = cards.map((c) => ({ t: c.start + 0.5, text: c.say || c.word }));
    void W; void H;
    return { pal, cards, per, cues, specks, total: per * items.length };
  },

  draw(ctx, t, s, { W, H, beat = 0, phase = 0, seconds }) {
    const n = s.cards.length;
    const i = clamp(Math.floor(t / s.per), 0, n - 1);
    const c = s.cards[i];
    const next = s.cards[Math.min(n - 1, i + 1)];
    const local = t - c.start;
    const u = local / s.per;
    const out = smoothstep((u - 0.9) / 0.1);                 // 0 → 1 over the last 10%
    const bg = mixHex(c.bg, next.bg, out);
    atmosphere(ctx, W, H, { bg, pops: s.pal.pops, phase, bokeh: 10, vignette: 0.2 });

    // slow sunburst behind the card
    ctx.save();
    ctx.translate(W / 2, H * 0.42);
    ctx.rotate(TAU * phase + local * 0.05);
    ctx.fillStyle = withAlpha('#ffffff', 0.07);
    for (let k = 0; k < 16; k++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, W, (k / 16) * TAU, ((k + 0.5) / 16) * TAU);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    const pop = easeOutBack(clamp(local / 0.55));
    const scale = (0.25 + 0.75 * pop) * (1 - 0.15 * out);
    const alpha = clamp(local / 0.15) * (1 - out);
    const numbers = !!c.count;
    const cw = numbers ? Math.min(W * 0.66, H * 1.15) : H * 0.62, ch = H * 0.58;
    const cx = W / 2, cy = H * 0.41 - out * H * 0.04;
    const bl = blink(t, seconds || s.total, 3.3, i * 0.7);
    const talk = 0.25 + 0.45 * pulse(beat / 2);
    const hop = Math.abs(Math.sin(Math.PI * beat / 2));

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(cx, cy);
    ctx.rotate((1 - pop) * -0.25 + Math.sin(local * TAU * 0.25) * 0.012);
    ctx.scale(scale, scale);
    drawCard(ctx, cw, ch, c.hex, s.specks, H);

    const inner = easeOutBack(clamp((local - 0.15) / 0.5));
    const size = H * 0.38;
    if (numbers) {
      // numeral on the left, the counted things popping in on the right
      label(ctx, String(c.count), -cw * 0.27, H * 0.01, { size: H * 0.4 * inner, gradient: [mixHex(c.hex, '#ffffff', 0.35), c.hex], stroke: INK, lw: H * 0.03, shadow: H * 0.02 });
      const cols = c.count <= 3 ? c.count : c.count <= 6 ? 3 : 4;
      const rows = Math.ceil(c.count / cols);
      const cell = Math.min((cw * 0.5) / cols, (ch * 0.78) / rows);
      const gx = cw * 0.2 - ((cols - 1) * cell) / 2, gy = -((rows - 1) * cell) / 2;
      for (let k = 0; k < c.count; k++) {
        const appear = clamp((local - 0.5 - k * 0.35) / 0.35);
        if (appear <= 0) continue;
        const e = easeOutBack(appear);
        const px = gx + (k % cols) * cell, py = gy + Math.floor(k / cols) * cell;
        ctx.save();
        ctx.translate(px, py - (appear < 1 ? 0 : hop * cell * 0.04));
        ctx.scale(e, e);
        drawProp(ctx, c.emoji || '🍎', 0, 0, cell * 0.82, { blink: bl, mouth: talk, wave: Math.sin(TAU * beat / 4 + k) * 0.5 });
        ctx.restore();
        if (appear < 1) for (let j = 0; j < 4; j++) {
          const a = (j / 4) * TAU + k, d = cell * (0.35 + 0.3 * appear);
          sparkle(ctx, px + Math.cos(a) * d, py + Math.sin(a) * d, cell * 0.08, '#ffe066', 1 - appear);
        }
      }
    } else if (c.shape && SHAPE_PATH[c.shape]) {
      ctx.save();
      ctx.translate(0, H * 0.005 - hop * H * 0.012);
      ctx.scale(inner * (1 + 0.03 * pulse(beat / 2)), inner * (1 - 0.03 * pulse(beat / 2)));
      drawShape(ctx, c.shape, size, c.hex, { blink: bl, mouth: talk, look: [Math.sin(local * 0.8) * 0.6, 0.1], brow: 0.3 + 0.5 * hop });
      ctx.restore();
    } else if (c.emoji) {
      // colour splash disc behind the object (colours lesson), then the prop
      const r = size * 0.5;
      const dg = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.05, 0, 0, r * 1.1);
      dg.addColorStop(0, mixHex(c.hex, '#ffffff', 0.55)); dg.addColorStop(1, mixHex(c.hex, '#ffffff', 0.15));
      circle(ctx, 0, 0, r * inner, dg);
      ctx.save();
      ctx.translate(0, -hop * H * 0.01);
      ctx.scale(inner, inner);
      drawProp(ctx, c.emoji, 0, 0, size * 0.92, { blink: bl, mouth: talk, wave: Math.sin(TAU * beat / 4) * 0.7, look: [Math.sin(local * 0.8) * 0.5, 0.1] });
      ctx.restore();
    }
    ctx.restore();

    // reveal sparkles bursting out from behind the card
    const sp = (local - 0.2) / 1.0;
    if (sp > 0 && sp < 1 && out === 0) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU + i;
        const d = H * (0.25 + 0.3 * smoothstep(sp)) * (k % 2 ? 1 : 1.2);
        sparkle(ctx, cx + Math.cos(a) * d * 1.3, cy + Math.sin(a) * d, H * 0.028 * (1 - sp * 0.5), k % 3 ? '#ffffff' : '#ffe066', 1 - sp);
      }
    }
    // steady twinkles at the card corners
    for (let k = 0; k < 4; k++) {
      const tw = Math.max(0, Math.sin(TAU * (local * 0.6) + k * 1.7));
      sparkle(ctx, cx + (k % 2 ? 1 : -1) * cw * 0.52 * scale, cy + (k < 2 ? -1 : 1) * ch * 0.52 * scale, H * 0.022 * tw, '#ffffff', tw * alpha);
    }

    // the word
    const wordIn = clamp((local - 0.35) / 0.5);
    if (wordIn > 0) {
      const e = easeOutBack(wordIn);
      ctx.save();
      ctx.translate(W / 2, H * 0.845);
      ctx.scale(e, e);
      label(ctx, c.title, 0, 0, {
        size: H * 0.15, gradient: [mixHex(c.hex, '#ffffff', 0.45), c.hex], stroke: INK, lw: H * 0.024,
        maxWidth: W * 0.84, alpha: (1 - out), shadow: H * 0.025,
      });
      ctx.restore();
    }

    // progress dots on a frosted pill
    const gap = H * 0.044, dy = H * 0.955;
    const pw = gap * (n - 1) + H * 0.07;
    roundRect(ctx, W / 2 - pw / 2, dy - H * 0.018, pw, H * 0.036, H * 0.018, withAlpha('#ffffff', 0.28));
    for (let k = 0; k < n; k++) {
      const x = W / 2 + (k - (n - 1) / 2) * gap;
      if (k === i) roundRect(ctx, x - H * 0.018, dy - H * 0.009, H * 0.036, H * 0.018, H * 0.009, c.hex, '#ffffff', H * 0.003);
      else circle(ctx, x, dy, H * 0.0075, withAlpha('#ffffff', k < i ? 0.95 : 0.5));
    }
  },
};
