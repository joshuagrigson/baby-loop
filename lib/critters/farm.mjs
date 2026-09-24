// Farm & friends — baby-proportioned animals: big round heads, small bodies,
// glossy happy faces, lighter muzzles / bellies / inner ears, lit from the top-left.
// Shared shapes live in the little helpers below; each animal just composes them.
import { drawCritter, face, TAU } from './core.mjs';

// --- shared shapes ------------------------------------------------------------
const HEAD_Y = -0.15;                                   // head centre (× s)
const FACE = (s, extra = {}) => ({ y: -s * 0.13, size: s * 0.5, eyeScale: 1.2, eyeSpacing: 0.235, hatSize: s * 0.8, ...extra });

// little arms that swing up with o.wave (-1 hanging … 1 raised), paw pads at the tips
function paws(k, fur, pad = k.light(fur, 0.5), y = 0.1, x = 0.15, len = 0.17) {
  const { ctx, s, o, sh, fillStroke } = k;
  const w = Math.max(-1, Math.min(1, o.wave || 0));
  for (const sx of [-1, 1]) {
    const th = 0.85 + 1.25 * w * (sx < 0 ? 1 : 0.85);
    ctx.save(); ctx.translate(sx * s * x, s * y); ctx.rotate(-sx * th);
    ctx.beginPath(); ctx.ellipse(0, s * len * 0.5, s * len * 0.3, s * len * 0.58, 0, 0, TAU);
    fillStroke(sh(fur, s * len * 0.6, 0, s * len * 0.4));
    ctx.beginPath(); ctx.ellipse(0, s * len * 0.82, s * len * 0.2, s * len * 0.17, 0, 0, TAU); ctx.fillStyle = pad; ctx.fill();
    ctx.restore();
  }
}
// small pear body + belly + feet + arms (everything below the head)
function body(k, fur, { belly = k.light(fur, 0.55), feet = fur, arm = fur, pad, w = 0.21 } = {}) {
  const { s, blob } = k;
  for (const fx of [-1, 1]) blob(fx * s * 0.11, s * 0.44, s * 0.095, s * 0.055, feet);
  blob(0, s * 0.25, s * w, s * 0.215, fur);
  if (belly) blob(0, s * 0.29, s * w * 0.62, s * 0.15, belly, 0, k.lw * 0.0001);
  paws(k, arm, pad);
}
const head = (k, fur, rx = 0.29, ry = 0.26, y = HEAD_Y) => k.blob(0, k.s * y, k.s * rx, k.s * ry, fur);
// round ears with a lighter inner disc
function roundEars(k, fur, inner, x = 0.2, y = -0.36, r = 0.09) {
  const { s, blob, ctx, sh } = k;
  for (const ex of [-1, 1]) {
    blob(ex * s * x, s * y, s * r, s * r, fur);
    ctx.beginPath(); ctx.arc(ex * s * x, s * (y + r * 0.1), s * r * 0.58, 0, TAU); ctx.fillStyle = sh(inner, s * r * 0.6, ex * s * x, s * y); ctx.fill();
  }
}
// pointy ears (cat / fox): outer triangle + inner, optional dark tips
function pointyEars(k, fur, inner, tip = null, x = 0.17, y = -0.33, h = 0.2, lean = 0.05) {
  const { s, ctx, sh, fillStroke } = k;
  for (const ex of [-1, 1]) {
    const tri = (sc) => { ctx.beginPath(); ctx.moveTo(ex * s * (x - 0.1 * sc), s * (y + 0.06)); ctx.lineTo(ex * s * (x + lean), s * (y - h * sc)); ctx.lineTo(ex * s * (x + 0.12 * sc), s * (y + 0.07)); ctx.closePath(); };
    tri(1); fillStroke(sh(fur, s * 0.14, ex * s * x, s * y));
    if (tip) { ctx.save(); tri(1); ctx.clip(); ctx.fillStyle = tip; ctx.fillRect(ex * s * x - s * 0.2, s * (y - h * 1.2), s * 0.4, s * h * 0.5); ctx.restore(); tri(1); k.stroke(); }
    ctx.save(); ctx.translate(0, s * 0.025); tri(0.58); ctx.fillStyle = sh(inner, s * 0.08, ex * s * x, s * y); ctx.fill(); ctx.restore();
  }
}
const muzzle = (k, col, y = -0.055, rx = 0.13, ry = 0.095) => { const { ctx, s, sh } = k; ctx.beginPath(); ctx.ellipse(0, s * y, s * rx, s * ry, 0, 0, TAU); ctx.fillStyle = sh(col, s * rx, 0, s * y, 0.6); ctx.fill(); };
// shiny button nose
function nose(k, y = -0.09, w = 0.05, col = '#2b1d24', h = w * 0.7) {
  const { ctx, s, sh } = k;
  ctx.beginPath(); ctx.ellipse(0, s * y, s * w, s * h, 0, 0, TAU); ctx.fillStyle = sh(col, s * w, 0, s * y); ctx.fill();
  ctx.beginPath(); ctx.ellipse(-s * w * 0.3, s * (y - h * 0.4), s * w * 0.35, s * h * 0.25, -0.3, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
}
// curvy stroked tail from the body side (outline + colour pass)
function tail(k, col, pts, w = 0.06) {
  const { ctx, s, outline } = k;
  for (const [c, lw] of [[outline, w + 0.03], [col, w]]) {
    ctx.beginPath(); ctx.moveTo(s * pts[0], s * pts[1]); ctx.bezierCurveTo(s * pts[2], s * pts[3], s * pts[4], s * pts[5], s * pts[6], s * pts[7]);
    ctx.strokeStyle = c; ctx.lineWidth = s * lw; ctx.lineCap = 'round'; ctx.stroke();
  }
}
const faceNow = (k, extra) => face(k.ctx, { x: 0, blink: k.o.blink || 0, look: k.o.look || [0, 0], brow: k.o.brow ?? 0.5, ink: k.o.ink || '#1b1b1b', mouth: 0, ...FACE(k.s), ...extra });
// bird beak that opens with o.mouth
function beak(k, y, w, h, col = '#ff9f1c') {
  const { ctx, s, sh, fillStroke } = k;
  const open = (k.o.mouth ?? 0.5) * s * h * 0.9;
  ctx.beginPath(); ctx.ellipse(0, s * y + open * 0.5 + s * h * 0.35, s * w * 0.75, s * h * 0.55, 0, 0, TAU); fillStroke(sh(k.dark(col, 0.12), s * w));
  if (open > 1) { ctx.beginPath(); ctx.ellipse(0, s * y + s * h * 0.3, s * w * 0.6, open * 0.6 + s * h * 0.1, 0, 0, Math.PI); ctx.fillStyle = '#7a1f2b'; ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(0, s * y, s * w, s * h * 0.55, 0, 0, TAU); fillStroke(sh(col, s * w, 0, s * y));
}

// --- reference pair --------------------------------------------------------------
export const sheep = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob, sh, fillStroke } = k;
  // legs
  for (const lx of [-0.2, -0.07, 0.08, 0.21]) { ctx.beginPath(); ctx.roundRect(lx * s - s * 0.035, s * 0.2, s * 0.07, s * 0.28, s * 0.03); fillStroke(sh('#4a4052', s * 0.1, lx * s, s * 0.3)); }
  // fluffy wool: ring of lit puffs + centre
  const puffs = 11;
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * TAU;
    blob(Math.cos(a) * s * 0.3, Math.sin(a) * s * 0.2 + s * 0.02, s * 0.13, s * 0.13, '#fbf7f0');
  }
  ctx.beginPath(); ctx.ellipse(0, s * 0.02, s * 0.33, s * 0.23, 0, 0, TAU); ctx.fillStyle = sh('#fbf7f0', s * 0.35); ctx.fill();
  // head (in front, slightly right)
  ctx.save(); ctx.translate(s * 0.26, -s * 0.12);
  for (const ex of [-1, 1]) {
    blob(ex * s * 0.2, -s * 0.02, s * 0.1, s * 0.05, '#5a4d63', ex * 0.4);
    ctx.beginPath(); ctx.ellipse(ex * s * 0.2, -s * 0.02, s * 0.055, s * 0.022, ex * 0.4, 0, TAU); ctx.fillStyle = '#e89ab0'; ctx.fill();
  }
  blob(0, 0, s * 0.19, s * 0.2, '#5a4d63');
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

