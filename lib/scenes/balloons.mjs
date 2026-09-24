// Balloons — a party of smiling balloons rising and bobbing to the beat, each
// completing an integer number of rises per loop. Pairs with Can-Can, William
// Tell, Turkish March, Surprise Symphony.
import { TAU, pulse, blink, withAlpha, wobble } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { vgradient, ellipse, face, circle, confetti, makeConfetti, cloud, shaded, vignette } from '../draw.mjs';

export default {
  id: 'balloons',
  name: 'Balloon Party',
  ageBand: '3–24 months',
  kind: 'loop',
  defaults: { bpm: 116, music: 'dance', palette: 'primary' },

  init({ W, H, rng, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'primary', options.theme || null);
    const n = options.count || rng.int(8, 11);
    const colors = pal.theme ? pal.pops : ['#ff5a5a', '#ffd93d', '#4d96ff', '#6bcb77', '#ff8fb1', '#ff9f43', '#845ec2', '#08d9d6'];
    const balloons = Array.from({ length: n }, (_, i) => ({
      x: rng.range(0.06, 0.94) * W,
      r: H * rng.range(0.07, 0.12),
      color: colors[i % colors.length],
      k: rng.int(1, 2),
      off: rng.range(0, 1),
      wob: rng.int(1, 3),
      amp: W * rng.range(0.01, 0.04),
      beatOff: i % 2 ? 0.5 : 0,
      blinkOff: rng.range(0, 3),
      ph: rng.range(0, TAU),
    })).sort((a, b) => a.r - b.r);
    const pieces = makeConfetti(rng, pal.theme ? pal.theme.confetti : ['🎉', '✨', '⭐', '🎊'], W, H, 12);
    return { pal, balloons, pieces, bg: pal.theme ? pal.bg : '#bfe9ff' };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds }) {
    vgradient(ctx, W, H, s.bg, withAlpha('#ffffff', 1));
    for (let i = 0; i < 3; i++) {
      const cw = W * 0.2;
      const cx = ((W * (0.1 + i * 0.35) + phase * W * 0.5) % (W + cw * 2)) - cw;
      cloud(ctx, cx, H * (0.14 + 0.1 * (i % 2)), cw, withAlpha('#ffffff', 0.85));
    }
    confetti(ctx, s.pieces, W, H, phase);
    for (const b of s.balloons) {
      const span = H + 4 * b.r;
      const p = (phase * b.k + b.off) % 1;
      const y = H + 2 * b.r - p * span + Math.sin(Math.PI * (beat / 2 + b.beatOff)) * H * 0.02;
      const x = b.x + Math.sin(TAU * (phase * b.wob) + b.ph) * b.amp;
      const sq = 1 + 0.06 * pulse(beat / 2 + b.beatOff);
      const tilt = wobble(t, loopSeconds / (b.wob + 1), b.ph) * 0.12;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      // string
      ctx.strokeStyle = withAlpha('#1b1b1b', 0.6); ctx.lineWidth = Math.max(1.5, H * 0.003);
      ctx.beginPath(); ctx.moveTo(0, b.r * 1.22); ctx.quadraticCurveTo(b.r * 0.4 * Math.sin(TAU * phase * 3 + b.ph), b.r * 2.2, 0, b.r * 3.2); ctx.stroke();
      // body
      ellipse(ctx, 0, 0, b.r * sq, b.r * 1.18 / sq, shaded(ctx, b.color, b.r * 1.2, 0, 0, 1.1));
      ctx.beginPath(); ctx.ellipse(0, 0, b.r * sq, b.r * 1.18 / sq, 0, 0, TAU); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = H * 0.004; ctx.stroke();
      // knot
      ctx.beginPath(); ctx.moveTo(-b.r * 0.1, b.r * 1.15); ctx.lineTo(b.r * 0.1, b.r * 1.15); ctx.lineTo(0, b.r * 1.3); ctx.closePath(); ctx.fillStyle = b.color; ctx.fill(); ctx.stroke();
      // highlight
      ellipse(ctx, -b.r * 0.35, -b.r * 0.45, b.r * 0.16, b.r * 0.3, withAlpha('#ffffff', 0.55), -0.4);
      face(ctx, { x: 0, y: b.r * 0.1, size: b.r * 1.6, blink: blink(t, loopSeconds, 3.2, b.blinkOff), mouth: 0.25 + 0.5 * pulse(beat / 2 + b.beatOff), cheeks: true });
      ctx.restore();
    }
    circle(ctx, W * 0.9, H * 0.12, H * 0.06, withAlpha('#ffd84a', 0.9));
    vignette(ctx, W, H, 0.14);
  },
};
