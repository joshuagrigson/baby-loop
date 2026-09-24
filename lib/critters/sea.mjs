// sea critters — see core.mjs for the style rules and farm.mjs for reference.
// All face RIGHT. Animation inputs: o.wave (-1..1, fins / claws / tail flap) and
// o.phase (0..1, tentacles / spout; pass an integer multiple of the loop phase).
import { drawCritter, TAU, withAlpha, mixHex, accessory } from './core.mjs';

// drawCritter wrapper: sea faces sit off-centre, so the holiday hat is placed on
// the head from the face options' hat: [x, headTopY, size] (in s units).
function sea(ctx, x, y, size, o, draw) {
  return drawCritter(ctx, x, y, size, o.hat ? { ...o, hat: null } : o, (k) => {
    const f = draw(k);
    if (o.hat && o.hat !== 'none' && f && f.hat) {
      const [hx, top, hs] = f.hat;
      ctx.save(); ctx.translate(hx * k.s, top * k.s + hs * k.s * 0.5); accessory(ctx, o.hat, hs * k.s, k.outline); ctx.restore();
    }
    return f;
  });
}

// Filled + lit + outlined path, with optional clipped decoration drawn inside.
function part(k, path, hex, r, cx = 0, cy = 0, deco = null) {
  const { ctx } = k;
  ctx.beginPath(); path(); ctx.fillStyle = k.sh(hex, r, cx, cy); ctx.fill();
  if (deco) { ctx.save(); ctx.beginPath(); path(); ctx.clip(); deco(); ctx.restore(); }
  ctx.beginPath(); path(); k.stroke();
}
// Fin stripes fanning out from a base point (clip first).
function rays(k, bx, by, a0, a1, n, len, col) {
  const { ctx, s } = k;
  ctx.strokeStyle = col; ctx.lineWidth = s * 0.028; ctx.lineCap = 'round'; ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n, c = Math.cos(a), sn = Math.sin(a);
    ctx.moveTo(bx + c * len * 0.3, by + sn * len * 0.3); ctx.lineTo(bx + c * len, by + sn * len);
  }
  ctx.stroke();
}
// Tapered tube along a polyline (tentacles, tails). pts in pixels.
function tube(k, pts, w0, w1, hex, deco = null) {
  const L = [], R = [], n = pts.length;
  let a = 0;
  for (let i = 0; i < n; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n - 1, i + 1)];
    a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const w = (w0 + ((w1 - w0) * i) / (n - 1)) / 2, dx = -Math.sin(a) * w, dy = Math.cos(a) * w;
    L.push([pts[i][0] + dx, pts[i][1] + dy]); R.push([pts[i][0] - dx, pts[i][1] - dy]);
  }
  const [ex, ey] = pts[n - 1], m = pts[n >> 1];
  const path = () => {
    k.ctx.moveTo(R[0][0], R[0][1]);
    for (const p of L) k.ctx.lineTo(p[0], p[1]);
    k.ctx.arc(ex, ey, w1 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
    for (let i = n - 1; i >= 0; i--) k.ctx.lineTo(R[i][0], R[i][1]);
    k.ctx.closePath();
  };
  part(k, path, hex, k.s * 0.3, m[0], m[1], deco);
}
const gloss = (k, x, y, rx, ry, rot = -0.5, a = 0.45) => { k.ctx.beginPath(); k.ctx.ellipse(x, y, rx, ry, rot, 0, TAU); k.ctx.fillStyle = withAlpha('#ffffff', a); k.ctx.fill(); };
const ph = (o) => TAU * (o.phase !== undefined ? o.phase : (o.wave || 0) * 0.25);

