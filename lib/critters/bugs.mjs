// bugs critters — see core.mjs for the style rules and farm.mjs for reference.
// Winged bugs take o.flap (0..1, one wing beat per unit; pass phase·k for a
// seamless loop) or fall back to o.wave (-1..1) as a static wing pose.
import { drawCritter, TAU, withAlpha, mixHex, accessory } from './core.mjs';
// core.mjs puts hats at the body origin; these heads are off-centre, so the hat
// is placed on the head here instead (hx = head centre x, top = head top y, hs = hat size, all ×size).
const withHat = (hx, top, hs, draw) => (ctx, x, y, size, o = {}) => {
  drawCritter(ctx, x, y, size, { ...o, hat: null }, draw);
  if (!o.hat || o.hat === 'none') return;
  const s = size, { squash = 0, tilt = 0, flip = false } = o;
  ctx.save(); ctx.translate(x, y + s * 0.5); ctx.rotate(tilt); ctx.scale((flip ? -1 : 1) * (1 + 0.16 * squash), 1 - 0.16 * squash);
  ctx.translate(hx * s, -s * 0.5 + (top + hs / 2) * s); accessory(ctx, o.hat, hs * s, o.outline || '#1b1b1b'); ctx.restore();
};


const wingOpen = (o) => (o.flap !== undefined ? 0.5 + 0.5 * Math.cos(TAU * o.flap) : 0.5 + 0.5 * (o.wave ?? 0.4));

// Translucent glassy wing anchored at (x, y), pointing along `rot`.
function wing(k, x, y, len, wid, rot, tint = '#cdeeff') {
  const { ctx } = k;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.ellipse(len * 0.5, 0, len * 0.5, wid, 0, 0, TAU);
  const g = ctx.createLinearGradient(0, -wid, len, wid);
  g.addColorStop(0, withAlpha('#ffffff', 0.9)); g.addColorStop(1, withAlpha(tint, 0.55));
  ctx.fillStyle = g; ctx.fill(); k.stroke(k.lw * 0.7);
  ctx.beginPath(); ctx.ellipse(len * 0.45, -wid * 0.35, len * 0.28, wid * 0.22, -0.1, 0, TAU);
  ctx.fillStyle = withAlpha('#ffffff', 0.75); ctx.fill();
  ctx.restore();
}
// Fuzzy (scalloped) ellipse path.
function fuzzy(ctx, cx, cy, rx, ry, bumps = 26, amp = 0.035) {
  ctx.beginPath();
  for (let i = 0, n = bumps * 6; i <= n; i++) {
    const a = (i / n) * TAU, r = 1 + amp * Math.abs(Math.sin((a * bumps) / 2));
    ctx.lineTo(cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r);
  }
  ctx.closePath();
}
function antenna(k, x0, y0, x1, y1, bend, ball = '#2d2838') {
  const { ctx, s } = k;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(x0 + bend, (y0 + y1) / 2, x1, y1); k.stroke(s * 0.028);
  k.blob(x1, y1, s * 0.045, s * 0.045, ball, 0, k.lw * 0.8);
}

export const bee = withHat(0.12, -0.38, 0.56, (k) => {
  const { ctx, o, s, sh, stroke } = k;
  const op = wingOpen(o);
  wing(k, -s * 0.12, -s * 0.28, s * 0.4, s * 0.15, -2.0 - 0.5 * op);
  ctx.beginPath(); ctx.moveTo(-s * 0.44, s * 0.04); ctx.lineTo(-s * 0.6, s * 0.1); ctx.lineTo(-s * 0.44, s * 0.18); k.fillStroke('#3a2a1e');
  fuzzy(ctx, 0, s * 0.06, s * 0.47, s * 0.42);
  ctx.fillStyle = sh('#ffcf2e', s * 0.47, 0, s * 0.06); ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = '#3a2a1e'; ctx.lineWidth = s * 0.095;
  for (const bx of [-0.21, -0.4]) { ctx.beginPath(); ctx.moveTo(bx * s + s * 0.05, -s * 0.45); ctx.quadraticCurveTo(bx * s - s * 0.07, s * 0.06, bx * s + s * 0.05, s * 0.55); ctx.stroke(); }
  ctx.fillStyle = withAlpha('#ffffff', 0.3); ctx.beginPath(); ctx.ellipse(-s * 0.12, -s * 0.2, s * 0.24, s * 0.1, -0.3, 0, TAU); ctx.fill();
  ctx.restore();
  fuzzy(ctx, 0, s * 0.06, s * 0.47, s * 0.42); stroke();
  antenna(k, s * 0.04, -s * 0.35, -s * 0.04, -s * 0.6, -s * 0.08);
  antenna(k, s * 0.26, -s * 0.31, s * 0.38, -s * 0.56, s * 0.02);
  wing(k, -s * 0.04, -s * 0.32, s * 0.38, s * 0.14, -1.45 - 0.6 * op);
  return { x: s * 0.13, y: s * 0.04, size: s * 0.7, eyeScale: 1.1, brows: false };
});

