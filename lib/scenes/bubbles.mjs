// Bubbles — pastel underwater drift. Each bubble completes an integer number of
// rises per loop so the loop is seamless. Two fish cross the frame per loop.
import { TAU, withAlpha } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { vgradient, circle, emoji, confetti, makeConfetti } from '../draw.mjs';

export default {
  id: 'bubbles',
  name: 'Bubbles',
  ageBand: '3–24 months',
  kind: 'loop',
  defaults: { bpm: 96, music: 'learn', palette: 'pastel' },

  init({ W, H, rng, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'pastel', options.theme || null);
    const bubbles = Array.from({ length: options.count || 26 }, () => ({
      x: rng.range(0.03, 0.97) * W,
      r: H * rng.range(0.025, 0.09),
      k: rng.int(1, 3),                // rises per loop
      off: rng.range(0, 1),
      wob: rng.int(1, 3),              // horizontal wobbles per loop
      wobAmp: W * rng.range(0.01, 0.04),
      color: rng.pick(pal.pops),
      phase: rng.range(0, TAU),
    })).sort((a, b) => a.r - b.r);
    const fish = [
      { e: '🐠', y: H * 0.62, dir: 1, off: 0.1, size: H * 0.16 },
      { e: '🐟', y: H * 0.36, dir: -1, off: 0.55, size: H * 0.12 },
      { e: '🐢', y: H * 0.85, dir: 1, off: 0.8, size: H * 0.14 },
      { e: '🐙', y: H * 0.5, dir: -1, off: 0.3, size: H * 0.15 },
      { e: '🦀', y: H * 0.9, dir: -1, off: 0.05, size: H * 0.11 },
      { e: '🐬', y: H * 0.22, dir: 1, off: 0.45, size: H * 0.17 },
      { e: '🦑', y: H * 0.72, dir: 1, off: 0.68, size: H * 0.12 },
      { e: '🐡', y: H * 0.42, dir: -1, off: 0.9, size: H * 0.11 },
    ];
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 10) : [];
    return { pal, bubbles, fish, pieces, top: pal.bgs[0], bottom: pal.pops[1] };
  },

  draw(ctx, t, s, { W, H, phase }) {
    vgradient(ctx, W, H, s.top, withAlpha(s.bottom, 1));
    // light rays
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let i = 0; i < 5; i++) {
      const x = W * (0.1 + i * 0.2) + Math.sin(TAU * phase + i) * W * 0.03;
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - W * 0.03, 0); ctx.lineTo(x + W * 0.03, 0); ctx.lineTo(x + W * 0.12, H); ctx.lineTo(x - W * 0.08, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);
    for (const f of s.fish) {
      const p = (phase + f.off) % 1;
      const x = f.dir > 0 ? -f.size + p * (W + 2 * f.size) : W + f.size - p * (W + 2 * f.size);
      const y = f.y + Math.sin(p * TAU * 3) * H * 0.02;
      ctx.save();
      ctx.translate(x, y);
      if (f.dir > 0) ctx.scale(-1, 1); // emoji fish face left by default
      emoji(ctx, f.e, 0, 0, f.size);
      ctx.restore();
    }

    for (const b of s.bubbles) {
      const span = H + 2 * b.r;
      const p = (phase * b.k + b.off) % 1;
      const y = H + b.r - p * span;
      const x = b.x + Math.sin(TAU * (phase * b.wob) + b.phase) * b.wobAmp;
      const g = ctx.createRadialGradient(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.1, x, y, b.r);
      g.addColorStop(0, withAlpha('#ffffff', 0.35));
      g.addColorStop(0.7, withAlpha(b.color, 0.12));
      g.addColorStop(1, withAlpha(b.color, 0.55));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
      circle(ctx, x, y, b.r, null, withAlpha('#ffffff', 0.6), Math.max(1.5, b.r * 0.06));
      // highlight
      ctx.strokeStyle = withAlpha('#ffffff', 0.9);
      ctx.lineWidth = Math.max(1.5, b.r * 0.08);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, b.r * 0.72, Math.PI * 1.15, Math.PI * 1.45); ctx.stroke();
      // pop ring right before it leaves the top
      if (p > 0.96) {
        const q = (p - 0.96) / 0.04;
        circle(ctx, x, y, b.r * (1 + q * 0.8), null, withAlpha('#ffffff', 1 - q), b.r * 0.1 * (1 - q));
      }
    }
  },
};