export const fish = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, dark } = k;
  const c = o.color || '#ff9a1f', fin = dark(c, 0.08), st = light(c, 0.6), flap = (o.wave || 0) * 0.22;
  ctx.save(); ctx.translate(-s * 0.3, 0); ctx.rotate(flap);                               // tail
  part(k, () => { ctx.moveTo(s * 0.05, 0); ctx.quadraticCurveTo(-s * 0.08, -s * 0.14, -s * 0.22, -s * 0.3); ctx.quadraticCurveTo(-s * 0.12, 0, -s * 0.22, s * 0.3); ctx.quadraticCurveTo(-s * 0.08, s * 0.14, s * 0.05, 0); ctx.closePath(); },
    fin, s * 0.25, -s * 0.1, 0, () => rays(k, s * 0.04, 0, Math.PI * 0.72, Math.PI * 1.28, 5, s * 0.32, st));
  ctx.restore();
  part(k, () => { ctx.moveTo(-s * 0.28, -s * 0.16); ctx.bezierCurveTo(-s * 0.32, -s * 0.5, -s * 0.02, -s * 0.58, s * 0.14, -s * 0.34); ctx.closePath(); },
    fin, s * 0.22, -s * 0.1, -s * 0.38, () => rays(k, -s * 0.08, -s * 0.24, -Math.PI * 0.95, -Math.PI * 0.3, 5, s * 0.34, st));
  part(k, () => { ctx.moveTo(-s * 0.24, s * 0.22); ctx.quadraticCurveTo(-s * 0.26, s * 0.46, -s * 0.06, s * 0.46); ctx.quadraticCurveTo(0, s * 0.38, 0, s * 0.3); ctx.closePath(); },
    fin, s * 0.14, -s * 0.12, s * 0.36, () => rays(k, -s * 0.1, s * 0.2, Math.PI * 0.2, Math.PI * 0.9, 4, s * 0.3, st));
  part(k, () => ctx.ellipse(s * 0.06, 0, s * 0.42, s * 0.38, 0, 0, TAU), c, s * 0.44, s * 0.06, 0, () => {
    ctx.beginPath(); ctx.ellipse(s * 0.12, s * 0.3, s * 0.36, s * 0.16, 0, 0, TAU); ctx.fillStyle = light(c, 0.5); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-s * 0.46, 0, s * 0.28, s * 0.5, 0, 0, TAU); ctx.moveTo(-s * 0.26, 0); ctx.ellipse(-s * 0.46, 0, s * 0.2, s * 0.48, 0, 0, TAU, true); ctx.fillStyle = st; ctx.fill('evenodd'); k.stroke(k.lw * 0.7);
    gloss(k, -s * 0.04, -s * 0.26, s * 0.16, s * 0.05, -0.15, 0.4);
  });
  return { x: s * 0.12, y: -s * 0.04, size: s * 0.7, hat: [0.14, -0.36, 0.57] };
});