export const butterfly = withHat(0, -0.44, 0.5, (k) => {
  const { ctx, o, s, sh, fillStroke, light, dark } = k;
  const col = o.color || '#ff7eb6', acc = o.color2 || mixHex(col, '#ffd166', 0.65);
  const op = wingOpen(o);
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.scale(sx * (0.28 + 0.72 * op), 1);
    const up = () => { ctx.beginPath(); ctx.moveTo(0, -s * 0.02); ctx.bezierCurveTo(s * 0.12, -s * 0.56, s * 0.68, -s * 0.66, s * 0.62, -s * 0.22); ctx.bezierCurveTo(s * 0.58, -s * 0.0, s * 0.32, s * 0.08, 0, s * 0.08); };
    const lo = () => { ctx.beginPath(); ctx.moveTo(0, s * 0.06); ctx.bezierCurveTo(s * 0.34, s * 0.04, s * 0.56, s * 0.26, s * 0.4, s * 0.44); ctx.bezierCurveTo(s * 0.28, s * 0.56, s * 0.06, s * 0.44, 0, s * 0.24); };
    for (const [path, cx, cy, r] of [[lo, 0.29, 0.3, 0.26], [up, 0.36, -0.24, 0.38]]) {
      path(); ctx.fillStyle = sh(col, r * s, cx * s, cy * s); ctx.fill();
      ctx.save(); ctx.clip();
      ctx.lineWidth = s * 0.08; ctx.strokeStyle = dark(col, 0.35); ctx.stroke();
      k.blob(cx * s, cy * s, r * s * 0.42, r * s * 0.36, acc, 0, k.lw * 0.6);
      k.blob(cx * s + r * s * 0.06, cy * s, r * s * 0.16, r * s * 0.16, '#ffffff', 0, k.lw * 0.5);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(cx * s + r * s * (0.68 - i * 0.15), cy * s + r * s * (i * 0.35 - 0.45), s * 0.028, 0, TAU); ctx.fillStyle = light(col, 0.8); ctx.fill(); }
      ctx.restore();
      path(); k.stroke();
    }
    ctx.restore();
  }
  ctx.beginPath(); ctx.roundRect(-s * 0.07, -s * 0.1, s * 0.14, s * 0.54, s * 0.07); fillStroke(sh('#7a5ad6', s * 0.2, 0, s * 0.1));
  for (const sx of [-1, 1]) antenna(k, sx * s * 0.1, -s * 0.38, sx * s * 0.24, -s * 0.64, sx * s * 0.16, '#7a5ad6');
  k.blob(0, -s * 0.16, s * 0.29, s * 0.27, '#8f70e6');
  return { y: -s * 0.15, size: s * 0.62, eyeScale: 1.05, brows: false };
});

