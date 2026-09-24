// Farm & friends — baby-proportioned animals: big round heads, small bodies,
// glossy happy faces, lighter muzzles / bellies / inner ears, lit from the top-left.
// Shared shapes live in the little helpers below; each animal just composes them.
//
// Heads are authored in a small "design space" (head centre at HEAD_Y, radius
// ~0.28) and blown up by G about HC by inHead(), with outline widths
// compensated, so the head+body silhouette fills the same box as a fruit.
import { drawCritter, face, accessory, TAU } from './core.mjs';

// --- shared shapes ------------------------------------------------------------
const HEAD_Y = -0.15, HC = -0.12, G = 1.5;
const FACE0 = (s, extra = {}) => ({ y: -s * 0.13, size: s * 0.5, eyeScale: 1.2, eyeSpacing: 0.235, ...extra });
// face options in body space for a face authored in head design space
const FACE = (s, extra = {}) => { const f = FACE0(s, extra); return { ...f, y: s * HC + (f.y - s * HEAD_Y) * G, size: f.size * G, hat: [0, -s * 0.555, s * 0.92] }; };

// run fn with (design-space → body-space) zoom: point (ox, oy)·s lands on (tx, ty)·s, scaled by g
function zoom(k, tx, ty, g, ox, oy, fn) {
  const { ctx, s } = k;
  ctx.save(); ctx.translate(s * tx, s * ty); ctx.scale(g, g); ctx.translate(-s * ox, -s * oy);
  const w0 = k.lw / g;
  fn({ ...k, lw: w0, stroke: (w = w0) => k.stroke(w), fillStroke: (f, w = w0) => k.fillStroke(f, w), blob: (x, y, rx, ry, hex, rot = 0, w = w0) => k.blob(x, y, rx, ry, hex, rot, w) });
  ctx.restore();
}
const inHead = (k, fn) => zoom(k, 0, HC, G, 0, HEAD_Y, fn);