export const dolphin = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, dark } = k;
  const c = o.color || '#4f9fe8', belly = light(c, 0.72), flap = (o.wave || 0) * 0.2;
  ctx.translate(s * 0.02, s * 0.02); ctx.scale(1.12, 1.12);
  ctx.save(); ctx.translate(-s * 0.38, -s * 0.1); ctx.rotate(-0.3 + flap);              // flukes
  part(k, () => { ctx.moveTo(s * 0.04, 0); ctx.quadraticCurveTo(-s * 0.02, -s * 0.18, -s * 0.16, -s * 0.2); ctx.quadraticCurveTo(-s * 0.08, -s * 0.04, -s * 0.06, 0); ctx.quadraticCurveTo(-s * 0.08, s * 0.04, -s * 0.16, s * 0.2); ctx.quadraticCurveTo(-s * 0.02, s * 0.18, s * 0.04, 0); ctx.closePath(); }, dark(c, 0.1), s * 0.2, -s * 0.06, 0);
  ctx.restore();
  part(k, () => { ctx.moveTo(s * 0.04, -s * 0.28); ctx.quadraticCurveTo(-s * 0.02, -s * 0.42, -s * 0.14, -s * 0.44); ctx.quadraticCurveTo(-s * 0.1, -s * 0.34, -s * 0.16, -s * 0.22); ctx.closePath(); }, dark(c, 0.1), s * 0.2, -s * 0.05, -s * 0.35);
  const body = () => {
    ctx.moveTo(s * 0.34, s * 0.02); ctx.quadraticCurveTo(s * 0.52, s * 0.0, s * 0.52, s * 0.08); ctx.quadraticCurveTo(s * 0.52, s * 0.15, s * 0.34, s * 0.16);
    ctx.bezierCurveTo(s * 0.28, s * 0.36, -s * 0.12, s * 0.34, -s * 0.3, s * 0.04); ctx.lineTo(-s * 0.4, -s * 0.08);
    ctx.bezierCurveTo(-s * 0.22, -s * 0.22, -s * 0.1, -s * 0.36, s * 0.12, -s * 0.35); ctx.bezierCurveTo(s * 0.4, -s * 0.34, s * 0.42, -s * 0.1, s * 0.34, s * 0.02); ctx.closePath();
  };
  part(k, body, c, s * 0.42, s * 0.06, -s * 0.04, () => {
    ctx.beginPath(); ctx.ellipse(s * 0.12, s * 0.27, s * 0.42, s * 0.15, -0.1, 0, TAU); ctx.ellipse(s * 0.46, s * 0.14, s * 0.1, s * 0.05, 0, 0, TAU); ctx.fillStyle = belly; ctx.fill();
    gloss(k, s * 0.06, -s * 0.22, s * 0.15, s * 0.05, -0.1, 0.35);
  });
  ctx.save(); ctx.translate(s * 0.02, s * 0.16); ctx.rotate(-0.5 + flap);
  part(k, () => ctx.ellipse(-s * 0.08, 0, s * 0.11, s * 0.05, 0, 0, TAU), dark(c, 0.1), s * 0.1, -s * 0.08, 0);
  ctx.restore();
  return { x: s * 0.1, y: -s * 0.09, size: s * 0.56, eyeScale: 1.1, hat: [0.14, -0.33, 0.48] };
});

export const octopus = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, dark } = k;
  const c = o.color || '#ff6f9f', w = ph(o), sk = light(c, 0.6);
  for (const back of [true, false]) {
    for (let i = 0; i < 8; i++) {
      if ((i % 2 === 1) !== back) continue;
      const side = (i - 3.5) / 3.5, pts = [];
      let px = side * 0.2 * s, py = s * 0.04, h = Math.PI / 2 - side * 0.7;
      for (let j = 0; j <= 12; j++) {
        const u = j / 12;
        pts.push([px, py]);
        h -= (side >= 0 ? 1 : -1) * (0.05 + 0.28 * u * u) + Math.sin(w + i * 1.9 + u * 3) * 0.06;
        px += Math.cos(h) * s * 0.034; py += Math.sin(h) * s * 0.034;
      }
      tube(k, pts, s * 0.13, s * 0.045, back ? dark(c, 0.14) : c, back ? null : () => {
        for (let j = 3; j < 11; j += 2) { ctx.beginPath(); ctx.arc(pts[j][0], pts[j][1] + s * 0.02, s * 0.018 * (1.3 - j / 12), 0, TAU); ctx.fillStyle = sk; ctx.fill(); }
      });
    }
  }
  part(k, () => { ctx.moveTo(-s * 0.38, s * 0.1); ctx.bezierCurveTo(-s * 0.46, -s * 0.62, s * 0.46, -s * 0.62, s * 0.38, s * 0.1); ctx.quadraticCurveTo(0, s * 0.2, -s * 0.38, s * 0.1); ctx.closePath(); }, c, s * 0.42, 0, -s * 0.12, () => {
    for (const [dx, dy, r] of [[-0.2, -0.34, 0.04], [-0.08, -0.4, 0.028], [0.22, -0.36, 0.035], [-0.3, -0.2, 0.025]]) { ctx.beginPath(); ctx.arc(dx * s, dy * s, r * s, 0, TAU); ctx.fillStyle = withAlpha(sk, 0.8); ctx.fill(); }
    gloss(k, -s * 0.14, -s * 0.34, s * 0.1, s * 0.05, -0.6, 0.4);
  });
  return { x: s * 0.03, y: -s * 0.1, size: s * 0.7, hat: [0.02, -0.42, 0.69] };
});

