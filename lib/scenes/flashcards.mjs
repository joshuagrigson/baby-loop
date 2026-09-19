// Flashcards — the LEARN track. Shows one item per card: a big emoji (or a
// drawn shape), the word in large type, optional count grid for numbers.
// Exposes `state.cues` so the composer can narrate each card ("Red! A red apple.").
// options.items: [{ word, emoji?, shape?, color?, hex?, count?, say? }]
import { TAU, easeOutBack, smoothstep, withAlpha, clamp } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { emoji, label, circle, square, triangle, star, heart, roundRect } from '../draw.mjs';

const SHAPE_DRAW = {
  circle: (ctx, x, y, s, f, o) => circle(ctx, x, y, s / 2, f, o, s * 0.03),
  square: (ctx, x, y, s, f, o) => square(ctx, x, y, s * 0.9, f, o, s * 0.03),
  triangle: (ctx, x, y, s, f, o) => triangle(ctx, x, y + s * 0.08, s, f, o, s * 0.03),
  star: (ctx, x, y, s, f, o) => star(ctx, x, y, s / 2, s / 5, 5, f, o, s * 0.03),
  heart: (ctx, x, y, s, f, o) => heart(ctx, x, y + s * 0.05, s, f, o, s * 0.03),
};

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
    const cards = items.map((it, i) => ({
      ...it,
      start: i * per, end: (i + 1) * per,
      bg: it.bg || bgs[i % bgs.length],
      title: (it.title || it.word || '').toUpperCase(),
    }));
    // Narration cues: what to say and when (relative to segment start)
    const cues = cards.map((c) => ({ t: c.start + 0.5, text: c.say || c.word }));
    return { pal, cards, per, cues, total: per * items.length };
  },

  draw(ctx, t, s, { W, H }) {
    const i = clamp(Math.floor(t / s.per), 0, s.cards.length - 1);
    const c = s.cards[i];
    const local = t - c.start;
    const u = local / s.per;
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    // soft radial spotlight
    const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.05, W / 2, H * 0.45, H * 0.7);
    g.addColorStop(0, withAlpha('#ffffff', 0.35)); g.addColorStop(1, withAlpha('#ffffff', 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    const pop = easeOutBack(clamp(local / 0.6));
    const wig = Math.sin(local * TAU * 0.8) * 0.06;
    const fadeOut = 1 - smoothstep((u - 0.9) / 0.1);
    ctx.save();
    ctx.globalAlpha = fadeOut;
    ctx.translate(W / 2, H * 0.44);
    ctx.rotate(wig);
    ctx.scale(pop, pop);
    const size = H * 0.42;
    if (c.count) {
      // number card: numeral left, count grid right
      label(ctx, String(c.count), -W * 0.22, 0, { size: H * 0.5, fill: '#ffffff', stroke: '#1b1b1b', lw: H * 0.05 });
      const cols = c.count <= 3 ? c.count : c.count <= 6 ? 3 : 4;
      const rows = Math.ceil(c.count / cols);
      const cell = Math.min(W * 0.1, H * 0.16);
      const gx = W * 0.05, gy = -((rows - 1) * cell) / 2;
      for (let k = 0; k < c.count; k++) {
        const cx = gx + (k % cols) * cell, cy = gy + Math.floor(k / cols) * cell;
        const appear = clamp((local - 0.5 - k * 0.35) / 0.3);
        if (appear <= 0) continue;
        ctx.save(); ctx.translate(cx, cy); ctx.scale(easeOutBack(appear), easeOutBack(appear));
        emoji(ctx, c.emoji || '🍎', 0, 0, cell * 0.8);
        ctx.restore();
      }
    } else if (c.shape && SHAPE_DRAW[c.shape]) {
      SHAPE_DRAW[c.shape](ctx, 0, 0, size, c.hex || '#ffffff', '#1b1b1b');
    } else if (c.emoji) {
      roundRect(ctx, -size * 0.62, -size * 0.62, size * 1.24, size * 1.24, size * 0.2, withAlpha('#ffffff', 0.85));
      emoji(ctx, c.emoji, 0, 0, size * 0.95);
    }
    ctx.restore();

    // word
    const wordIn = smoothstep((local - 0.35) / 0.4);
    if (wordIn > 0) {
      label(ctx, c.title, W / 2, H * 0.83, { size: H * 0.16, fill: c.hex || '#ffffff', stroke: '#1b1b1b', lw: H * 0.018, maxWidth: W * 0.9, alpha: wordIn * fadeOut });
    }
    // progress dots
    for (let k = 0; k < s.cards.length; k++) {
      circle(ctx, W / 2 + (k - (s.cards.length - 1) / 2) * H * 0.035, H * 0.965, H * 0.008, withAlpha('#1b1b1b', k === i ? 0.7 : 0.25));
    }
  },
};