// little arms that swing up with o.wave (-1 hanging … 1 raised), paw pads at the tips
function paws(k, fur, pad = k.light(fur, 0.5), y = 0.28, x = 0.17, len = 0.17) {
  const { ctx, s, o, sh, fillStroke } = k;
  const w = Math.max(-1, Math.min(1, o.wave || 0));
  for (const sx of [-1, 1]) {
    const th = 0.85 + 1.25 * w * (sx < 0 ? 1 : 0.85);
    ctx.save(); ctx.translate(sx * s * x, s * y); ctx.rotate(-sx * th);
    ctx.beginPath(); ctx.ellipse(0, s * len * 0.5, s * len * 0.32, s * len * 0.58, 0, 0, TAU);
    fillStroke(sh(fur, s * len * 0.6, 0, s * len * 0.4));
    ctx.beginPath(); ctx.ellipse(0, s * len * 0.82, s * len * 0.21, s * len * 0.17, 0, 0, TAU); ctx.fillStyle = pad; ctx.fill();
    ctx.restore();
  }
}
// small round body + belly + feet + arms (everything below the head)
function body(k, fur, { belly = k.light(fur, 0.55), feet = fur, arm = fur, pad, w = 0.25 } = {}) {
  const { s, blob } = k;
  for (const fx of [-1, 1]) blob(fx * s * 0.12, s * 0.465, s * 0.1, s * 0.055, feet);
  blob(0, s * 0.35, s * w, s * 0.17, fur);
  if (belly) blob(0, s * 0.39, s * w * 0.6, s * 0.11, belly, 0, 0.001);
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
// pointy ears (cat / fox / pig): outer triangle + inner, optional dark tips
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
// curvy stroked tail (outline pass + colour pass); pts are a cubic in s-units
function tail(k, col, pts, w = 0.06) {
  const { ctx, s } = k;
  for (const [c, lw] of [[k.outline, w + k.lw * 2 / s], [col, w]]) {
    ctx.beginPath(); ctx.moveTo(s * pts[0], s * pts[1]); ctx.bezierCurveTo(s * pts[2], s * pts[3], s * pts[4], s * pts[5], s * pts[6], s * pts[7]);
    ctx.strokeStyle = typeof c === 'string' && c === col ? k.sh(col, s * 0.2, s * pts[6], s * pts[7]) : c; ctx.lineWidth = s * lw; ctx.lineCap = 'round'; ctx.stroke();
  }
}
// draw the face now (in whatever space k is in) — for critters whose beak/trunk goes on top
const faceNow = (k, extra) => face(k.ctx, { x: 0, blink: k.o.blink || 0, look: k.o.look || [0, 0], brow: k.o.brow ?? 0.5, ink: k.o.ink || '#1b1b1b', mouth: 0, ...FACE0(k.s), ...extra });
// holiday hat for critters that draw their own face (return false afterwards so core skips its hat)
function hatOn(k, x, top, size) { if (!k.o.hat) return; k.ctx.save(); k.ctx.translate(k.s * x, k.s * top + k.s * size * 0.5); accessory(k.ctx, k.o.hat, k.s * size, k.outline); k.ctx.restore(); }
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
  for (const lx of [-0.24, -0.09, 0.07, 0.22]) { ctx.beginPath(); ctx.roundRect(lx * s - s * 0.04, s * 0.22, s * 0.08, s * 0.27, s * 0.035); fillStroke(sh('#4a4052', s * 0.1, lx * s, s * 0.3)); }
  // fluffy wool: ring of lit puffs + centre
  const puffs = 12;
  for (let i = 0; i < puffs; i++) {
    const a = (i / puffs) * TAU;
    blob(Math.cos(a) * s * 0.34, Math.sin(a) * s * 0.22 + s * 0.06, s * 0.14, s * 0.14, '#fbf7f0');
  }
  ctx.beginPath(); ctx.ellipse(0, s * 0.06, s * 0.37, s * 0.25, 0, 0, TAU); ctx.fillStyle = sh('#fbf7f0', s * 0.38, 0, s * 0.06); ctx.fill();
  // big head in front, slightly right (authored at the old size, zoomed 1.45×)
  zoom(k, 0.18, -0.18, 1.45, 0, 0, (h) => {
    for (const ex of [-1, 1]) {
      h.blob(ex * s * 0.2, -s * 0.02, s * 0.1, s * 0.05, '#5a4d63', ex * 0.4);
      ctx.beginPath(); ctx.ellipse(ex * s * 0.2, -s * 0.02, s * 0.055, s * 0.022, ex * 0.4, 0, TAU); ctx.fillStyle = '#e89ab0'; ctx.fill();
    }
    h.blob(0, 0, s * 0.19, s * 0.2, '#5a4d63');
    ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.11, s * 0.08, 0, 0, TAU); ctx.fillStyle = sh('#6e6078', s * 0.11, 0, s * 0.08, 0.5); ctx.fill();
    for (let i = 0; i < 5; i++) h.blob((i - 2) * s * 0.06, -s * 0.19 - (i % 2) * s * 0.02, s * 0.06, s * 0.06, '#fbf7f0');
  });
  return { x: s * 0.18, y: -s * 0.14, size: s * 0.64, ink: '#1b1b1b', brows: false, eyeScale: 1.1, cheeks: true, hat: [s * 0.18, -s * 0.55, s * 0.68] };
});

export const bunny = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob } = k;
  const fur = o.color || '#f4efe9';
  blob(-s * 0.25, s * 0.4, s * 0.09, s * 0.09, '#ffffff');              // tail
  body(k, fur, { belly: k.light(fur, 0.6) });
  inHead(k, (h) => {
    for (const ex of [-1, 1]) {                                         // ears
      h.blob(ex * s * 0.09, -s * 0.44, s * 0.065, s * 0.15, fur, ex * 0.15);
      ctx.beginPath(); ctx.ellipse(ex * s * 0.09, -s * 0.43, s * 0.032, s * 0.1, ex * 0.15, 0, TAU); ctx.fillStyle = '#ffb3c6'; ctx.fill();
    }
    head(h, fur, 0.28, 0.25);
    muzzle(h, '#ffffff', -0.065, 0.1, 0.07);
    nose(h, -0.1, 0.03, '#ff8fab');
  });
  return FACE(s, { mouthY: 0.25 });
});

// --- the cast -------------------------------------------------------------------
export const bear = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const fur = o.color || '#b8784a';
  body(k, fur, { belly: '#f1d3b0' });
  inHead(k, (h) => {
    roundEars(h, fur, '#f1c9a5');
    head(h, fur);
    muzzle(h, '#f6dcc0');
    nose(h, -0.095, 0.05, '#4a2a1c');
  });
  return FACE(k.s, { mouthY: 0.26 });
});

