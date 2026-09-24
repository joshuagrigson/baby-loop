// night critters — see core.mjs for the style rules and farm.mjs for reference.
import { drawCritter, TAU, withAlpha, face, accessory } from './core.mjs';
// The owl draws its own face (so the beak sits on top) and returns null, so core
// can't place its hat; this wrapper puts it on the head (x, top, size are ×size).
const withHat = (hx, top, hs, draw) => (ctx, x, y, size, o = {}) => {
  drawCritter(ctx, x, y, size, { ...o, hat: null }, draw);
  if (!o.hat || o.hat === 'none') return;
  const s = size, { squash = 0, tilt = 0, flip = false } = o;
  ctx.save(); ctx.translate(x, y + s * 0.5); ctx.rotate(tilt); ctx.scale((flip ? -1 : 1) * (1 + 0.16 * squash), 1 - 0.16 * squash);
  ctx.translate(hx * s, -s * 0.5 + (top + hs / 2) * s); accessory(ctx, o.hat, hs * s, o.outline || '#1b1b1b'); ctx.restore();
};


export const owl = withHat(0, -0.42, 0.62, (k) => {
  const { ctx, o, s, blob, sh, fillStroke, light } = k;
  const col = o.color || '#9a6a4c', cream = '#f6e3c4';
  for (const ex of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex * s * 0.32, -s * 0.3); ctx.lineTo(ex * s * 0.38, -s * 0.6); ctx.lineTo(ex * s * 0.12, -s * 0.4); fillStroke(sh(col, s * 0.2, ex * s * 0.3, -s * 0.44)); }
  blob(0, s * 0.03, s * 0.42, s * 0.46, col);
  blob(0, s * 0.24, s * 0.23, s * 0.22, light(col, 0.55), 0, k.lw * 0.6);
  ctx.strokeStyle = withAlpha(col, 0.7); ctx.lineWidth = s * 0.018;
  for (const [vx, vy] of [[-0.09, 0.17], [0.09, 0.17], [0, 0.26], [-0.1, 0.33], [0.1, 0.33]]) { ctx.beginPath(); ctx.moveTo(vx * s - s * 0.04, vy * s); ctx.quadraticCurveTo(vx * s, vy * s + s * 0.04, vx * s + s * 0.04, vy * s); ctx.stroke(); }
  for (const ex of [-1, 1]) blob(ex * s * 0.38, s * 0.14, s * 0.1, s * 0.24, k.dark(col, 0.12), ex * -0.25);
  for (const fx of [-1, 1]) blob(fx * s * 0.1, s * 0.48, s * 0.075, s * 0.04, '#ffb347', 0, k.lw * 0.7);
  for (const ex of [-1, 1]) blob(ex * s * 0.165, -s * 0.13, s * 0.2, s * 0.19, cream, 0, k.lw * 0.7);
  face(ctx, { x: 0, y: -s * 0.07, size: s * 0.74, blink: o.blink || 0, mouth: (o.mouth ?? 0.5) * 0.4, look: o.look || [0, 0], brows: false, mouthY: 0.3, eyeY: -0.08 });
  ctx.beginPath(); ctx.moveTo(-s * 0.055, -s * 0.05); ctx.quadraticCurveTo(0, -s * 0.085, s * 0.055, -s * 0.05); ctx.lineTo(0, s * 0.06); ctx.closePath();
  fillStroke(sh('#ffb347', s * 0.06, 0, -s * 0.03), k.lw * 0.7);
  return null;
});

