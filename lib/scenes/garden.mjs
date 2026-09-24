// Garden — a row of smiling flowers that sway and bloom on the beat, with bees
// and butterflies drifting through. Periodic over the loop. Good for Spring,
// Morning Mood, Waltz-time pieces and lullabies.
import { TAU, pulse, blink, withAlpha, wobble } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { drawBackdrop, circle, ellipse, face, emoji, confetti, makeConfetti, shaded, vignette } from '../draw.mjs';

const PETALS = ['#ff6fae', '#ffd166', '#c5a3ff', '#7cc7ff', '#ff8c42', '#ff5a6e', '#8ee6a4', '#ffffff'];

export default {
  id: 'garden',
  name: 'Flower Garden',
  ageBand: '3–36 months',
  kind: 'loop',
  defaults: { bpm: 96, music: 'learn', palette: 'pastel' },

  init({ W, H, rng, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'pastel', options.theme || null);
    const n = options.count || rng.int(6, 8);
    const flowers = Array.from({ length: n }, (_, i) => ({
      x: (W / (n + 1)) * (i + 1) + rng.range(-W * 0.02, W * 0.02),
      h: H * rng.range(0.26, 0.42),
      r: H * rng.range(0.055, 0.08),
      petals: rng.int(5, 8),
      color: pal.theme ? rng.pick(pal.pops) : PETALS[i % PETALS.length],
      centre: rng.pick(['#ffd400', '#ffb400', '#ff8c1a']),
      phase: rng.range(0, TAU),
      beatOff: i % 2 ? 0.5 : 0,
      blinkOff: rng.range(0, 3),
    }));
    const flyers = [
      { e: '🐝', y: H * 0.3, k: 1, off: 0.0, amp: H * 0.06, size: H * 0.08 },
      { e: '🦋', y: H * 0.22, k: 1, off: 0.5, amp: H * 0.1, size: H * 0.09, dir: -1 },
      { e: '🐞', y: H * 0.5, k: 2, off: 0.25, amp: H * 0.03, size: H * 0.06 },
      { e: '🐝', y: H * 0.42, k: 1, off: 0.72, amp: H * 0.05, size: H * 0.07, dir: -1 },
    ];
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 10) : [];
    return { pal, flowers, flyers, pieces, backdrop: pal.theme ? 'sunny' : 'meadow' };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds }) {
    const { horizon } = drawBackdrop(ctx, s.backdrop, W, H, { phase, t });
    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);
    const ground = horizon + H * 0.18;
    for (const f of s.flowers) {
      const sway = Math.sin(TAU * phase * 2 + f.phase) * 0.12 + Math.sin(Math.PI * (beat / 2 + f.beatOff)) * 0.05;
      const bloom = 1 + 0.12 * pulse(beat / 2 + f.beatOff);
      const topX = f.x + Math.sin(sway) * f.h, topY = ground - Math.cos(sway) * f.h;
      // stem + leaves
      ctx.strokeStyle = '#3f9a4a'; ctx.lineWidth = H * 0.014; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(f.x, ground); ctx.quadraticCurveTo(f.x + Math.sin(sway) * f.h * 0.3, ground - f.h * 0.55, topX, topY); ctx.stroke();
      for (const side of [-1, 1]) ellipse(ctx, f.x + side * H * 0.035, ground - f.h * (side < 0 ? 0.3 : 0.45), H * 0.035, H * 0.016, '#4fb05a', side * 0.6);
      // petals
      ctx.save();
      ctx.translate(topX, topY);
      ctx.rotate(Math.sin(TAU * phase + f.phase) * 0.3);
      for (let p = 0; p < f.petals; p++) {
        const a = (p / f.petals) * TAU;
        const px = Math.cos(a) * f.r * 1.05 * bloom, py = Math.sin(a) * f.r * 1.05 * bloom;
        ellipse(ctx, px, py, f.r * 0.62 * bloom, f.r * 0.4 * bloom, shaded(ctx, f.color, f.r * 0.7, px, py, 0.8), a);
      }
      circle(ctx, 0, 0, f.r * 0.78, shaded(ctx, f.centre, f.r * 0.8), '#1b1b1b', H * 0.004);
      face(ctx, { x: 0, y: 0, size: f.r * 1.5, blink: blink(t, loopSeconds, 3.4, f.blinkOff), mouth: 0.25 + 0.4 * pulse(beat / 2 + f.beatOff), cheeks: true, eyeScale: 0.95 });
      ctx.restore();
    }
    for (const fl of s.flyers) {
      const p = (phase * fl.k + fl.off) % 1;
      const dir = fl.dir || 1;
      const x = dir > 0 ? -fl.size + p * (W + 2 * fl.size) : W + fl.size - p * (W + 2 * fl.size);
      const y = fl.y + Math.sin(p * TAU * 4) * fl.amp + wobble(t, loopSeconds / 3) * H * 0.01;
      ctx.save(); ctx.translate(x, y); if (dir > 0) ctx.scale(-1, 1);
      ctx.rotate(Math.sin(p * TAU * 8) * 0.15);
      emoji(ctx, fl.e, 0, 0, fl.size);
      ctx.restore();
    }
    // grass tufts
    ctx.strokeStyle = withAlpha('#2f7d3d', 0.8); ctx.lineWidth = H * 0.006;
    for (let i = 0; i < 30; i++) {
      const gx = (i / 30) * W + Math.sin(i) * 10, lean = Math.sin(TAU * phase * 2 + i) * 0.25;
      ctx.beginPath(); ctx.moveTo(gx, ground + H * 0.02); ctx.lineTo(gx + lean * H * 0.05, ground - H * 0.04); ctx.stroke();
    }
    vignette(ctx, W, H, 0.12);
  },
};