export const panda = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  body(k, '#f8f6f2', { belly: null, feet: '#2e2a33', arm: '#2e2a33', pad: '#5a5360' });
  inHead(k, (h) => {
    roundEars(h, '#2e2a33', '#4a4452', 0.21, -0.35, 0.095);
    head(h, '#f8f6f2');
    for (const ex of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex * s * 0.125, -s * 0.155, s * 0.105, s * 0.13, ex * -0.6, 0, TAU); ctx.fillStyle = h.sh('#2e2a33', s * 0.1, ex * s * 0.11, -s * 0.17); ctx.fill(); }
    nose(h, -0.085, 0.04, '#2e2a33');
  });
  return FACE(s, { mouthY: 0.27 });
});

export const frog = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#5cc64b';
  body(k, fur, { belly: '#e3f59a', w: 0.27 });
  inHead(k, (h) => {
    for (const ex of [-1, 1]) h.blob(ex * s * 0.14, -s * 0.29, s * 0.105, s * 0.1, fur);  // eye bumps
    head(h, fur, 0.33, 0.21, -0.12);
    for (const ex of [-1, 1]) h.blob(ex * s * 0.14, -s * 0.29, s * 0.1, s * 0.095, fur, 0, 0.001);
    for (const ex of [-1, 1]) { ctx.beginPath(); ctx.arc(ex * s * 0.035, -s * 0.13, s * 0.012, 0, TAU); ctx.fillStyle = k.dark(fur, 0.5); ctx.fill(); }
  });
  return FACE(s, { size: s * 0.62, eyeY: -0.26, eyeSpacing: 0.225, eyeScale: 0.82, mouthY: 0.15, brows: false });
});

export const lion = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#ffc34d';
  tail(k, fur, [-0.2, 0.42, -0.42, 0.44, -0.42, 0.24, -0.4, 0.18], 0.045);
  k.blob(-s * 0.4, s * 0.16, s * 0.05, s * 0.06, '#c9642a');
  body(k, fur, { belly: '#fff0c6' });
  inHead(k, (h) => {
    for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; h.blob(Math.cos(a) * s * 0.255, s * HEAD_Y + Math.sin(a) * s * 0.24, s * 0.085, s * 0.085, i % 2 ? '#e0772e' : '#f08d34'); }
    ctx.beginPath(); ctx.ellipse(0, s * HEAD_Y, s * 0.27, s * 0.25, 0, 0, TAU); ctx.fillStyle = h.sh('#ea8431', s * 0.27, 0, s * HEAD_Y); ctx.fill();
    roundEars(h, fur, '#ffdca0', 0.17, -0.33, 0.055);
    head(h, fur, 0.23, 0.215);
    muzzle(h, '#fff0c6', -0.06, 0.1, 0.075);
    nose(h, -0.095, 0.042, '#8a4a2a');
  });
  return FACE(s, { size: s * 0.46, mouthY: 0.27 });
});

export const pig = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#ffadc2';
  tail(k, k.dark(fur, 0.1), [-0.22, 0.38, -0.38, 0.26, -0.4, 0.44, -0.31, 0.37], 0.03);
  body(k, fur, { belly: k.light(fur, 0.4), feet: '#e98aa4' });
  inHead(k, (h) => {
    for (const ex of [-1, 1]) {                                          // floppy ears folding forward
      h.blob(ex * s * 0.22, -s * 0.33, s * 0.065, s * 0.11, fur, ex * 0.95);
      ctx.beginPath(); ctx.ellipse(ex * s * 0.225, -s * 0.325, s * 0.035, s * 0.07, ex * 0.95, 0, TAU); ctx.fillStyle = '#ff8fab'; ctx.fill();
    }
    head(h, fur, 0.3, 0.26);
    ctx.beginPath(); ctx.ellipse(0, -s * 0.07, s * 0.095, s * 0.068, 0, 0, TAU); h.fillStroke(h.sh('#ff8fab', s * 0.1, 0, -s * 0.07));
    for (const ex of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex * s * 0.033, -s * 0.07, s * 0.016, s * 0.026, 0, 0, TAU); ctx.fillStyle = '#b3485f'; ctx.fill(); }
  });
  return FACE(s, { y: -s * 0.15, eyeSpacing: 0.25, mouthY: 0.34 });
});