// --- the cast -------------------------------------------------------------------
export const bear = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const fur = o.color || '#b8784a';
  body(k, fur, { belly: '#f1d3b0' });
  roundEars(k, fur, '#f1c9a5');
  head(k, fur);
  muzzle(k, '#f6dcc0');
  nose(k, -0.095, 0.05, '#4a2a1c');
  return FACE(k.s, { mouthY: 0.26 });
});

export const panda = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, ctx: c, sh } = k;
  body(k, '#f8f6f2', { belly: null, feet: '#2e2a33', arm: '#2e2a33', pad: '#5a5360' });
  roundEars(k, '#2e2a33', '#4a4452', 0.21, -0.35, 0.095);
  head(k, '#f8f6f2');
  for (const ex of [-1, 1]) { c.beginPath(); c.ellipse(ex * s * 0.125, -s * 0.155, s * 0.105, s * 0.13, ex * -0.6, 0, TAU); c.fillStyle = sh('#2e2a33', s * 0.1, ex * s * 0.11, -s * 0.17); c.fill(); }
  nose(k, -0.085, 0.04, '#2e2a33');
  return FACE(s, { mouthY: 0.27, ink: '#1b1b1b' });
});

export const frog = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob } = k;
  const fur = o.color || '#5cc64b';
  body(k, fur, { belly: '#e3f59a', w: 0.24 });
  for (const ex of [-1, 1]) blob(ex * s * 0.14, -s * 0.29, s * 0.105, s * 0.1, fur);  // eye bumps
  head(k, fur, 0.34, 0.22, -0.13);
  for (const ex of [-1, 1]) blob(ex * s * 0.14, -s * 0.29, s * 0.1, s * 0.095, fur, 0, 0.001);
  for (const ex of [-1, 1]) { k.ctx.beginPath(); k.ctx.arc(ex * s * 0.035, -s * 0.13, s * 0.012, 0, TAU); k.ctx.fillStyle = k.dark(fur, 0.5); k.ctx.fill(); }
  return FACE(s, { size: s * 0.62, eyeY: -0.26, eyeSpacing: 0.225, eyeScale: 0.82, mouthY: 0.15, brows: false });
});

