// Sleepy Stars — wind-down. Navy gradient, twinkling stars, a dozing moon with
// floating Zs, slow clouds, one sheep hopping a fence per loop. Slow music.
import { TAU, withAlpha, smoothstep } from '../easing.mjs';
import { PALETTES } from '../palette.mjs';
import { vgradient, circle, face, cloud, emoji, label, star } from '../draw.mjs';

export default {
  id: 'sleepy-stars',
  name: 'Sleepy Stars',
  ageBand: '0–36 months',
  kind: 'loop',
  defaults: { bpm: 66, music: 'lullaby', palette: 'sleepy' },

  init({ W, H, rng }) {
    const pal = PALETTES.sleepy;
    const stars = Array.from({ length: 90 }, () => ({
      x: rng.range(0, 1) * W, y: rng.range(0, 0.8) * H, r: H * rng.range(0.002, 0.006), k: rng.int(1, 4), ph: rng.range(0, TAU), big: rng.chance(0.12),
    }));
    const shooting = [{ at: 0.28, x0: W * 0.15, y0: H * 0.12 }, { at: 0.74, x0: W * 0.7, y0: H * 0.08 }];
    return { pal, stars, shooting };
  },

  draw(ctx, t, s, { W, H, phase, loopSeconds }) {
    const { pal } = s;
    vgradient(ctx, W, H, pal.top, pal.bottom);
    for (const st of s.stars) {
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * phase * st.k + st.ph));
      if (st.big) star(ctx, st.x, st.y, st.r * 4, st.r * 1.6, 4, withAlpha(pal.star, tw));
      else circle(ctx, st.x, st.y, st.r * (0.8 + 0.4 * tw), withAlpha(pal.star, tw));
    }
    // shooting stars
    for (const sh of s.shooting) {
      const d = 1.2 / loopSeconds; // 1.2 s long
      const q = (phase - sh.at) / d;
      if (q >= 0 && q <= 1) {
        const x = sh.x0 + q * W * 0.25, y = sh.y0 + q * H * 0.18;
        const g = ctx.createLinearGradient(x - W * 0.08, y - H * 0.06, x, y);
        g.addColorStop(0, withAlpha(pal.star, 0)); g.addColorStop(1, withAlpha(pal.star, 1 - q * 0.6));
        ctx.strokeStyle = g; ctx.lineWidth = H * 0.006; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - W * 0.08, y - H * 0.06); ctx.lineTo(x, y); ctx.stroke();
        circle(ctx, x, y, H * 0.008, pal.star);
      }
    }
    // moon
    const mx = W * 0.74, my = H * 0.3 + Math.sin(TAU * phase) * H * 0.012, mr = H * 0.15;
    circle(ctx, mx, my, mr * 1.5, withAlpha(pal.moon, 0.08));
    circle(ctx, mx, my, mr, pal.moon);
    face(ctx, { x: mx, y: my, size: mr * 1.8, blink: 1, mouth: 0.05, cheeks: true, ink: '#6b5a2e' });
    // Zs
    for (let i = 0; i < 3; i++) {
      const p = (phase * 3 + i / 3) % 1;
      label(ctx, 'z', mx + mr * 0.9 + p * mr * 0.8 + i * 6, my - mr * 0.6 - p * mr * 1.4, { size: mr * (0.28 + 0.12 * i), fill: pal.star, stroke: null, alpha: Math.sin(p * Math.PI) * 0.9 });
    }
    // clouds (front)
    for (let i = 0; i < 3; i++) {
      const cw = W * 0.24;
      const cx = ((W * (0.05 + i * 0.4) + phase * W) % (W + cw * 2)) - cw;
      cloud(ctx, cx, H * (0.58 + 0.12 * (i % 2)), cw, withAlpha(pal.cloud, 0.9));
    }
    // ground + fence
    ctx.fillStyle = '#152650';
    ctx.beginPath(); ctx.ellipse(W * 0.5, H * 1.05, W * 0.8, H * 0.3, 0, 0, TAU); ctx.fill();
    const fy = H * 0.82, fx = W * 0.5;
    ctx.fillStyle = '#3a4d80';
    for (const dx of [-W * 0.035, 0, W * 0.035]) ctx.fillRect(fx + dx - W * 0.006, fy - H * 0.09, W * 0.012, H * 0.09);
    ctx.fillRect(fx - W * 0.05, fy - H * 0.075, W * 0.1, H * 0.014);
    ctx.fillRect(fx - W * 0.05, fy - H * 0.035, W * 0.1, H * 0.014);
    // sheep: one crossing per loop, hop over the fence in the middle
    const p = phase;
    const sx = -W * 0.1 + p * W * 1.2;
    const hopW = 0.12;
    const hq = Math.abs(sx - fx) / (W * hopW);
    const hop = hq < 1 ? smoothstep(1 - hq) : 0;
    const sy = fy - H * 0.03 - hop * H * 0.16 + Math.abs(Math.sin(p * TAU * 12)) * H * 0.006 * (1 - hop);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(-1, 1);
    emoji(ctx, '🐑', 0, 0, H * 0.13);
    ctx.restore();
    void t;
  },
};