export const cow = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const spot = (c, cx, cy, rx, ry, r = 0.4) => { c.beginPath(); c.ellipse(cx, cy, rx, ry, r, 0, TAU); c.fillStyle = k.sh('#3a3340', rx, cx, cy); c.fill(); };
  body(k, '#fbf8f4', { belly: null, feet: '#4a4052' });
  ctx.save(); ctx.beginPath(); ctx.ellipse(0, s * 0.35, s * 0.25, s * 0.17, 0, 0, TAU); ctx.clip(); spot(ctx, s * 0.18, s * 0.42, s * 0.1, s * 0.08); spot(ctx, -s * 0.2, s * 0.3, s * 0.08, s * 0.07); ctx.restore();
  inHead(k, (h) => {
    for (const ex of [-1, 1]) { h.blob(ex * s * 0.15, -s * 0.39, s * 0.035, s * 0.07, '#fff1c9', ex * 0.4); h.blob(ex * s * 0.31, -s * 0.24, s * 0.1, s * 0.05, '#fbf8f4', ex * -0.35); }
    head(h, '#fbf8f4', 0.28, 0.27);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, s * HEAD_Y, s * 0.28, s * 0.27, 0, 0, TAU); ctx.clip(); spot(ctx, -s * 0.2, -s * 0.36, s * 0.14, s * 0.12, 0.3); ctx.restore();
    ctx.beginPath(); ctx.ellipse(0, -s * 0.02, s * 0.19, s * 0.1, 0, 0, TAU); h.fillStroke(h.sh('#ffb8c8', s * 0.19, 0, -s * 0.02));
    for (const ex of [-1, 1]) { ctx.beginPath(); ctx.ellipse(ex * s * 0.08, -s * 0.045, s * 0.02, s * 0.028, 0, 0, TAU); ctx.fillStyle = '#c9607a'; ctx.fill(); }
  });
  k.blob(0, s * 0.25, s * 0.045, s * 0.045, '#ffcf3a');                  // little bell
  return FACE(s, { y: -s * 0.17, mouthY: 0.35, eyeSpacing: 0.24 });
});

export const duck = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob } = k;
  const fur = o.color || '#fdfbf4';
  for (const fx of [-1, 1]) blob(fx * s * 0.13, s * 0.47, s * 0.11, s * 0.045, '#ff9f1c');
  blob(0, s * 0.34, s * 0.28, s * 0.17, fur);
  paws(k, fur, k.light(fur, 0.5), 0.28, 0.2, 0.18);
  inHead(k, (h) => {
    head(h, fur, 0.27, 0.26);
    ctx.beginPath(); ctx.moveTo(0, -s * 0.4); ctx.quadraticCurveTo(s * 0.02, -s * 0.52, s * 0.1, -s * 0.49); ctx.quadraticCurveTo(s * 0.03, -s * 0.47, s * 0.03, -s * 0.4); h.fillStroke(h.sh(fur, s * 0.06, 0, -s * 0.45));
    faceNow(h, { y: -s * 0.16, eyeY: -0.1 });
    beak(h, -0.05, 0.13, 0.07);
  });
  hatOn(k, 0, -0.55, 0.9);
  return false;
});

export const chick = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob } = k;
  const fur = o.color || '#ffd83b';
  for (const fx of [-1, 1]) blob(fx * s * 0.13, s * 0.47, s * 0.1, s * 0.045, '#ff9f1c');
  paws(k, k.dark(fur, 0.05), k.light(fur, 0.4), 0.14, 0.34, 0.2);
  for (const [fx, r] of [[-0.06, -0.35], [0.03, 0.1], [0.12, 0.5]]) blob(s * fx, -s * 0.45, s * 0.04, s * 0.1, fur, r);
  blob(0, s * 0.02, s * 0.43, s * 0.46, fur);
  zoom(k, 0, 0, 1.45, 0, 0, (h) => { faceNow(h, { y: -s * 0.06, size: s * 0.52 }); beak(h, 0.0, 0.075, 0.06); });
  hatOn(k, 0, -0.5, 0.9);
  return false;
});