export const lion = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob } = k;
  const fur = o.color || '#ffc34d';
  tail(k, fur, [-0.18, 0.35, -0.4, 0.4, -0.38, 0.15, -0.36, 0.1], 0.045);
  blob(-s * 0.36, s * 0.08, s * 0.055, s * 0.065, '#c9642a');
  body(k, fur, { belly: '#fff0c6' });
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; blob(Math.cos(a) * s * 0.3, s * HEAD_Y + Math.sin(a) * s * 0.28, s * 0.11, s * 0.11, i % 2 ? '#e0772e' : '#f08d34'); }
  k.ctx.beginPath(); k.ctx.ellipse(0, s * HEAD_Y, s * 0.33, s * 0.31, 0, 0, TAU); k.ctx.fillStyle = k.sh('#ea8431', s * 0.33, 0, s * HEAD_Y); k.ctx.fill();
  roundEars(k, fur, '#ffdca0', 0.19, -0.35, 0.065);
  head(k, fur, 0.25, 0.23);
  muzzle(k, '#fff0c6', -0.06, 0.11, 0.08);
  nose(k, -0.095, 0.045, '#8a4a2a');
  return FACE(s, { mouthY: 0.26 });
});

export const pig = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, ctx: c, sh, fillStroke } = k;
  const fur = o.color || '#ffadc2';
  tail(k, k.dark(fur, 0.1), [-0.18, 0.28, -0.34, 0.16, -0.36, 0.34, -0.27, 0.27], 0.03);
  body(k, fur, { belly: k.light(fur, 0.4), feet: '#e98aa4' });
  pointyEars(k, fur, '#ff8fab', null, 0.19, -0.3, 0.12, 0.15);
  head(k, fur, 0.3, 0.26);
  c.beginPath(); c.ellipse(0, -s * 0.07, s * 0.095, s * 0.068, 0, 0, TAU); fillStroke(sh('#ff8fab', s * 0.1, 0, -s * 0.07));
  for (const ex of [-1, 1]) { c.beginPath(); c.ellipse(ex * s * 0.033, -s * 0.07, s * 0.016, s * 0.026, 0, 0, TAU); c.fillStyle = '#b3485f'; c.fill(); }
  return FACE(s, { y: -s * 0.15, eyeSpacing: 0.25, mouthY: 0.34 });
});