export const crab = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, dark, outline, lw } = k;
  const c = o.color || '#ff5a3c', wave = o.wave || 0, legC = dark(c, 0.12);
  const limb = (pts, w) => { for (const [col, ww] of [[outline, w + lw * 2], [legC, w]]) { ctx.strokeStyle = col; ctx.lineWidth = ww; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s))); ctx.stroke(); } };
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) limb([[sx * 0.24, 0.16 + i * 0.05], [sx * (0.42 + i * 0.02), 0.12 + i * 0.07], [sx * (0.48 - i * 0.03), 0.34 + i * 0.06]], s * 0.05);
  for (const sx of [-1, 1]) {                                                              // claws
    const lift = (sx > 0 ? wave : -wave * 0.8) * 0.08, cx = sx * 0.44, cy = -0.28 - lift;
    limb([[sx * 0.26, 0.04], [sx * 0.46, -0.04], [cx, cy + 0.08]], s * 0.06);
    ctx.save(); ctx.translate(cx * s, cy * s); ctx.rotate(sx * (0.35 + 0.15 * wave));
    part(k, () => ctx.ellipse(0, s * 0.01, s * 0.12, s * 0.1, 0, 0, TAU), c, s * 0.13);
    ctx.rotate(-sx * (0.4 + 0.2 * Math.abs(wave)));
    part(k, () => ctx.ellipse(-sx * s * 0.05, -s * 0.1, s * 0.06, s * 0.1, sx * 0.3, 0, TAU), c, s * 0.1, -sx * s * 0.05, -s * 0.1);
    ctx.restore();
  }
  for (const sx of [-1, 1]) { limb([[sx * 0.14, -0.06], [sx * 0.145, -0.26]], s * 0.045); k.blob(sx * s * 0.145, -s * 0.31, s * 0.11, s * 0.115, '#ffffff'); }
  part(k, () => ctx.ellipse(0, s * 0.12, s * 0.4, s * 0.29, 0, 0, TAU), c, s * 0.42, 0, s * 0.12, () => {
    ctx.beginPath(); ctx.ellipse(0, s * 0.38, s * 0.34, s * 0.13, 0, 0, TAU); ctx.fillStyle = light(c, 0.45); ctx.fill();
    for (const [dx, dy] of [[-0.3, 0.02], [0.3, 0.04], [-0.33, 0.16]]) { ctx.beginPath(); ctx.arc(dx * s, dy * s, s * 0.025, 0, TAU); ctx.fillStyle = withAlpha(light(c, 0.5), 0.9); ctx.fill(); }
    gloss(k, -s * 0.12, -s * 0.02, s * 0.12, s * 0.04, -0.2, 0.35);
  });
  return { y: s * 0.1, size: s * 0.66, eyeY: -0.62, eyeSpacing: 0.22, brows: false, mouthY: 0.2, hat: [0, -0.4, 0.57] };
});

