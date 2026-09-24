// Reference critters — copy this shape for new ones.
import { drawCritter, TAU } from './core.mjs';

export const sheep = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob, sh, fillStroke } = k;
  // legs
  for (const lx of [-0.2, -0.07, 0.08, 0.21]) { ctx.beginPath(); ctx.roundRect(lx * s - s * 0.035, s * 0.2, s * 0.07, s * 0.28, s * 0.03); fillStroke('#3b3342'); }
  // fluffy wool: ring of lit puffs + centre
  const puffs = 11;
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * TAU;
    blob(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.2 + s * 0.02, s * 0.13, s * 0.13, '#fbf7f0');
  }
  ctx.beginPath(); ctx.ellipse(0, s * 0.02, s * 0.33, s * 0.23, 0, 0, TAU); ctx.fillStyle = sh('#fbf7f0', s * 0.35); ctx.fill();
  // head (in front, slightly right)
  ctx.save(); ctx.translate(s * 0.26, -s * 0.12);
  for (const ex of [-1, 1]) blob(ex * s * 0.2, -s * 0.02, s * 0.1, s * 0.05, '#4a4052', ex * 0.4);
  blob(0, 0, s * 0.19, s * 0.2, '#4a4052');
  for (let i = 0; i < 4; i++) blob((i - 1.5) * s * 0.07, -s * 0.19, s * 0.06, s * 0.06, '#fbf7f0');
  ctx.restore();
  return { x: s * 0.26, y: -s * 0.09, size: s * 0.42, ink: '#1b1b1b', brows: false, cheeks: true, hatSize: s * 0.5 };
});

export const bunny = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob, light } = k;
  const fur = o.color || '#f4efe9';
  blob(-s * 0.3, s * 0.3, s * 0.1, s * 0.1, '#ffffff');                 // tail
  blob(0, s * 0.18, s * 0.3, s * 0.28, fur);                            // body
  blob(0, s * 0.24, s * 0.18, s * 0.18, light(fur, 0.6));               // belly
  for (const ex of [-1, 1]) {                                           // ears
    blob(ex * s * 0.1, -s * 0.52, s * 0.07, s * 0.22, fur, ex * 0.18);
    ctx.beginPath(); ctx.ellipse(ex * s * 0.1, -s * 0.5, s * 0.035, s * 0.15, ex * 0.18, 0, TAU); ctx.fillStyle = '#ffb3c6'; ctx.fill();
  }
  blob(0, -s * 0.16, s * 0.24, s * 0.21, fur);                          // head
  for (const fx of [-1, 1]) blob(fx * s * 0.12, s * 0.44, s * 0.09, s * 0.05, fur); // feet
  return { y: -s * 0.15, size: s * 0.52, hatSize: s * 0.5 };
});