export const cow = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, ctx: c, blob, sh, fillStroke } = k;
  const spots = (cx, cy, rx, ry) => { c.save(); c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.clip(); for (const [px, py, r] of [[-0.6, -0.5, 0.45], [0.7, 0.2, 0.4], [-0.3, 0.8, 0.3]]) { c.beginPath(); c.ellipse(cx + px * rx, cy + py * ry, r * rx, r * ry * 0.85, 0.4, 0, TAU); c.fillStyle = sh('#3a3340', r * rx, cx + px * rx, cy + py * ry); c.fill(); } c.restore(); };
  body(k, '#fbf8f4', { belly: null, feet: '#4a4052', arm: '#fbf8f4' });
  spots(0, s * 0.25, s * 0.21, s * 0.215);
  for (const ex of [-1, 1]) { blob(ex * s * 0.16, -s * 0.4, s * 0.035, s * 0.07, '#fff1c9', ex * 0.4); blob(ex * s * 0.32, -s * 0.24, s * 0.11, s * 0.055, '#fbf8f4', ex * -0.35); }
  head(k, '#fbf8f4', 0.28, 0.27);
  c.save(); c.beginPath(); c.ellipse(0, s * HEAD_Y, s * 0.28, s * 0.27, 0, 0, TAU); c.clip(); c.beginPath(); c.ellipse(-s * 0.2, -s * 0.36, s * 0.14, s * 0.12, 0.3, 0, TAU); c.fillStyle = sh('#3a3340', s * 0.14, -s * 0.2, -s * 0.36); c.fill(); c.restore();
  c.beginPath(); c.ellipse(0, -s * 0.02, s * 0.19, s * 0.1, 0, 0, TAU); fillStroke(sh('#ffb8c8', s * 0.19, 0, -s * 0.02));
  for (const ex of [-1, 1]) { c.beginPath(); c.ellipse(ex * s * 0.08, -s * 0.045, s * 0.02, s * 0.028, 0, 0, TAU); c.fillStyle = '#c9607a'; c.fill(); }
  blob(0, s * 0.13, s * 0.045, s * 0.045, '#ffcf3a');
  return FACE(s, { y: -s * 0.17, mouthY: 0.35, eyeSpacing: 0.24 });
});

export const duck = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, ctx: c, blob, fillStroke, sh } = k;
  const fur = o.color || '#fdfbf4';
  for (const fx of [-1, 1]) blob(fx * s * 0.12, s * 0.45, s * 0.1, s * 0.045, '#ff9f1c');
  blob(0, s * 0.25, s * 0.25, s * 0.21, fur);
  paws(k, fur, k.light(fur, 0.5), 0.12, 0.17, 0.18);
  head(k, fur, 0.26, 0.26, -0.16);
  c.beginPath(); c.moveTo(0, -s * 0.4); c.quadraticCurveTo(s * 0.02, -s * 0.52, s * 0.1, -s * 0.49); c.quadraticCurveTo(s * 0.03, -s * 0.47, s * 0.03, -s * 0.4); fillStroke(sh(fur, s * 0.06, 0, -s * 0.45));
  faceNow(k, { y: -s * 0.16, eyeY: -0.1 });
  beak(k, -0.05, 0.13, 0.07);
  return null;
});

export const chick = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob } = k;
  const fur = o.color || '#ffd83b';
  for (const fx of [-1, 1]) blob(fx * s * 0.1, s * 0.45, s * 0.08, s * 0.04, '#ff9f1c');
  paws(k, k.dark(fur, 0.05), k.light(fur, 0.4), 0.12, 0.28, 0.17);
  for (const [fx, r] of [[-0.05, -0.35], [0.03, 0.1], [0.1, 0.5]]) blob(s * fx, -s * 0.38, s * 0.035, s * 0.08, fur, r);
  blob(0, s * 0.04, s * 0.36, s * 0.4, fur);
  faceNow(k, { y: -s * 0.08, size: s * 0.56 });
  beak(k, -0.02, 0.075, 0.06);
  return null;
});