export const turtle = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, blob, light, dark } = k;
  const skin = o.skin || '#8fd460', shell = o.color || '#2f9e57', paddle = (o.wave || 0) * 0.25;
  blob(-s * 0.46, s * 0.12, s * 0.07, s * 0.04, skin, 0.3);                              // tail
  for (const [lx, r] of [[-0.3, 0.3], [0.14, -0.3]]) blob(lx * s, s * 0.28, s * 0.09, s * 0.12, dark(skin, 0.12), r - paddle);
  ctx.save(); ctx.translate(s * 0.2, -s * 0.04); ctx.rotate(-0.5);                        // neck
  blob(s * 0.05, 0, s * 0.14, s * 0.1, skin); ctx.restore();
  const dome = () => { ctx.moveTo(-s * 0.44, s * 0.18); ctx.bezierCurveTo(-s * 0.46, -s * 0.38, s * 0.3, -s * 0.38, s * 0.3, s * 0.18); ctx.closePath(); };
  part(k, dome, shell, s * 0.4, -s * 0.07, -s * 0.05, () => {
    const hex = (hx, hy, r) => { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU; ctx[i ? 'lineTo' : 'moveTo'](hx + Math.cos(a) * r, hy + Math.sin(a) * r); } ctx.closePath(); ctx.fillStyle = k.sh(light(shell, 0.3), r, hx, hy); ctx.fill(); k.stroke(k.lw * 0.75); };
    const r = s * 0.12, cx = -s * 0.07, cy = -s * 0.04;
    hex(cx, cy, r);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; hex(cx + Math.cos(a) * r * 1.8, cy + Math.sin(a) * r * 1.8, r); }
    gloss(k, -s * 0.2, -s * 0.18, s * 0.12, s * 0.05, -0.4, 0.35);
  });
  part(k, () => { ctx.roundRect(-s * 0.47, s * 0.12, s * 0.8, s * 0.1, s * 0.05); }, light(skin, 0.35), s * 0.3, 0, s * 0.17);
  for (const [lx, r] of [[-0.2, 0.2], [0.24, -0.2]]) blob(lx * s, s * 0.3, s * 0.09, s * 0.12, skin, r + paddle);
  blob(s * 0.28, -s * 0.18, s * 0.27, s * 0.25, skin);                                     // head
  return { x: s * 0.29, y: -s * 0.17, size: s * 0.56, hat: [0.28, -0.4, 0.51] };
});

export const whale = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, dark } = k;
  const c = o.color || '#3b7fd9', w = ph(o), spout = 1 + 0.12 * Math.sin(w), wc = '#9fe4ff';
  tube(k, [[s * 0.08, -s * 0.28], [s * 0.08, -s * 0.44 * spout]], s * 0.06, s * 0.1, wc);  // spout
  for (const [dx, dy, r] of [[-0.1, -0.5, 0.06], [0.26, -0.5, 0.06], [0.0, -0.58, 0.075], [0.16, -0.58, 0.075], [0.08, -0.62, 0.08]]) k.blob((0.08 + (dx - 0.08) * spout) * s, dy * s * spout, r * s, r * s, wc);
  ctx.save(); ctx.translate(-s * 0.38, -s * 0.16); ctx.rotate(1.1 + (o.wave || 0) * 0.15);  // flukes
  part(k, () => { ctx.moveTo(s * 0.06, 0); ctx.quadraticCurveTo(-s * 0.02, -s * 0.2, -s * 0.18, -s * 0.2); ctx.quadraticCurveTo(-s * 0.08, -s * 0.04, -s * 0.08, 0); ctx.quadraticCurveTo(-s * 0.08, s * 0.04, -s * 0.18, s * 0.2); ctx.quadraticCurveTo(-s * 0.02, s * 0.2, s * 0.06, 0); ctx.closePath(); }, dark(c, 0.08), s * 0.2, -s * 0.06, 0);
  ctx.restore();
  const body = () => {
    ctx.moveTo(s * 0.48, s * 0.04); ctx.bezierCurveTo(s * 0.48, -s * 0.34, s * 0.02, -s * 0.36, -s * 0.16, -s * 0.2);
    ctx.quadraticCurveTo(-s * 0.3, -s * 0.1, -s * 0.4, -s * 0.18); ctx.lineTo(-s * 0.36, -s * 0.06);
    ctx.bezierCurveTo(-s * 0.3, s * 0.24, s * 0.02, s * 0.36, s * 0.2, s * 0.34); ctx.bezierCurveTo(s * 0.4, s * 0.32, s * 0.48, s * 0.2, s * 0.48, s * 0.04); ctx.closePath();
  };
  part(k, body, c, s * 0.45, s * 0.1, 0, () => {
    ctx.beginPath(); ctx.ellipse(s * 0.14, s * 0.32, s * 0.38, s * 0.15, -0.06, 0, TAU); ctx.fillStyle = light(c, 0.7); ctx.fill();
    ctx.strokeStyle = withAlpha(dark(c, 0.1), 0.5); ctx.lineWidth = s * 0.018; ctx.beginPath();
    for (let i = 0; i < 4; i++) { const yy = s * (0.22 + i * 0.035); ctx.moveTo(-s * 0.06 + i * s * 0.03, yy); ctx.quadraticCurveTo(s * 0.18, yy + s * 0.03, s * 0.4 - i * s * 0.03, yy - s * 0.02); }
    ctx.stroke();
    gloss(k, s * 0.1, -s * 0.22, s * 0.16, s * 0.05, -0.08, 0.35);
  });
  ctx.save(); ctx.translate(-s * 0.02, s * 0.2); ctx.rotate(0.7 + (o.wave || 0) * 0.2);
  part(k, () => ctx.ellipse(s * 0.06, 0, s * 0.1, s * 0.05, 0, 0, TAU), dark(c, 0.08), s * 0.1, s * 0.06, 0);
  ctx.restore();
  return { x: s * 0.22, y: -s * 0.06, size: s * 0.62, hat: [0.3, -0.26, 0.46] };
});