export const cat = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#ffa950', stripe = k.dark(fur, 0.35);
  tail(k, fur, [0.18, 0.42, 0.46, 0.46, 0.46, 0.2, 0.38, 0.12], 0.055);
  body(k, fur, { belly: '#fff2e0' });
  inHead(k, (h) => {
    pointyEars(h, fur, '#ffb3c6', null, 0.17, -0.33, 0.17, 0.03);
    head(h, fur, 0.3, 0.25);
    for (const dx of [-0.05, 0, 0.05]) { ctx.beginPath(); ctx.moveTo(s * dx, -s * 0.39); ctx.lineTo(s * dx * 0.8, -s * 0.33); ctx.strokeStyle = stripe; ctx.lineWidth = s * 0.02; ctx.lineCap = 'round'; ctx.stroke(); }
    muzzle(h, '#fff2e0', -0.06, 0.1, 0.07);
    ctx.beginPath(); ctx.moveTo(-s * 0.03, -s * 0.1); ctx.lineTo(s * 0.03, -s * 0.1); ctx.lineTo(0, -s * 0.07); ctx.closePath(); ctx.fillStyle = '#ff7b9c'; ctx.fill();
    for (const ex of [-1, 1]) for (const a of [-0.12, 0.1]) { ctx.beginPath(); ctx.moveTo(ex * s * 0.13, -s * 0.06); ctx.lineTo(ex * s * 0.27, -s * (0.06 + a * 0.6)); ctx.strokeStyle = 'rgba(40,20,20,0.55)'; ctx.lineWidth = s * 0.007; ctx.stroke(); }
  });
  return FACE(s, { mouthY: 0.24 });
});

export const dog = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#e6b27a', ear = '#9a6440';
  tail(k, fur, [-0.22, 0.38, -0.34, 0.38, -0.4, 0.28, -0.37, 0.18], 0.05);
  body(k, fur, { belly: '#fff1dd' });
  inHead(k, (h) => {
    head(h, fur, 0.29, 0.26);
    ctx.beginPath(); ctx.ellipse(s * 0.12, -s * 0.2, s * 0.1, s * 0.085, 0.3, 0, TAU); ctx.fillStyle = h.sh(ear, s * 0.1, s * 0.12, -s * 0.2, 0.6); ctx.fill();
    for (const ex of [-1, 1]) h.blob(ex * s * 0.27, -s * 0.16, s * 0.08, s * 0.16, ear, ex * -0.3);
    muzzle(h, '#fff1dd', -0.05, 0.13, 0.09);
    nose(h, -0.095, 0.055, '#2b1d24');
  });
  return FACE(s, { mouthY: 0.27 });
});

export const fox = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s, blob } = k;
  const fur = o.color || '#ff8a3d';
  blob(-s * 0.3, s * 0.3, s * 0.11, s * 0.2, fur, -0.7);                 // bushy tail with white tip
  ctx.save(); ctx.beginPath(); ctx.ellipse(-s * 0.3, s * 0.3, s * 0.11, s * 0.2, -0.7, 0, TAU); ctx.clip(); ctx.beginPath(); ctx.arc(-s * 0.44, s * 0.15, s * 0.1, 0, TAU); ctx.fillStyle = '#fffaf2'; ctx.fill(); ctx.restore();
  body(k, fur, { belly: '#fffaf2', feet: '#4a3040' });
  inHead(k, (h) => {
    pointyEars(h, fur, '#fff1e0', '#3a2630', 0.18, -0.32, 0.2, 0.04);
    head(h, fur, 0.3, 0.25);
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, s * HEAD_Y, s * 0.3, s * 0.25, 0, 0, TAU); ctx.clip();
    ctx.beginPath(); ctx.moveTo(-s * 0.32, -s * 0.12); ctx.quadraticCurveTo(-s * 0.12, -s * 0.16, 0, -s * 0.1); ctx.quadraticCurveTo(s * 0.12, -s * 0.16, s * 0.32, -s * 0.12); ctx.lineTo(s * 0.32, s * 0.2); ctx.lineTo(-s * 0.32, s * 0.2); ctx.closePath();
    ctx.fillStyle = h.sh('#fffaf2', s * 0.25, 0, 0, 0.5); ctx.fill(); ctx.restore();
    nose(h, -0.09, 0.04, '#2b1d24');
  });
  return FACE(s, { mouthY: 0.26 });
});