export const hedgehog = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { ctx, s, blob, sh, fillStroke, light, o } = k;
  const spine = o.color || '#8b5e3c', cream = '#f7dfbd';
  for (const [scale, c] of [[1, spine], [0.8, light(spine, 0.25)]]) {
    ctx.beginPath();
    const n = 26;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * (0.78 + (1.38 * i) / n), r = i % 2 ? 1.24 : 1;
      ctx.lineTo(-s * 0.1 + Math.cos(a) * s * 0.36 * r * scale, s * 0.1 + Math.sin(a) * s * 0.32 * r * scale);
    }
    ctx.quadraticCurveTo(0, s * 0.5, -s * 0.38 * scale, s * 0.32);
    ctx.closePath(); if (scale === 1) fillStroke(sh(c, s * 0.45, -s * 0.1, s * 0.1)); else { ctx.fillStyle = withAlpha(c, 0.55); ctx.fill(); }
  }
  for (const fx of [-0.2, 0.18]) blob(fx * s, s * 0.46, s * 0.08, s * 0.05, '#6d4b37');
  blob(-s * 0.06, -s * 0.16, s * 0.07, s * 0.07, cream);
  blob(s * 0.14, s * 0.1, s * 0.33, s * 0.33, cream);
  blob(s * 0.42, s * 0.2, s * 0.12, s * 0.085, cream, -0.2);
  blob(s * 0.53, s * 0.17, s * 0.045, s * 0.04, '#2d2433', 0, k.lw * 0.6);
  return { x: s * 0.13, y: s * 0.05, size: s * 0.6, brows: false, mouthY: 0.28, eyeScale: 1.05, hat: [s * 0.14, s * -0.24, s * 0.56] };
});

export const firefly = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { ctx, o, s, blob } = k;
  const glow = o.glow ?? 1, op = o.flap !== undefined ? 0.5 + 0.5 * Math.cos(TAU * o.flap) : 0.7;
  const gx = -s * 0.28, gy = s * 0.2;
  const halo = ctx.createRadialGradient(gx, gy, 0, gx, gy, s * 0.62);
  halo.addColorStop(0, withAlpha('#fff6a0', 0.75 * glow)); halo.addColorStop(0.4, withAlpha('#d8ff6a', 0.3 * glow)); halo.addColorStop(1, withAlpha('#d8ff6a', 0));
  ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(gx, gy, s * 0.62, 0, TAU); ctx.fill();
  for (const [bx, rot] of [[-0.18, -2.2], [-0.06, -1.5]]) {
    ctx.save(); ctx.translate(bx * s, -s * 0.1); ctx.rotate(rot - 0.5 * op);
    ctx.beginPath(); ctx.ellipse(s * 0.19, 0, s * 0.19, s * 0.085, 0, 0, TAU); ctx.fillStyle = withAlpha('#e8f4ff', 0.7); ctx.fill(); k.stroke(k.lw * 0.7);
    ctx.restore();
  }
  blob(gx, gy, s * 0.2, s * 0.19, glow > 0.5 ? '#fff27a' : '#e6d86a');
  ctx.fillStyle = withAlpha('#ffffff', 0.7 * glow); ctx.beginPath(); ctx.ellipse(gx - s * 0.04, gy - s * 0.07, s * 0.08, s * 0.05, -0.4, 0, TAU); ctx.fill();
  blob(-s * 0.1, s * 0.1, s * 0.15, s * 0.14, '#4a4f8c');
  for (const [ax, bx] of [[0.02, -0.06], [0.26, 0.38]]) { ctx.beginPath(); ctx.moveTo(ax * s, -s * 0.3); ctx.quadraticCurveTo(bx * s, -s * 0.46, bx * s + s * 0.04, -s * 0.54); k.stroke(s * 0.028); blob(bx * s + s * 0.04, -s * 0.54, s * 0.045, s * 0.045, '#fff27a', 0, k.lw * 0.7); }
  blob(s * 0.14, -s * 0.02, s * 0.31, s * 0.3, '#6b74d6');
  return { x: s * 0.15, y: -s * 0.02, size: s * 0.64, eyeScale: 1.05, brows: false, hat: [s * 0.14, s * -0.33, s * 0.54] };
});