export const seahorse = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, dark } = k;
  const c = o.color || '#ffb830', fin = light(c, 0.35), sway = (o.wave || 0) * 0.15;
  ctx.save(); ctx.translate(-s * 0.14, s * 0.02); ctx.rotate(sway);                      // back fin
  part(k, () => { ctx.moveTo(0, -s * 0.1); ctx.quadraticCurveTo(-s * 0.22, -s * 0.1, -s * 0.2, s * 0.1); ctx.quadraticCurveTo(-s * 0.1, s * 0.14, 0, s * 0.1); ctx.closePath(); }, fin, s * 0.14, -s * 0.1, 0, () => rays(k, 0, 0, Math.PI * 0.55, Math.PI * 1.35, 4, s * 0.24, light(c, 0.75)));
  ctx.restore();
  const pts = [];
  for (let j = 0; j <= 16; j++) { const u = j / 16, a = Math.PI + 0.45 - u * 5.2, r = 0.17 * (1 - 0.72 * u); pts.push([s * (0.08 + Math.cos(a) * r), s * (0.33 + Math.sin(a) * r)]); }
  tube(k, pts, s * 0.16, s * 0.04, c);
  part(k, () => ctx.ellipse(0, s * 0.08, s * 0.19, s * 0.24, -0.15, 0, TAU), c, s * 0.26, 0, s * 0.08, () => {
    ctx.beginPath(); ctx.ellipse(s * 0.12, s * 0.1, s * 0.11, s * 0.22, -0.15, 0, TAU); ctx.fillStyle = light(c, 0.55); ctx.fill();
    ctx.strokeStyle = withAlpha(dark(c, 0.15), 0.55); ctx.lineWidth = s * 0.015; ctx.beginPath();
    for (let i = 0; i < 5; i++) { const yy = s * (-0.06 + i * 0.065); ctx.moveTo(s * 0.02, yy); ctx.quadraticCurveTo(s * 0.12, yy + s * 0.03, s * 0.24, yy - s * 0.01); }
    ctx.stroke();
  });
  for (const [dx, dy] of [[-0.16, -0.46], [-0.04, -0.53], [0.09, -0.51]]) k.blob(dx * s, dy * s, s * 0.05, s * 0.05, dark(c, 0.05));
  tube(k, [[s * 0.14, -s * 0.2], [s * 0.28, -s * 0.18], [s * 0.38, -s * 0.15]], s * 0.16, s * 0.11, c);  // snout
  k.blob(0, -s * 0.24, s * 0.27, s * 0.26, c);                                             // head
  gloss(k, -s * 0.1, -s * 0.4, s * 0.08, s * 0.035, -0.4, 0.4);
  return { x: s * 0.02, y: -s * 0.23, size: s * 0.54, brows: false, hat: [0, -0.47, 0.51] };
});

