// High Contrast — for 0–3 month olds. Black, white, one red. Slow. Six patterns
// shown in sequence with crisp iris wipes; every motion is periodic in the loop.
import { TAU, smoothstep, blink } from '../easing.mjs';
import { circle, star, heart } from '../draw.mjs';

const BLACK = '#000000', WHITE = '#ffffff', RED = '#e10600';

// radius that covers the whole frame from its centre, whatever the aspect
const reach = (W, H) => Math.hypot(W, H) / 2 + 4;

// Simple, strictly black / white / red newborn face (no greys, no pinks).
function hcFace(ctx, x, y, s, bl, mouth) {
  circle(ctx, x, y, s * 0.55, WHITE);
  for (const sx of [-1, 1]) {
    const ex = x + sx * s * 0.2, ey = y - s * 0.08;
    if (bl < 0.6) {
      ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.085, s * 0.1 * (1 - bl), 0, 0, TAU); ctx.fillStyle = BLACK; ctx.fill();
      circle(ctx, ex - s * 0.028, ey - s * 0.035 * (1 - bl), s * 0.03 * (1 - bl), WHITE);
    } else {
      ctx.beginPath(); ctx.arc(ex, ey - s * 0.03, s * 0.08, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.strokeStyle = BLACK; ctx.lineWidth = s * 0.035; ctx.lineCap = 'round'; ctx.stroke();
    }
    // brows
    ctx.beginPath(); ctx.arc(ex, ey - s * 0.02, s * 0.15, 1.25 * Math.PI, 1.75 * Math.PI);
    ctx.strokeStyle = BLACK; ctx.lineWidth = s * 0.03; ctx.lineCap = 'round'; ctx.stroke();
  }
  // big smile: black D with a red tongue
  const my = y + s * 0.14, mw = s * 0.2, mh = s * (0.08 + 0.12 * mouth);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x - mw, my);
  ctx.quadraticCurveTo(x, my + mh * 0.2, x + mw, my);
  ctx.quadraticCurveTo(x + mw * 0.9, my + mh * 1.9, x, my + mh * 1.9);
  ctx.quadraticCurveTo(x - mw * 0.9, my + mh * 1.9, x - mw, my);
  ctx.closePath();
  ctx.fillStyle = BLACK; ctx.fill();
  ctx.clip();
  ctx.beginPath(); ctx.ellipse(x, my + mh * 1.95, mw * 0.6, mh * 0.75, 0, 0, TAU); ctx.fillStyle = RED; ctx.fill();
  ctx.restore();
}

// One arm edge of an Archimedean spiral, sampled finely enough (≈2 px chords)
// that it stays a smooth curve all the way out to the frame corners.
function spiralEdge(ctx, R, k, a0, forward) {
  const pts = [];
  let r = 0;
  while (r < R) { pts.push(r); r += Math.max(0.35, Math.min(6, 2 / Math.sqrt(1 + (r / k) ** 2))); }
  pts.push(R);
  const seq = forward ? pts : pts.slice().reverse();
  for (const rr of seq) {
    const ang = a0 + rr / k;
    ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
  }
}