export const cat = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, ctx: c } = k;
  const fur = o.color || '#ffa950', stripe = k.dark(fur, 0.35);
  tail(k, fur, [0.15, 0.36, 0.42, 0.4, 0.4, 0.1, 0.32, 0.02], 0.055);
  body(k, fur, { belly: '#fff2e0' });
  pointyEars(k, fur, '#ffb3c6', null, 0.17, -0.33, 0.19, 0.03);
  head(k, fur, 0.3, 0.25);
  for (const dx of [-0.05, 0, 0.05]) { c.beginPath(); c.moveTo(s * dx, -s * 0.39); c.lineTo(s * dx * 0.8, -s * 0.33); c.strokeStyle = stripe; c.lineWidth = s * 0.022; c.lineCap = 'round'; c.stroke(); }
  muzzle(k, '#fff2e0', -0.06, 0.1, 0.07);
  c.beginPath(); c.moveTo(-s * 0.03, -s * 0.1); c.lineTo(s * 0.03, -s * 0.1); c.lineTo(0, -s * 0.07); c.closePath(); c.fillStyle = '#ff7b9c'; c.fill();
  for (const ex of [-1, 1]) for (const a of [-0.12, 0.1]) { c.beginPath(); c.moveTo(ex * s * 0.12, -s * 0.06); c.lineTo(ex * s * 0.27, -s * (0.06 + a * 0.6)); c.strokeStyle = 'rgba(40,20,20,0.55)'; c.lineWidth = s * 0.008; c.stroke(); }
  return FACE(s, { mouthY: 0.24 });
});

export const dog = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob, ctx: c, sh } = k;
  const fur = o.color || '#e6b27a', ear = '#9a6440';
  tail(k, fur, [-0.18, 0.3, -0.3, 0.3, -0.36, 0.2, -0.33, 0.1], 0.05);
  body(k, fur, { belly: '#fff1dd' });
  head(k, fur, 0.29, 0.26);
  c.beginPath(); c.ellipse(s * 0.12, -s * 0.2, s * 0.1, s * 0.085, 0.3, 0, TAU); c.fillStyle = sh(ear, s * 0.1, s * 0.12, -s * 0.2, 0.6); c.fill();
  for (const ex of [-1, 1]) blob(ex * s * 0.28, -s * 0.16, s * 0.085, s * 0.17, ear, ex * -0.3);
  muzzle(k, '#fff1dd', -0.05, 0.13, 0.09);
  nose(k, -0.095, 0.055, '#2b1d24');
  return FACE(s, { mouthY: 0.27 });
});

export const fox = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob, ctx: c, sh } = k;
  const fur = o.color || '#ff8a3d';
  blob(-s * 0.3, s * 0.2, s * 0.12, s * 0.22, fur, -0.6);
  c.save(); c.beginPath(); c.ellipse(-s * 0.3, s * 0.2, s * 0.12, s * 0.22, -0.6, 0, TAU); c.clip(); c.beginPath(); c.arc(-s * 0.44, s * 0.03, s * 0.1, 0, TAU); c.fillStyle = '#fffaf2'; c.fill(); c.restore();
  body(k, fur, { belly: '#fffaf2', feet: '#4a3040', arm: fur });
  pointyEars(k, fur, '#fff1e0', '#3a2630', 0.18, -0.32, 0.22, 0.04);
  head(k, fur, 0.3, 0.25);
  c.save(); c.beginPath(); c.ellipse(0, s * HEAD_Y, s * 0.3, s * 0.25, 0, 0, TAU); c.clip();
  c.beginPath(); c.moveTo(-s * 0.32, -s * 0.12); c.quadraticCurveTo(-s * 0.12, -s * 0.16, 0, -s * 0.1); c.quadraticCurveTo(s * 0.12, -s * 0.16, s * 0.32, -s * 0.12); c.lineTo(s * 0.32, s * 0.2); c.lineTo(-s * 0.32, s * 0.2); c.closePath();
  c.fillStyle = sh('#fffaf2', s * 0.25, 0, 0, 0.5); c.fill(); c.restore();
  nose(k, -0.09, 0.04, '#2b1d24');
  return FACE(s, { mouthY: 0.26 });
});