export const jellyfish = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, outline } = k;
  const c = o.color || '#c08cff', w = ph(o), lc = light(c, 0.55);
  const glow = ctx.createRadialGradient(0, -s * 0.12, s * 0.1, 0, -s * 0.12, s * 0.62);
  glow.addColorStop(0, withAlpha(lc, 0.55)); glow.addColorStop(1, withAlpha(lc, 0));
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, -s * 0.12, s * 0.62, 0, TAU); ctx.fill();
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {                                                            // trailing tentacles
    const bx = s * (-0.28 + i * 0.112);
    ctx.beginPath(); ctx.moveTo(bx, s * 0.02);
    for (let j = 1; j <= 8; j++) { const u = j / 8; ctx.lineTo(bx + Math.sin(u * 6 - w + i) * s * 0.045 * u, s * (0.02 + u * 0.48)); }
    ctx.strokeStyle = withAlpha(outline, 0.55); ctx.lineWidth = s * 0.042; ctx.stroke();
    ctx.strokeStyle = withAlpha(lc, 0.95); ctx.lineWidth = s * 0.022; ctx.stroke();
  }
  for (const sx of [-1, 1]) {                                                              // frilly oral arms
    ctx.beginPath(); ctx.moveTo(sx * s * 0.07, 0);
    for (let j = 1; j <= 10; j++) { const u = j / 10; ctx.lineTo(s * (sx * 0.07 + Math.sin(u * 7 + w + sx) * 0.05), s * u * 0.36); }
    ctx.strokeStyle = withAlpha(outline, 0.45); ctx.lineWidth = s * 0.085; ctx.stroke();
    ctx.strokeStyle = withAlpha(mixHex(lc, '#ffffff', 0.3), 0.95); ctx.lineWidth = s * 0.06; ctx.stroke();
  }
  const bell = () => {
    ctx.moveTo(-s * 0.42, s * 0.04); ctx.bezierCurveTo(-s * 0.46, -s * 0.56, s * 0.46, -s * 0.56, s * 0.42, s * 0.04);
    for (let i = 0; i < 6; i++) { const x0 = s * (0.42 - (i + 1) * 0.14); ctx.quadraticCurveTo(x0 + s * 0.07, s * (0.13 + 0.01 * Math.sin(w + i)), x0, s * 0.04); }
    ctx.closePath();
  };
  ctx.globalAlpha = 0.9;
  part(k, bell, c, s * 0.46, 0, -s * 0.14, () => {
    ctx.beginPath(); ctx.ellipse(0, s * 0.04, s * 0.44, s * 0.1, 0, 0, TAU); ctx.fillStyle = withAlpha(lc, 0.9); ctx.fill();
    for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(s * (-0.33 + i * 0.11), s * 0.0, s * 0.02, 0, TAU); ctx.fillStyle = '#ffffff'; ctx.fill(); }
    gloss(k, -s * 0.18, -s * 0.3, s * 0.12, s * 0.05, -0.6, 0.55);
  });
  ctx.globalAlpha = 1;
  return { x: s * 0.02, y: -s * 0.17, size: s * 0.64, hat: [0, -0.4, 0.57] };
});