export const ladybug = withHat(0.16, -0.23, 0.54, (k) => {
  const { ctx, o, s, blob, stroke } = k;
  const sx0 = -s * 0.14, sy0 = s * 0.06, rx = s * 0.4, ry = s * 0.38;
  for (const lx of [-0.36, -0.16, 0.12]) { ctx.beginPath(); ctx.moveTo(lx * s, s * 0.34); ctx.lineTo(lx * s - s * 0.05, s * 0.49); stroke(s * 0.045); }
  blob(sx0, sy0, rx, ry, o.color || '#ff3b3b');
  ctx.save(); ctx.beginPath(); ctx.ellipse(sx0, sy0, rx, ry, 0, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.moveTo(s * 0.02, -s * 0.34); ctx.quadraticCurveTo(-s * 0.14, s * 0.04, -s * 0.34, s * 0.46); stroke();
  for (const [px, py, r] of [[-0.42, -0.04, 0.075], [-0.24, -0.2, 0.06], [-0.4, 0.24, 0.07], [-0.2, 0.28, 0.055], [-0.06, -0.14, 0.05]]) { ctx.beginPath(); ctx.arc(px * s, py * s, r * s, 0, TAU); ctx.fillStyle = '#231c2a'; ctx.fill(); }
  ctx.fillStyle = withAlpha('#ffffff', 0.4); ctx.beginPath(); ctx.ellipse(-s * 0.3, -s * 0.18, s * 0.13, s * 0.055, -0.5, 0, TAU); ctx.fill();
  ctx.restore();
  antenna(k, s * 0.06, -s * 0.16, s * 0.0, -s * 0.46, -s * 0.06);
  antenna(k, s * 0.28, -s * 0.16, s * 0.4, -s * 0.44, s * 0.02);
  blob(s * 0.16, s * 0.1, s * 0.32, s * 0.3, '#3b3346');
  return { x: s * 0.17, y: s * 0.1, size: s * 0.66, eyeScale: 1.05, brows: false };
});

export const snail = withHat(0.24, -0.33, 0.52, (k) => {
  const { ctx, o, s, blob, sh, fillStroke, stroke, dark } = k;
  const body = '#b9e27a', shell = o.color || '#ff9f5a';
  ctx.beginPath(); ctx.roundRect(-s * 0.54, s * 0.3, s * 0.94, s * 0.18, s * 0.09); fillStroke(sh(body, s * 0.4, 0, s * 0.3));
  const cx = -s * 0.18, cy = -s * 0.02;
  blob(cx, cy, s * 0.34, s * 0.34, shell);
  ctx.beginPath();
  for (let i = 0; i <= 80; i++) { const th = (i / 80) * TAU * 2.3, r = s * 0.28 * (1 - th / (TAU * 2.55)); ctx.lineTo(cx + Math.cos(th + 2.2) * r, cy + Math.sin(th + 2.2) * r); }
  ctx.strokeStyle = dark(shell, 0.4); ctx.lineWidth = s * 0.035; ctx.lineCap = 'round'; ctx.stroke();
  ctx.fillStyle = withAlpha('#ffffff', 0.45); ctx.beginPath(); ctx.ellipse(cx - s * 0.13, cy - s * 0.19, s * 0.1, s * 0.05, -0.6, 0, TAU); ctx.fill();
  blob(s * 0.24, s * 0.22, s * 0.16, s * 0.2, body);
  for (const [ex, ey] of [[0.1, -0.54], [0.4, -0.52]]) { ctx.beginPath(); ctx.moveTo(s * 0.24, -s * 0.24); ctx.lineTo(ex * s, ey * s); stroke(s * 0.05); ctx.strokeStyle = body; ctx.lineWidth = s * 0.022; ctx.stroke(); blob(ex * s, ey * s, s * 0.045, s * 0.045, body); }
  blob(s * 0.24, -s * 0.05, s * 0.29, s * 0.28, body);
  return { x: s * 0.25, y: -s * 0.05, size: s * 0.6, eyeScale: 1.05, brows: false };
});

export const caterpillar = withHat(0.16, -0.36, 0.6, (k) => {
  const { ctx, o, s, blob, stroke, light } = k;
  const cols = [o.color || '#7ccf4a', '#b6e35a'];
  const crawl = o.crawl ?? 0;
  for (let i = 0; i < 3; i++) {
    const sx = (-0.44 + i * 0.15) * s, lift = Math.max(0, Math.sin(TAU * crawl - i * 1.2)) * s * 0.07;
    const sy = s * 0.28 - lift;
    ctx.beginPath(); ctx.ellipse(sx, s * 0.46, s * 0.045, s * 0.032, 0, 0, TAU); ctx.fillStyle = '#3b3346'; ctx.fill(); stroke(k.lw * 0.6);
    blob(sx, sy, s * 0.14, s * 0.15, cols[i % 2]);
    ctx.beginPath(); ctx.arc(sx - s * 0.04, sy - s * 0.06, s * 0.03, 0, TAU); ctx.fillStyle = withAlpha(light(cols[i % 2], 0.8), 0.9); ctx.fill();
  }
  antenna(k, s * 0.04, -s * 0.3, -s * 0.04, -s * 0.58, -s * 0.06, '#ff8fb1');
  antenna(k, s * 0.3, -s * 0.28, s * 0.4, -s * 0.54, s * 0.04, '#ff8fb1');
  blob(s * 0.16, s * 0.0, s * 0.34, s * 0.34, cols[0]);
  return { x: s * 0.17, y: s * 0.0, size: s * 0.72, eyeScale: 1.05, brows: false };
});

export const dragonfly = withHat(0.2, -0.3, 0.52, (k) => {
  const { ctx, o, s, blob } = k;
  const col = o.color || '#34c3c9', op = wingOpen(o), glass = mixHex(col, '#ffffff', 0.4);
  wing(k, -s * 0.1, -s * 0.02, s * 0.52, s * 0.09, -2.4 - 0.4 * op, glass);
  wing(k, -s * 0.04, -s * 0.02, s * 0.48, s * 0.09, -1.9 - 0.4 * op, glass);
  for (let i = 5; i >= 0; i--) blob(-s * (0.22 + i * 0.075), s * 0.1 + i * i * s * 0.003, s * 0.07 - i * s * 0.004, s * 0.058 - i * s * 0.003, i % 2 ? col : mixHex(col, '#1f4fd6', 0.35), 0, k.lw * 0.8);
  blob(-s * 0.08, s * 0.08, s * 0.16, s * 0.14, mixHex(col, '#1f4fd6', 0.3));
  wing(k, -s * 0.12, 0, s * 0.54, s * 0.095, -2.9 - 0.3 * op, glass);
  wing(k, -s * 0.02, 0, s * 0.5, s * 0.095, -1.3 - 0.5 * op, glass);
  blob(s * 0.2, 0, s * 0.3, s * 0.3, col);
  return { x: s * 0.21, y: 0, size: s * 0.62, eyeScale: 1.15, brows: false };
});