export const elephant = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob, ctx: c } = k;
  const fur = o.color || '#9fb2cc';
  body(k, fur, { belly: k.light(fur, 0.35) });
  for (const ex of [-1, 1]) { blob(ex * s * 0.3, -s * 0.16, s * 0.17, s * 0.19, fur, ex * 0.2); c.beginPath(); c.ellipse(ex * s * 0.31, -s * 0.15, s * 0.11, s * 0.13, ex * 0.2, 0, TAU); c.fillStyle = k.sh('#ffb8cc', s * 0.12, ex * s * 0.3, -s * 0.16); c.fill(); }
  head(k, fur, 0.26, 0.25);
  const lift = (o.mouth ?? 0.5) * 0.05;                                     // trunk curls up as she sings
  tail(k, fur, [0, -0.05, 0, -0.24, -0.02, -0.4, 0.09 + lift, -0.43 - lift], 0.078);      // trunk raised in a happy toot
  c.beginPath(); c.ellipse(0, -s * 0.05, s * 0.07, s * 0.04, 0, 0, TAU); c.fillStyle = k.sh(fur, s * 0.26, 0, s * HEAD_Y); c.fill();
  for (const wy of [-0.12, -0.17, -0.22]) { c.beginPath(); c.moveTo(-s * 0.025, s * wy); c.quadraticCurveTo(0, s * (wy + 0.01), s * 0.025, s * wy); c.strokeStyle = k.dark(fur, 0.3); c.lineWidth = s * 0.008; c.stroke(); }
  return FACE(s, { y: -s * 0.14, mouthY: 0.3, eyeSpacing: 0.27 });
});

export const monkey = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, ctx: c, sh } = k;
  const fur = o.color || '#9a6240', skin = '#ffd9b0';
  tail(k, fur, [0.15, 0.35, 0.45, 0.4, 0.42, 0.05, 0.3, 0.1], 0.045);
  body(k, fur, { belly: skin });
  roundEars(k, fur, skin, 0.3, -0.15, 0.09);
  head(k, fur, 0.27, 0.26);
  c.beginPath(); for (const ex of [-1, 1]) c.ellipse(ex * s * 0.09, -s * 0.18, s * 0.11, s * 0.115, 0, 0, TAU); c.ellipse(0, -s * 0.05, s * 0.18, s * 0.12, 0, 0, TAU);
  c.fillStyle = sh(skin, s * 0.2, 0, -s * 0.1, 0.6); c.fill();
  for (const [fx, r] of [[-0.04, -0.4], [0.03, 0.3]]) k.blob(s * fx, -s * 0.41, s * 0.04, s * 0.06, fur, r);
  for (const ex of [-1, 1]) { c.beginPath(); c.arc(ex * s * 0.025, -s * 0.085, s * 0.012, 0, TAU); c.fillStyle = '#8a4f3a'; c.fill(); }
  return FACE(s, { mouthY: 0.27 });
});

export const koala = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob, ctx: c } = k;
  const fur = o.color || '#a9afbd';
  body(k, fur, { belly: '#eef0f5' });
  for (const ex of [-1, 1]) {
    blob(ex * s * 0.27, -s * 0.32, s * 0.145, s * 0.14, fur);
    for (let i = 0; i < 5; i++) { const a = ex > 0 ? -1.2 + i * 0.5 : Math.PI + 1.2 - i * 0.5; c.beginPath(); c.arc(ex * s * 0.29 + Math.cos(a) * s * 0.065, -s * 0.31 + Math.sin(a) * s * 0.06, s * 0.045, 0, TAU); c.fillStyle = '#f4f5f9'; c.fill(); }
  }
  head(k, fur, 0.3, 0.26);
  c.beginPath(); c.ellipse(0, -s * 0.1, s * 0.058, s * 0.08, 0, 0, TAU); c.fillStyle = k.sh('#3a3440', s * 0.08, 0, -s * 0.1); c.fill(); k.stroke(k.lw * 0.6);
  c.beginPath(); c.ellipse(-s * 0.02, -s * 0.14, s * 0.018, s * 0.028, -0.2, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.6)'; c.fill();
  return FACE(s, { y: -s * 0.16, eyeSpacing: 0.25, mouthY: 0.33 });
});
