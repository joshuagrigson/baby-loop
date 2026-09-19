// High Contrast — for 0–3 month olds. Black, white, one red. Slow. Six patterns
// shown in sequence with soft cross-fades; every motion is periodic in the loop.
import { TAU, smoothstep, blink } from '../easing.mjs';
import { circle, face, star, heart } from '../draw.mjs';

const BLACK = '#000000', WHITE = '#ffffff', RED = '#e10600';

const patterns = [
  // 1. slow spiral
  (ctx, u, { W, H }) => {
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(u * TAU);
    const arms = 4;
    ctx.fillStyle = BLACK;
    for (let a = 0; a < arms; a++) {
      ctx.beginPath();
      for (let r = 0; r < H * 0.9; r += 6) {
        const ang = (a / arms) * TAU + r / (H * 0.18);
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      for (let r = H * 0.9; r > 0; r -= 6) {
        const ang = (a / arms) * TAU + r / (H * 0.18) + Math.PI / arms;
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    circle(ctx, W / 2, H / 2, H * 0.06, RED);
  },
  // 2. expanding rings
  (ctx, u, { W, H }) => {
    ctx.fillStyle = BLACK; ctx.fillRect(0, 0, W, H);
    const gap = H * 0.11;
    for (let i = 12; i >= 0; i--) {
      const r = ((i + u) * gap);
      circle(ctx, W / 2, H / 2, r, i % 2 === 0 ? WHITE : BLACK);
    }
    circle(ctx, W / 2, H / 2, gap * 0.4 * (1 + 0.15 * Math.sin(u * TAU)), RED);
  },
  // 3. breathing checkerboard that inverts twice per pattern
  (ctx, u, { W, H }) => {
    const n = 6;
    const cell = (H * (1.0 + 0.12 * Math.sin(u * TAU))) / n;
    const invert = Math.floor(u * 2) % 2 === 1;
    ctx.fillStyle = invert ? BLACK : WHITE; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = invert ? WHITE : BLACK;
    const ox = W / 2 - (Math.ceil(W / cell / 2) * cell), oy = H / 2 - (Math.ceil(H / cell / 2) * cell);
    for (let y = oy, j = 0; y < H + cell; y += cell, j++) {
      for (let x = ox, i = 0; x < W + cell; x += cell, i++) {
        if ((i + j) % 2 === 0) ctx.fillRect(x, y, cell + 0.5, cell + 0.5);
      }
    }
  },
  // 4. bullseye with an orbiting red dot
  (ctx, u, { W, H }) => {
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);
    for (let i = 6; i >= 1; i--) circle(ctx, W / 2, H / 2, H * 0.075 * i, i % 2 === 0 ? WHITE : BLACK);
    const a = u * TAU * 2;
    circle(ctx, W / 2 + Math.cos(a) * H * 0.38, H / 2 + Math.sin(a) * H * 0.38, H * 0.05, RED);
  },
  // 5. sweeping diagonal stripes
  (ctx, u, { W, H }) => {
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 5);
    const sw = H * 0.16;
    const shift = u * sw * 2;
    ctx.fillStyle = BLACK;
    for (let x = -W * 1.2; x < W * 1.2; x += sw * 2) ctx.fillRect(x + shift, -H, sw, H * 2);
    ctx.restore();
    star(ctx, W / 2, H / 2, H * 0.14, H * 0.06, 5, RED, BLACK, H * 0.012);
  },
  // 6. big simple face — newborns fixate on faces
  (ctx, u, { W, H, t, loopSeconds }) => {
    ctx.fillStyle = BLACK; ctx.fillRect(0, 0, W, H);
    const s = H * 0.7;
    circle(ctx, W / 2, H / 2, s * 0.55, WHITE, BLACK, 0);
    const bl = blink(t, loopSeconds, 2.6, 0);
    face(ctx, { x: W / 2, y: H / 2, size: s, blink: bl, mouth: 0.2 + 0.35 * (0.5 + 0.5 * Math.sin(u * TAU * 2)), cheeks: false, ink: BLACK, eyeScale: 1.15 });
    heart(ctx, W / 2, H / 2 + s * 0.5, s * 0.16, RED);
  },
];

export default {
  id: 'high-contrast',
  name: 'High Contrast (newborn)',
  ageBand: '0–3 months',
  kind: 'loop',
  defaults: { bpm: 72, music: 'lullaby', palette: 'newborn' },

  init({ loopSeconds, options = {} }) {
    const order = options.patterns || [0, 1, 2, 3, 4, 5];
    return { order, per: loopSeconds / order.length, fade: 0.8 };
  },

  draw(ctx, t, s, info) {
    const { W, H } = info;
    const n = s.order.length;
    const idx = Math.min(n - 1, Math.floor(t / s.per));
    const local = t - idx * s.per;
    const u = local / s.per;
    const draw = (k, uu) => patterns[s.order[k % n] % patterns.length](ctx, uu, info);
    draw(idx, u);
    // cross-fade into the next pattern for the last `fade` seconds
    const remain = s.per - local;
    if (remain < s.fade) {
      const a = smoothstep(1 - remain / s.fade);
      ctx.save();
      ctx.globalAlpha = a;
      draw(idx + 1, 0);
      ctx.restore();
    }
    void W; void H;
  },
};