export const pufferfish = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light, dark } = k;
  const c = o.color || '#ffd23f', flap = (o.wave || 0) * 0.25, R = s * 0.4;
  ctx.save(); ctx.translate(-R, 0); ctx.rotate(flap);
  part(k, () => { ctx.moveTo(s * 0.04, 0); ctx.quadraticCurveTo(-s * 0.06, -s * 0.16, -s * 0.14, -s * 0.14); ctx.quadraticCurveTo(-s * 0.08, 0, -s * 0.14, s * 0.14); ctx.quadraticCurveTo(-s * 0.06, s * 0.16, s * 0.04, 0); ctx.closePath(); }, dark(c, 0.08), s * 0.14, -s * 0.06, 0, () => rays(k, s * 0.03, 0, Math.PI * 0.8, Math.PI * 1.2, 3, s * 0.18, light(c, 0.5)));
  ctx.restore();
  ctx.beginPath();                                                                          // spikes
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU + 0.1; if (Math.abs(Math.atan2(Math.sin(a), Math.cos(a) + 0.2)) < 0.5) continue; const c0 = Math.cos(a), s0 = Math.sin(a); ctx.moveTo(Math.cos(a - 0.14) * R * 0.95, Math.sin(a - 0.14) * R * 0.95); ctx.lineTo(c0 * (R + s * 0.1), s0 * (R + s * 0.1)); ctx.lineTo(Math.cos(a + 0.14) * R * 0.95, Math.sin(a + 0.14) * R * 0.95); ctx.closePath(); }
  ctx.fillStyle = light(c, 0.45); ctx.fill(); k.stroke();
  part(k, () => ctx.arc(0, 0, R, 0, TAU), c, R, 0, 0, () => {
    ctx.beginPath(); ctx.ellipse(s * 0.02, R * 0.72, R * 0.85, R * 0.5, 0, 0, TAU); ctx.fillStyle = light(c, 0.65); ctx.fill();
    for (const [dx, dy, r] of [[-0.2, -0.2, 0.035], [-0.06, -0.28, 0.03], [-0.26, -0.04, 0.03], [0.1, -0.3, 0.025]]) { ctx.beginPath(); ctx.arc(dx * s, dy * s, r * s, 0, TAU); ctx.fillStyle = withAlpha(dark(c, 0.45), 0.6); ctx.fill(); }
    gloss(k, -s * 0.14, -s * 0.18, s * 0.1, s * 0.045, -0.6, 0.45);
  });
  ctx.save(); ctx.translate(-s * 0.27, s * 0.16); ctx.rotate(-0.4 + flap);
  part(k, () => ctx.ellipse(-s * 0.07, 0, s * 0.08, s * 0.045, 0, 0, TAU), dark(c, 0.08), s * 0.08, -s * 0.07, 0);
  ctx.restore();
  return { x: s * 0.07, y: -s * 0.02, size: s * 0.72, hat: [0.04, -0.38, 0.57] };
});

export const starfish = (ctx, x, y, size, o = {}) => sea(ctx, x, y, size, o, (k) => {
  const { s, light } = k;
  const c = o.color || '#ff8a5c', R = s * 0.52, r = s * 0.27, rot = (o.wave || 0) * 0.08;
  const P = (a, d) => [Math.cos(a) * d, Math.sin(a) * d + s * 0.04];
  const path = () => {
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5 + rot, v0 = P(a - Math.PI / 5, r), v1 = P(a + Math.PI / 5, r);
      const t0 = P(a - 0.2, R * 1.02), t1 = P(a + 0.2, R * 1.02);
      if (!i) ctx.moveTo(...v0);
      ctx.bezierCurveTo(...P(a - 0.3, R * 0.75), ...t0, ...P(a, R));
      ctx.bezierCurveTo(...t1, ...P(a + 0.3, R * 0.75), ...v1);
    }
    ctx.closePath();
  };
  part(k, path, c, s * 0.5, 0, s * 0.04, () => {
    ctx.fillStyle = withAlpha(light(c, 0.6), 0.85);
    for (let i = 0; i < 5; i++) for (const d of [0.3, 0.38, 0.45]) { const [px, py] = P(-Math.PI / 2 + (i * TAU) / 5 + rot, s * d); ctx.beginPath(); ctx.arc(px, py, s * 0.022 * (1.3 - d), 0, TAU); ctx.fill(); }
    gloss(k, -s * 0.1, -s * 0.12, s * 0.08, s * 0.04, -0.6, 0.4);
  });
  return { x: 0, y: s * 0.06, size: s * 0.6, hat: [0, -0.42, 0.34] };
});
