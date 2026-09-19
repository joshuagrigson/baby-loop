// Story — narrated picture-book pages. Not a loop: the composer sets page
// timings from the narration length and passes them in options.pages:
//   [{ text, caption, scene: { background, props[], motion }, start, end }]
// Each page is a backdrop + an emoji tableau with gentle motion + a caption pill.
import { TAU, smoothstep, clamp, easeOutBack } from '../easing.mjs';
import { drawBackdrop, emoji, captionPill, shadow, label } from '../draw.mjs';

const MOTION = {
  sway: (t, i) => ({ rot: Math.sin(t * TAU * 0.35 + i) * 0.08, dx: 0, dy: 0, sc: 1 }),
  bounce: (t, i) => ({ rot: 0, dx: 0, dy: -Math.abs(Math.sin(t * TAU * 0.7 + i)) * 0.08, sc: 1 }),
  float: (t, i) => ({ rot: Math.sin(t * TAU * 0.25 + i) * 0.04, dx: 0, dy: Math.sin(t * TAU * 0.3 + i) * 0.05, sc: 1 }),
  shake: (t, i) => ({ rot: Math.sin(t * TAU * 3 + i) * 0.05, dx: Math.sin(t * TAU * 4 + i) * 0.02, dy: 0, sc: 1 }),
  grow: (t) => ({ rot: 0, dx: 0, dy: 0, sc: 0.55 + 0.45 * smoothstep(t / 4) }),
  still: () => ({ rot: 0, dx: 0, dy: 0, sc: 1 }),
};

function drawPage(ctx, page, local, { W, H, phase, t }, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  const { horizon } = drawBackdrop(ctx, page.scene?.background || 'meadow', W, H, { phase, t });
  const props = page.scene?.props || [];
  const motion = MOTION[page.scene?.motion] || MOTION.sway;
  const n = props.length;
  const size = H * (n <= 1 ? 0.4 : n === 2 ? 0.34 : n === 3 ? 0.29 : 0.24);
  const spacing = Math.min(W * 0.26, size * 1.25);
  // characters stand on the horizon line; the caption pill lives below them
  const baseY = (horizon || H * 0.72) - size * 0.42;
  const enter = easeOutBack(clamp(local / 0.7));
  props.forEach((p, i) => {
    const m = motion(local, i);
    const x = W / 2 + (i - (n - 1) / 2) * spacing + m.dx * size;
    const y = baseY + m.dy * size;
    shadow(ctx, x, baseY + size * 0.5, size * 0.9 * m.sc, 0.16);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(m.rot);
    ctx.scale(enter * m.sc, enter * m.sc);
    emoji(ctx, p, 0, 0, size);
    ctx.restore();
  });
  if (page.title) {
    label(ctx, page.title, W / 2, H * 0.17, { size: H * 0.13, fill: '#ffffff', stroke: '#2b2b3a', lw: H * 0.016, maxWidth: W * 0.7 });
  }
  captionPill(ctx, page.caption, W, H, { alpha: smoothstep((local - 0.2) / 0.5) });
  ctx.restore();
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
    return { pages, fade: 0.7, total: pages[pages.length - 1].end };
  },

  draw(ctx, t, s, info) {
    const { pages, fade } = s;
    let i = pages.findIndex((p) => t < p.end);
    if (i < 0) i = pages.length - 1;
    const p = pages[i];
    drawPage(ctx, p, t - p.start, info, 1);
    // cross-fade from previous page
    if (i > 0) {
      const since = t - p.start;
      if (since < fade) {
        const prev = pages[i - 1];
        drawPage(ctx, prev, t - prev.start, info, 1 - smoothstep(since / fade));
      }
    }
  },
};