const patterns = [
  // 1. slow spiral (quarter turn per pattern: 4 arms → exactly periodic)
  (ctx, u, { W, H }) => {
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);
    const R = reach(W, H), k = H * 0.18, arms = 4;
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(u * TAU / arms);
    ctx.beginPath();
    for (let a = 0; a < arms; a++) {
      const a0 = (a / arms) * TAU;
      ctx.moveTo(0, 0);
      spiralEdge(ctx, R, k, a0, true);
      // close along the outer circle (outside the frame) to the other edge
      const endA = a0 + R / k;
      ctx.arc(0, 0, R, endA, endA + Math.PI / arms, false);
      spiralEdge(ctx, R, k, a0 + Math.PI / arms, false);
      ctx.closePath();
    }
    ctx.fillStyle = BLACK;
    ctx.fill();
    ctx.restore();
    circle(ctx, W / 2, H / 2, H * 0.065, RED);
  },
  // 2. expanding rings
  (ctx, u, { W, H }) => {
    ctx.fillStyle = BLACK; ctx.fillRect(0, 0, W, H);
    const gap = H * 0.11, R = reach(W, H);
    const nRings = Math.ceil(R / gap) + 2;
    for (let i = nRings; i >= 0; i--) {
      const r = (i + u) * gap;
      circle(ctx, W / 2, H / 2, r, i % 2 === 0 ? WHITE : BLACK);
    }
    circle(ctx, W / 2, H / 2, gap * 0.4 * (1 + 0.15 * Math.sin(u * TAU)), RED);
  },
  // 3. breathing checkerboard that glides one cell diagonally (no hard flash)
  (ctx, u, { W, H }) => {
    const n = 6;
    const cell = (H * (1.0 + 0.12 * Math.sin(u * TAU))) / n;
    const slide = smoothstep(u) * cell;            // one cell over the pattern
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = BLACK;
    const cols = Math.ceil(W / cell / 2) + 2, rows = Math.ceil(H / cell / 2) + 2;
    ctx.beginPath();
    for (let j = -rows; j <= rows; j++) {
      for (let i = -cols; i <= cols; i++) {
        if (((i + j) % 2 + 2) % 2 === 0) ctx.rect(W / 2 + i * cell + slide, H / 2 + j * cell + slide, cell, cell);
      }
    }
    ctx.fill();
  },
  // 4. bullseye with an orbiting red dot
  (ctx, u, { W, H }) => {
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);
    for (let i = 6; i >= 1; i--) circle(ctx, W / 2, H / 2, H * 0.075 * i, i % 2 === 0 ? WHITE : BLACK);
    const a = u * TAU * 2;
    const ox = W / 2 + Math.cos(a) * H * 0.38, oy = H / 2 + Math.sin(a) * H * 0.38;
    circle(ctx, ox, oy, H * 0.062, BLACK);
    circle(ctx, ox, oy, H * 0.05, RED);
  },
  // 5. sweeping diagonal stripes
  (ctx, u, { W, H }) => {
    ctx.fillStyle = WHITE; ctx.fillRect(0, 0, W, H);
    const R = reach(W, H);
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-Math.PI / 5);
    const sw = H * 0.16;
    const shift = u * sw * 2;
    ctx.fillStyle = BLACK;
    ctx.beginPath();
    const start = -Math.ceil(R / (sw * 2) + 1) * sw * 2;
    for (let x = start; x < R + sw * 2; x += sw * 2) ctx.rect(x + shift, -R, sw, R * 2);
    ctx.fill();
    ctx.restore();
    circle(ctx, W / 2, H / 2, H * 0.19, WHITE);
    circle(ctx, W / 2, H / 2, H * 0.19, null, BLACK, H * 0.012);
    star(ctx, W / 2, H / 2 + H * 0.01, H * 0.14, H * 0.06, 5, RED, BLACK, H * 0.012);
  },
  // 6. big simple face — newborns fixate on faces
  (ctx, u, { W, H, t, loopSeconds }) => {
    ctx.fillStyle = BLACK; ctx.fillRect(0, 0, W, H);
    const s = H * 0.7;
    const bl = blink(t, loopSeconds, 2.6, 0);
    hcFace(ctx, W / 2, H / 2, s, bl, 0.5 + 0.5 * Math.sin(u * TAU * 2));
    heart(ctx, W / 2, H / 2 + s * 0.5, s * 0.16, RED, WHITE, H * 0.008);
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
    // iris wipe into the next pattern for the last `fade` seconds: a crisp
    // growing circle, so the frame never leaves black / white / red (no greys)
    const remain = s.per - local;
    if (remain < s.fade) {
      const a = smoothstep(1 - remain / s.fade);
      ctx.save();
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, Math.max(0.01, a * (Math.hypot(W, H) / 2 + 4)), 0, TAU);
      ctx.clip();
      draw(idx + 1, 0);
      ctx.restore();
    }
    void W; void H;
  },
};