export const elephant = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#9fb2cc';
  body(k, fur, { belly: k.light(fur, 0.35) });
  inHead(k, (h) => {
    for (const ex of [-1, 1]) { h.blob(ex * s * 0.26, -s * 0.16, s * 0.14, s * 0.17, fur, ex * 0.2); ctx.beginPath(); ctx.ellipse(ex * s * 0.27, -s * 0.15, s * 0.09, s * 0.115, ex * 0.2, 0, TAU); ctx.fillStyle = h.sh('#ffb8cc', s * 0.1, ex * s * 0.27, -s * 0.16); ctx.fill(); }
    head(h, fur, 0.26, 0.25);
    const lift = (o.mouth ?? 0.5) * 0.05;                                   // trunk curls up as she sings
    tail(h, fur, [0, -0.05, 0, -0.24, -0.02, -0.4, 0.09 + lift, -0.43 - lift], 0.075);
    ctx.beginPath(); ctx.ellipse(0, -s * 0.05, s * 0.07, s * 0.04, 0, 0, TAU); ctx.fillStyle = h.sh(fur, s * 0.26, 0, s * HEAD_Y); ctx.fill();
    for (const wy of [-0.12, -0.17, -0.22]) { ctx.beginPath(); ctx.moveTo(-s * 0.025, s * wy); ctx.quadraticCurveTo(0, s * (wy + 0.01), s * 0.025, s * wy); ctx.strokeStyle = k.dark(fur, 0.3); ctx.lineWidth = s * 0.007; ctx.stroke(); }
  });
  return FACE(s, { y: -s * 0.14, mouthY: 0.3, eyeSpacing: 0.27 });
});

export const monkey = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#9a6240', skin = '#ffd9b0';
  tail(k, fur, [0.18, 0.42, 0.48, 0.46, 0.46, 0.14, 0.34, 0.18], 0.045);
  body(k, fur, { belly: skin });
  inHead(k, (h) => {
    roundEars(h, fur, skin, 0.29, -0.15, 0.085);
    head(h, fur, 0.27, 0.26);
    ctx.beginPath(); for (const ex of [-1, 1]) ctx.ellipse(ex * s * 0.09, -s * 0.18, s * 0.11, s * 0.115, 0, 0, TAU); ctx.ellipse(0, -s * 0.05, s * 0.18, s * 0.12, 0, 0, TAU);
    ctx.fillStyle = h.sh(skin, s * 0.2, 0, -s * 0.1, 0.6); ctx.fill();
    for (const [fx, r] of [[-0.04, -0.4], [0.03, 0.3]]) h.blob(s * fx, -s * 0.41, s * 0.04, s * 0.06, fur, r);
    for (const ex of [-1, 1]) { ctx.beginPath(); ctx.arc(ex * s * 0.025, -s * 0.085, s * 0.012, 0, TAU); ctx.fillStyle = '#8a4f3a'; ctx.fill(); }
  });
  return FACE(s, { mouthY: 0.27 });
});

export const koala = (ctx, x, y, size, o = {}) => drawCritter(ctx, x, y, size, o, (k) => {
  const { s } = k;
  const fur = o.color || '#a9afbd';
  body(k, fur, { belly: '#eef0f5' });
  inHead(k, (h) => {
    for (const ex of [-1, 1]) {
      h.blob(ex * s * 0.26, -s * 0.32, s * 0.13, s * 0.125, fur);
      for (let i = 0; i < 5; i++) { const a = ex > 0 ? -1.2 + i * 0.5 : Math.PI + 1.2 - i * 0.5; ctx.beginPath(); ctx.arc(ex * s * 0.28 + Math.cos(a) * s * 0.058, -s * 0.31 + Math.sin(a) * s * 0.054, s * 0.04, 0, TAU); ctx.fillStyle = '#f4f5f9'; ctx.fill(); }
    }
    head(h, fur, 0.3, 0.26);
    ctx.beginPath(); ctx.ellipse(0, -s * 0.1, s * 0.058, s * 0.08, 0, 0, TAU); ctx.fillStyle = h.sh('#3a3440', s * 0.08, 0, -s * 0.1); ctx.fill(); h.stroke(h.lw * 0.6);
    ctx.beginPath(); ctx.ellipse(-s * 0.02, -s * 0.14, s * 0.018, s * 0.028, -0.2, 0, TAU); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  });
  return FACE(s, { y: -s * 0.16, eyeSpacing: 0.25, mouthY: 0.33 });
});