export const mouse = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { ctx, o, s, blob, stroke, light } = k;
  const fur = o.color || '#bdb6cc';
  ctx.beginPath(); ctx.moveTo(-s * 0.2, s * 0.4); ctx.bezierCurveTo(-s * 0.56, s * 0.44, -s * 0.52, s * 0.08, -s * 0.38, s * 0.1); stroke(s * 0.06); ctx.strokeStyle = '#ffb3c6'; ctx.lineWidth = s * 0.028; ctx.stroke();
  blob(0, s * 0.28, s * 0.27, s * 0.22, fur);
  blob(0, s * 0.32, s * 0.15, s * 0.14, light(fur, 0.6), 0, k.lw * 0.6);
  for (const fx of [-1, 1]) blob(fx * s * 0.12, s * 0.47, s * 0.08, s * 0.045, '#ffb3c6');
  for (const ex of [-1, 1]) { blob(ex * s * 0.3, -s * 0.34, s * 0.18, s * 0.17, fur); blob(ex * s * 0.3, -s * 0.33, s * 0.12, s * 0.11, '#ffb3c6', 0, k.lw * 0.5); }
  blob(0, -s * 0.1, s * 0.35, s * 0.3, fur);
  ctx.strokeStyle = withAlpha('#4a4052', 0.6); ctx.lineWidth = s * 0.012;
  for (const sx of [-1, 1]) for (const dy of [-0.02, 0.02]) { ctx.beginPath(); ctx.moveTo(sx * s * 0.2, s * 0.0 + dy * s); ctx.lineTo(sx * s * 0.44, -s * 0.01 + dy * s * 2.5); ctx.stroke(); }
  blob(0, -s * 0.03, s * 0.045, s * 0.035, '#ff7fa3', 0, k.lw * 0.6);
  return { y: -s * 0.1, size: s * 0.66, mouthY: 0.24, eyeScale: 1.05, hat: [s * 0, s * -0.4, s * 0.58] };
});

export const raccoon = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { ctx, o, s, blob, sh, fillStroke, light } = k;
  const fur = o.color || '#9a97aa', mask = '#3e3a4c';
  ctx.save(); ctx.translate(-s * 0.26, s * 0.2); ctx.rotate(-0.8);
  ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.11, s * 0.26, 0, 0, TAU); ctx.fillStyle = sh(fur, s * 0.26, 0, -s * 0.12); ctx.fill();
  ctx.save(); ctx.clip(); ctx.fillStyle = mask; for (const by of [-0.3, -0.16, -0.02]) ctx.fillRect(-s * 0.2, by * s, s * 0.4, s * 0.06); ctx.restore();
  ctx.beginPath(); ctx.ellipse(0, -s * 0.12, s * 0.11, s * 0.26, 0, 0, TAU); k.stroke(); ctx.restore();
  blob(0, s * 0.29, s * 0.26, s * 0.21, fur);
  blob(0, s * 0.33, s * 0.14, s * 0.13, light(fur, 0.6), 0, k.lw * 0.6);
  for (const fx of [-1, 1]) blob(fx * s * 0.13, s * 0.47, s * 0.08, s * 0.045, mask);
  for (const ex of [-1, 1]) { ctx.beginPath(); ctx.moveTo(ex * s * 0.14, -s * 0.3); ctx.quadraticCurveTo(ex * s * 0.3, -s * 0.56, ex * s * 0.38, -s * 0.22); fillStroke(sh(fur, s * 0.15, ex * s * 0.26, -s * 0.38)); }
  blob(0, -s * 0.1, s * 0.4, s * 0.31, fur);
  ctx.beginPath(); ctx.ellipse(-s * 0.15, -s * 0.15, s * 0.18, s * 0.115, 0.25, 0, TAU); ctx.ellipse(s * 0.15, -s * 0.15, s * 0.18, s * 0.115, -0.25, 0, TAU); ctx.fillStyle = mask; ctx.fill();
  blob(0, s * 0.03, s * 0.17, s * 0.12, '#f3eff7', 0, k.lw * 0.6);
  blob(0, -s * 0.04, s * 0.045, s * 0.035, '#2d2433', 0, k.lw * 0.5);
  return { y: -s * 0.1, size: s * 0.66, mouthY: 0.25, brows: false, eyeScale: 1.05, hat: [s * 0, s * -0.42, s * 0.6] };
});
