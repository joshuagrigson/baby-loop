// Little Train — a smiling steam engine pulls open wagons of animal friends
// past layered, parallax countryside; wheels, rods and steam run on the beat.
// Loop maths: every layer moves an integer number of its own pattern periods
// per loop (far hills W/2, mid hills W, roadside 2W, foreground 4W), wheel
// turns per loop are integers, bounces / steam / waves are periodic in the beat.
// Pairs with Mountain King, Surprise, Hornpipes, Old MacDonald.
import { TAU, pulse, blink, withAlpha, mixHex, beatFrac } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { circle, face, confetti, makeConfetti } from '../draw.mjs';
import { critter } from '../critters/index.mjs';

const PASSENGERS = ['sheep', 'bunny', 'panda', 'frog', 'lion', 'koala', 'pig', 'fox', 'cow', 'monkey', 'cat', 'dog', 'elephant', 'duck', 'chick'];
const INK = '#2a2230';
const mod = (a, n) => ((a % n) + n) % n;
const lighten = (c, k) => mixHex(c, '#ffffff', k);
const darken = (c, k) => mixHex(c, '#1d1428', k);

// vertical "cylinder" gradient: highlight band near the top, shade at the bottom
function cyl(ctx, col, y0, y1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, darken(col, 0.1)); g.addColorStop(0.18, lighten(col, 0.45)); g.addColorStop(0.42, col); g.addColorStop(1, darken(col, 0.35));
  return g;
}
// lit disc gradient (light from the top-left)
function lit(ctx, col, x, y, r, k = 1) {
  const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r * 1.1);
  g.addColorStop(0, lighten(col, 0.4 * k)); g.addColorStop(0.5, col); g.addColorStop(1, darken(col, 0.25 * k));
  return g;
}
function outlined(ctx, fill, lw, stroke = INK) { ctx.fillStyle = fill; ctx.fill(); if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); } }
// outline drawn behind the fill: a clean silhouette for multi-circle shapes
function under(ctx, fill, lw, stroke = INK) { if (lw > 0) { ctx.lineWidth = lw * 2; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke(); } ctx.fillStyle = fill; ctx.fill(); }
// soft lit cloud built from separate lobes (no stray connecting edges)
function puffCloud(ctx, x, y, w) {
  const h = w * 0.36;
  const g = ctx.createLinearGradient(0, y - h, 0, y + h * 0.5); g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f4f8ff'); g.addColorStop(1, '#cfdcee');
  ctx.beginPath();
  for (const [dx, dy, rx, ry] of [[0, 0.15, 0.5, 0.36], [-0.24, 0.05, 0.22, 0.42], [0.2, -0.05, 0.26, 0.55], [-0.02, -0.28, 0.22, 0.55], [0.36, 0.12, 0.16, 0.34]]) { ctx.moveTo(x + dx * w + rx * w, y + dy * h); ctx.ellipse(x + dx * w, y + dy * h, rx * w, ry * h * 1.3, 0, 0, TAU); }
  ctx.fillStyle = g; ctx.fill();
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2)); }

// --- scenery ---------------------------------------------------------------------
// rolling hill silhouette, periodic in x with period P
const hillY = (x, base, amp, P, seed) => base - amp * (0.55 * Math.sin(TAU * x / P + seed) + 0.3 * Math.sin(TAU * 2 * x / P + seed * 2.3) + 0.15 * Math.sin(TAU * 3 * x / P + seed * 0.7));
function hills(ctx, W, floor, shift, base, amp, P, seed, top, bottom) {
  const g = ctx.createLinearGradient(0, base - amp, 0, floor);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.beginPath(); ctx.moveTo(0, floor);
  for (let x = 0; x <= W + 24; x += 24) ctx.lineTo(x, hillY(x + shift, base, amp, P, seed));
  ctx.lineTo(W + 24, floor); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
}
function roundTree(ctx, x, y, h, col, lw) {
  const tw = h * 0.12;
  rr(ctx, x - tw / 2, y - h * 0.45, tw, h * 0.45, tw * 0.3); outlined(ctx, cyl(ctx, '#8a5a3b', y - h * 0.45, y), lw, darken('#6b4a2b', 0.4));
  const r = h * 0.3, cy = y - h * 0.66;
  ctx.beginPath();
  for (const [dx, dy, k] of [[-0.55, 0.25, 0.7], [0.55, 0.25, 0.7], [0, -0.15, 1], [-0.3, -0.45, 0.6], [0.35, -0.4, 0.62]]) ctx.moveTo(x + dx * r + k * r, cy + dy * r), ctx.arc(x + dx * r, cy + dy * r, k * r, 0, TAU);
  under(ctx, lit(ctx, col, x, cy, r * 1.4), lw, darken(col, 0.55));
  for (const [dx, dy] of [[-0.35, -0.45], [0.1, -0.7], [-0.7, 0.05]]) circle(ctx, x + dx * r, cy + dy * r, r * 0.16, withAlpha('#ffffff', 0.22));
}
function pineTree(ctx, x, y, h, col, lw) {
  const tw = h * 0.1;
  rr(ctx, x - tw / 2, y - h * 0.2, tw, h * 0.2, tw * 0.3); outlined(ctx, '#7a4f33', lw, darken('#6b4a2b', 0.4));
  for (let i = 0; i < 3; i++) {
    const w = h * (0.42 - i * 0.09), by = y - h * (0.15 + i * 0.24), th = h * 0.36;
    ctx.beginPath(); ctx.moveTo(x - w, by); ctx.quadraticCurveTo(x - w * 0.2, by - th * 0.4, x, by - th); ctx.quadraticCurveTo(x + w * 0.2, by - th * 0.4, x + w, by); ctx.quadraticCurveTo(x, by + th * 0.14, x - w, by);
    const g = ctx.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, lighten(col, 0.25)); g.addColorStop(0.55, col); g.addColorStop(1, darken(col, 0.3));
    outlined(ctx, g, lw, darken(col, 0.55));
  }
}
function bush(ctx, x, y, h, col, lw) {
  ctx.beginPath();
  for (const [dx, dy, k] of [[-0.6, 0, 0.55], [0.6, 0, 0.55], [0, -0.25, 0.75]]) ctx.moveTo(x + dx * h + k * h, y + dy * h - k * h * 0.2), ctx.arc(x + dx * h, y + dy * h - k * h * 0.2, k * h, Math.PI, TAU);
  under(ctx, lit(ctx, col, x, y - h * 0.4, h * 1.2), lw, darken(col, 0.55));
}
function fence(ctx, x, y, w, h, lw) {
  const wood = '#f3e3c3', n = Math.max(2, Math.round(w / (h * 0.9)));
  for (const ry of [0.35, 0.7]) { rr(ctx, x, y - h * ry - h * 0.07, w, h * 0.14, h * 0.05); outlined(ctx, cyl(ctx, wood, y - h * ry - h * 0.07, y - h * ry + h * 0.07), lw, '#8a6a4a'); }
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const px = x + (i / n) * w - h * 0.08;
    ctx.moveTo(px, y); ctx.lineTo(px, y - h * 0.9); ctx.lineTo(px + h * 0.08, y - h); ctx.lineTo(px + h * 0.16, y - h * 0.9); ctx.lineTo(px + h * 0.16, y); ctx.closePath();
  }
  outlined(ctx, '#fbf1dc', lw, '#8a6a4a');
}
function barn(ctx, x, y, h, lw) {
  const w = h * 1.1, red = '#d9423a', wallTop = y - h * 0.62;
  ctx.beginPath(); ctx.rect(x - w / 2, wallTop, w, h * 0.62); outlined(ctx, cyl(ctx, red, wallTop, y), lw);
  ctx.beginPath(); ctx.moveTo(x - w * 0.58, wallTop + h * 0.02); ctx.lineTo(x - w * 0.4, y - h * 0.86); ctx.lineTo(x, y - h); ctx.lineTo(x + w * 0.4, y - h * 0.86); ctx.lineTo(x + w * 0.58, wallTop + h * 0.02); ctx.closePath();
  outlined(ctx, lit(ctx, '#7a2e35', x, y - h * 0.85, w * 0.6), lw);
  const dw = w * 0.36, dh = h * 0.4;
  rr(ctx, x - dw / 2, y - dh, dw, dh, 2); outlined(ctx, '#fff6e6', lw * 0.8);
  rr(ctx, x - dw / 2 + lw * 2, y - dh + lw * 2, dw - lw * 4, dh - lw * 2, 2); ctx.fillStyle = cyl(ctx, '#c23a33', y - dh, y); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x - dw / 2 + lw * 2, y - dh + lw * 2); ctx.lineTo(x + dw / 2 - lw * 2, y); ctx.moveTo(x + dw / 2 - lw * 2, y - dh + lw * 2); ctx.lineTo(x - dw / 2 + lw * 2, y);
  ctx.strokeStyle = '#fff6e6'; ctx.lineWidth = lw * 1.4; ctx.stroke();
  rr(ctx, x - w * 0.1, y - h * 0.8, w * 0.2, h * 0.14, 3); outlined(ctx, '#fff6e6', lw * 0.8);
  rr(ctx, x - w * 0.07, y - h * 0.78, w * 0.14, h * 0.1, 2); ctx.fillStyle = '#5a2a30'; ctx.fill();
}
function house(ctx, x, y, h, lw, roof = '#3b82c4') {
  const w = h * 0.95, wallTop = y - h * 0.55;
  rr(ctx, x + w * 0.18, y - h * 1.02, w * 0.14, h * 0.3, 2); outlined(ctx, '#b86b4b', lw);
  ctx.beginPath(); ctx.rect(x - w / 2, wallTop, w, h * 0.55); outlined(ctx, cyl(ctx, '#fff1d6', wallTop, y), lw);
  ctx.beginPath(); ctx.moveTo(x - w * 0.62, wallTop + h * 0.03); ctx.lineTo(x, y - h * 1.0); ctx.lineTo(x + w * 0.62, wallTop + h * 0.03); ctx.closePath();
  outlined(ctx, lit(ctx, roof, x, y - h * 0.8, w * 0.6), lw);
  rr(ctx, x + w * 0.08, y - h * 0.34, w * 0.2, h * 0.34, w * 0.1); outlined(ctx, cyl(ctx, '#e0833a', y - h * 0.34, y), lw * 0.8);
  rr(ctx, x - w * 0.34, y - h * 0.42, w * 0.26, h * 0.22, 3); outlined(ctx, '#ffe79a', lw * 0.8);
  ctx.beginPath(); ctx.moveTo(x - w * 0.21, y - h * 0.42); ctx.lineTo(x - w * 0.21, y - h * 0.2); ctx.moveTo(x - w * 0.34, y - h * 0.31); ctx.lineTo(x - w * 0.08, y - h * 0.31); ctx.strokeStyle = INK; ctx.lineWidth = lw * 0.7; ctx.stroke();
}
function flower(ctx, x, y, r, col) {
  ctx.strokeStyle = '#3f9a45'; ctx.lineWidth = r * 0.35; ctx.beginPath(); ctx.moveTo(x, y + r * 3); ctx.lineTo(x, y); ctx.stroke();
  for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; circle(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, col); }
  circle(ctx, x, y, r * 0.6, '#ffd84a');
}
function grassTuft(ctx, x, y, h, col) {
  ctx.fillStyle = col; ctx.beginPath();
  for (const [dx, lean] of [[-0.3, -0.5], [0, 0.1], [0.3, 0.5]]) { ctx.moveTo(x + dx * h - h * 0.1, y); ctx.quadraticCurveTo(x + dx * h, y - h * 0.5, x + dx * h + lean * h * 0.5, y - h); ctx.quadraticCurveTo(x + dx * h + h * 0.05, y - h * 0.5, x + dx * h + h * 0.1, y); }
  ctx.fill();
}

// --- the train ---------------------------------------------------------------------
function wheel(ctx, x, y, r, angle, hub, lw) {
  circle(ctx, x, y, r, '#3a3440', INK, lw);
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r); g.addColorStop(0, lighten(hub, 0.35)); g.addColorStop(1, darken(hub, 0.2));
  circle(ctx, x, y, r * 0.8, g);
  ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
  ctx.strokeStyle = darken(hub, 0.45); ctx.lineWidth = r * 0.12; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let a = 0; a < 8; a++) { const c = Math.cos(a * TAU / 8), sn = Math.sin(a * TAU / 8); ctx.moveTo(c * r * 0.2, sn * r * 0.2); ctx.lineTo(c * r * 0.76, sn * r * 0.76); }
  ctx.stroke();
  ctx.restore();
  circle(ctx, x, y, r * 0.8, null, darken(hub, 0.45), r * 0.08);
  circle(ctx, x, y, r * 0.24, lit(ctx, '#ffd23f', x, y, r * 0.24), INK, lw * 0.6);
  ctx.beginPath(); ctx.arc(x, y, r * 0.9, -Math.PI * 0.85, -Math.PI * 0.45); ctx.strokeStyle = withAlpha('#ffffff', 0.35); ctx.lineWidth = r * 0.09; ctx.stroke();
}
function rod(ctx, x0, y0, x1, y1, w, col) {
  ctx.lineCap = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = w * 1.6; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function puff(ctx, x, y, r, a, warm) {
  if (a <= 0.01) return;
  // one union path + one lit gradient; globalAlpha fades it (no double-blending where lobes overlap)
  const g = ctx.createRadialGradient(x - r * 0.4, y - r * 0.5, r * 0.1, x, y, r * 1.35);
  g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f6f9ff'); g.addColorStop(1, warm);
  ctx.beginPath();
  for (const [dx, dy, k] of [[-0.55, 0.15, 0.7], [0.5, 0.2, 0.72], [0, -0.1, 1]]) { ctx.moveTo(x + dx * r + r * k, y + dy * r); ctx.arc(x + dx * r, y + dy * r, r * k, 0, TAU); }
  ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
}

export default {
  id: 'train',
  name: 'Little Train',
  ageBand: '6–36 months',
  kind: 'loop',
  defaults: { bpm: 108, music: 'dance', palette: 'primary' },

  init({ W, H, rng, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'primary', options.theme || null);
    const hat = options.hat !== undefined ? options.hat : pal.theme?.hat || 'none';
    const carCols = pal.pops.filter((c) => c.toLowerCase() !== '#ffffff');
    const pool = rng.shuffle(PASSENGERS);
    const n = options.cars || 3;
    const cars = Array.from({ length: n }, (_, i) => ({
      color: carCols.length ? carCols[i % carCols.length] : ['#ff2e63', '#08d9d6', '#ffb400'][i % 3],
      riders: [0, 1].map((j) => ({ kind: pool[(i * 2 + j + 1) % pool.length], blinkOffset: rng.range(0, 3), off: (i + j) % 2 ? 0.5 : 0, lookPhase: rng.range(0, TAU) })),
    }));
    const driver = pool[0];
    // roadside strip, 2W wide: trees, pines, bushes, one barn, one little house, fences
    const items = [];
    const slots = 13;
    for (let i = 0; i < slots; i++) {
      const x = ((i + rng.range(-0.2, 0.2)) / slots) * W * 2;
      const type = i === 2 ? 'barn' : i === 8 ? 'house' : rng.pick(['round', 'round', 'pine', 'pine', 'bush']);
      items.push({ x, type, h: H * (type === 'barn' ? 0.24 : type === 'house' ? 0.21 : type === 'bush' ? 0.05 : rng.range(0.24, 0.34)), col: rng.pick(['#4fb04a', '#5dbb4f', '#3f9f53', '#6cc24a']), z: rng.range(0, 1) });
      if (i === 2 || i === 8) items.push({ x: x + W * 0.1, type: 'fence', w: W * 0.2, h: H * 0.055, z: 2 });
    }
    items.sort((a, b) => a.z - b.z);
    const fg = Array.from({ length: 16 }, (_, i) => ({ x: (i / 16 + rng.range(-0.02, 0.02)) * W * 4 / 3, flower: i % 3 === 0, col: rng.pick(['#ff8fb1', '#ffffff', '#ffd166', '#c5a3ff', '#ff6b6b']), y: rng.range(0.93, 0.99), s: rng.range(0.8, 1.2) }));
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 10) : [];
    return { pal, hat, cars, driver, items, fg, pieces, engine: pal.theme ? pal.bg : '#e63946', sky: pal.theme ? mixHex('#6ec6ff', pal.bgs[0], 0.3) : '#6ec6ff' };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds, bpm }) {
    // two-/four-beat motions must divide the loop's beat count (3/4 tunes, odd bars)
    const nb = Math.max(1, Math.round((loopSeconds * bpm) / 60));
    const P4 = nb % 4 === 0 ? 4 : nb % 2 === 0 ? 2 : 1, P2 = nb % 2 === 0 ? 2 : 1;
    const lw = H * 0.004;
    // sky + sun
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    sky.addColorStop(0, s.sky); sky.addColorStop(0.7, lighten(s.sky, 0.6)); sky.addColorStop(1, lighten(s.sky, 0.8));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H * 0.6);
    const sx = W * 0.87, sy = H * 0.15, sr = H * 0.075;
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3.2);
    glow.addColorStop(0, withAlpha('#fff3b0', 0.8)); glow.addColorStop(1, withAlpha('#fff3b0', 0));
    ctx.fillStyle = glow; ctx.fillRect(sx - sr * 3.2, sy - sr * 3.2, sr * 6.4, sr * 6.4);
    circle(ctx, sx, sy, sr, lit(ctx, '#ffd84a', sx, sy, sr, 0.8));
    // clouds: far away, they only sway (periodic)
    for (let i = 0; i < 3; i++) {
      const cw = W * (0.15 + 0.04 * (i % 2));
      puffCloud(ctx, W * (0.12 + i * 0.27) + Math.sin(TAU * phase + i * 1.7) * W * 0.015, H * (0.13 + 0.07 * (i % 2)), cw);
    }
    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);

    // parallax hills: far (W/2 per loop, period W/2) and mid (W per loop, period W)
    hills(ctx, W, H * 0.62, phase * W * 0.5, H * 0.5, H * 0.07, W * 0.5, 0.4, '#b4e0c4', '#9fd4ab');
    const midShift = phase * W;
    hills(ctx, W, H * 0.67, midShift, H * 0.59, H * 0.06, W, 1.3, '#93d477', '#6cbc5c');
    for (let i = 0; i < 9; i++) {              // tiny trees dotted on the mid hills
      const x = mod(W * (i / 9 + 0.03) - midShift, W);
      const y = hillY(x + midShift, H * 0.59, H * 0.06, W, 1.3) + H * 0.005;
      roundTree(ctx, x, y, H * 0.06, '#5aa65a', 0);
    }
    // near ground
    const gy = H * 0.66;
    const gg = ctx.createLinearGradient(0, gy, 0, H); gg.addColorStop(0, '#7fca63'); gg.addColorStop(1, '#4e9f45');
    ctx.fillStyle = gg; ctx.fillRect(0, gy, W, H - gy);

    // roadside strip, scrolls exactly once (2W) per loop
    const roadY = H * 0.7, span = W * 2, margin = W * 0.4;
    for (const it of s.items) {
      const x = mod(it.x - phase * span, span) - margin;
      if (it.type === 'fence') { if (x < W + it.w && x > -it.w) fence(ctx, x, roadY + H * 0.005, it.w, it.h, lw * 0.8); continue; }
      if (x < -W * 0.2 || x > W * 1.2) continue;
      const y = roadY - it.z * H * 0.02;
      ctx.fillStyle = 'rgba(30,60,20,0.18)'; ctx.beginPath(); ctx.ellipse(x, y, it.h * 0.35, it.h * 0.06, 0, 0, TAU); ctx.fill();
      if (it.type === 'round') roundTree(ctx, x, y, it.h, it.col, lw);
      else if (it.type === 'pine') pineTree(ctx, x, y, it.h, darken(it.col, 0.15), lw);
      else if (it.type === 'bush') bush(ctx, x, y, it.h, it.col, lw);
      else if (it.type === 'barn') barn(ctx, x, y, it.h, lw);
      else house(ctx, x, y, it.h, lw);
    }

    // track: ballast, sleepers (integer count per 2W so the loop closes), rails
    const trackY = H * 0.86;
    const bal = ctx.createLinearGradient(0, trackY - H * 0.03, 0, trackY + H * 0.05);
    bal.addColorStop(0, '#b8a58a'); bal.addColorStop(1, '#8c7a63');
    ctx.fillStyle = bal; ctx.beginPath(); ctx.roundRect(-10, trackY - H * 0.02, W + 20, H * 0.065, H * 0.02); ctx.fill();
    const nSl = Math.round(span / (H * 0.075)), sp = span / nSl, off = mod(phase * span, sp);
    ctx.beginPath();                            // all sleepers as one path: one fill, one stroke
    for (let x = -off - sp; x < W + sp; x += sp) ctx.roundRect(x, trackY - H * 0.008, sp * 0.55, H * 0.035, H * 0.006);
    outlined(ctx, cyl(ctx, '#8a5a3b', trackY - H * 0.008, trackY + H * 0.027), lw * 0.6, '#4a2e1f');
    for (const ry of [trackY - H * 0.006, trackY + H * 0.018]) {
      const rg = ctx.createLinearGradient(0, ry - H * 0.006, 0, ry + H * 0.006);
      rg.addColorStop(0, '#e8eef5'); rg.addColorStop(0.5, '#9aa3b2'); rg.addColorStop(1, '#5a6272');
      ctx.fillStyle = rg; ctx.fillRect(0, ry - H * 0.006, W, H * 0.012);
    }

    // --- the train (travelling right; engine at the front) ---
    const n = s.cars.length;
    const u = Math.min(H * 0.12, W * 0.78 / (n * 2.68 + 3.1));     // car body height
    const carW = u * 2.4, gap = u * 0.28, L = u * 3.1;             // engine length
    const total = L + n * (carW + gap);
    const ex = W * 0.5 + total / 2 - L;
    const Rd = u * 0.46, rc = u * 0.34, rp = u * 0.28;
    // wheel turns per loop: integer, close to rolling without slipping
    const turnsD = Math.max(1, Math.round(span / (TAU * Rd))), turnsC = Math.max(1, Math.round(span / (TAU * rc))), turnsP = Math.max(1, Math.round(span / (TAU * rp)));
    const aD = TAU * turnsD * phase, aC = TAU * turnsC * phase, aP = TAU * turnsP * phase;
    const bounceAt = (d) => Math.abs(Math.sin(Math.PI * (beat - d))) * H * 0.008;

    // soft ground shadow under the whole train
    const shg = ctx.createRadialGradient(W * 0.5, 0, 0, W * 0.5, 0, total * 0.55);
    shg.addColorStop(0, 'rgba(20,20,30,0.28)'); shg.addColorStop(1, 'rgba(20,20,30,0)');
    ctx.save(); ctx.translate(0, trackY + H * 0.01); ctx.scale(1, 0.06); ctx.fillStyle = shg; ctx.beginPath(); ctx.arc(W * 0.5, 0, total * 0.55, 0, TAU); ctx.fill(); ctx.restore();

    // wagons
    s.cars.forEach((c, i) => {
      const x = ex - (i + 1) * (carW + gap) + gap * 0.5;
      const yb = trackY - rc * 1.35 - bounceAt(0.15 * (i + 1));
      const top = yb - u;
      // coupling to the vehicle in front
      rr(ctx, x + carW - u * 0.05, yb - u * 0.28, gap + u * 0.12, u * 0.1, u * 0.05); outlined(ctx, '#4a4452', lw * 0.7);
      circle(ctx, x + carW + gap * 0.5, yb - u * 0.23, u * 0.07, '#6a6474', INK, lw * 0.7);
      // riders: heads + shoulders above the rim; arms pop up when they wave
      c.riders.forEach((r, j) => {
        const b = beat + r.off + i * 0.25;
        const hop = Math.abs(Math.sin(Math.PI * b));
        const size = u * 1.18;
        const rx = x + carW * (0.27 + j * 0.46), ry = top + u * 0.08 - size * 0.4 - hop * u * 0.1;   // paws rest on the rim
        critter(ctx, r.kind, rx, ry, size, {
          squash: 0.25 * (1 - hop) - 0.1 * hop, tilt: Math.sin((TAU * beat) / P4 + Math.PI * r.off) * 0.1,
          blink: blink(t, loopSeconds, 3.3, r.blinkOffset), mouth: 0.3 + 0.55 * pulse(beat / P2 + r.off),
          look: [0.5 + 0.4 * Math.sin(TAU * phase * 2 + r.lookPhase), 0.1], brow: 0.35 + 0.6 * hop,
          wave: 0.25 + 0.75 * Math.sin((TAU * beat) / P4 + Math.PI * r.off), hat: s.hat,
        });
      });
      // body: rounded tub, rim trim, inset panel, rivets
      rr(ctx, x, top, carW, u, u * 0.2); outlined(ctx, cyl(ctx, c.color, top, yb), lw);
      rr(ctx, x + u * 0.16, top + u * 0.28, carW - u * 0.32, u * 0.52, u * 0.12); ctx.lineWidth = lw * 0.9; ctx.strokeStyle = withAlpha(lighten(c.color, 0.6), 0.9); ctx.stroke();
      const star = (cx2, cy2, R) => { ctx.beginPath(); for (let k = 0; k < 10; k++) { const rr3 = k % 2 ? R * 0.45 : R, a = -Math.PI / 2 + (k * Math.PI) / 5; ctx.lineTo(cx2 + Math.cos(a) * rr3, cy2 + Math.sin(a) * rr3); } ctx.closePath(); outlined(ctx, lit(ctx, '#ffd23f', cx2, cy2, R), lw * 0.7); };
      star(x + carW / 2, top + u * 0.54, u * 0.2);
      rr(ctx, x - u * 0.08, top - u * 0.08, carW + u * 0.16, u * 0.2, u * 0.1); outlined(ctx, cyl(ctx, '#ffd23f', top - u * 0.08, top + u * 0.12), lw);
      for (let k = 0; k < 6; k++) circle(ctx, x + u * 0.12 + (k / 5) * (carW - u * 0.24), yb - u * 0.1, u * 0.03, withAlpha(darken(c.color, 0.5), 0.7));
      // chassis + wheels
      rr(ctx, x + u * 0.1, yb - u * 0.05, carW - u * 0.2, u * 0.16, u * 0.06); outlined(ctx, '#3a3440', lw * 0.7);
      for (const f of [0.25, 0.75]) wheel(ctx, x + carW * f, trackY - rc, rc, aC + f, '#e9e4dc', lw);
    });

    // engine
    const eb = bounceAt(0);
    const yb = trackY - Rd * 1.3 - eb;
    const E = s.engine, trim = '#ffd23f';
    // frame
    rr(ctx, ex - u * 0.05, yb - u * 0.12, L * 0.98, u * 0.3, u * 0.08); outlined(ctx, '#3a3440', lw);
    // cab
    const cabX = ex + L * 0.02, cabW = L * 0.36, cabTop = yb - u * 1.75;
    rr(ctx, cabX, cabTop, cabW, u * 1.75, u * 0.12); outlined(ctx, cyl(ctx, E, cabTop, yb), lw);
    const wx = cabX + cabW * 0.2, wy = cabTop + u * 0.3, ww = cabW * 0.62, wh = u * 0.66;
    rr(ctx, wx, wy, ww, wh, u * 0.14); outlined(ctx, '#fff6dd', lw);
    ctx.save(); rr(ctx, wx + lw * 1.5, wy + lw * 1.5, ww - lw * 3, wh - lw * 3, u * 0.1); ctx.clip();
    const glass = ctx.createLinearGradient(0, wy, 0, wy + wh); glass.addColorStop(0, '#bfe9ff'); glass.addColorStop(1, '#e8f7ff');
    ctx.fillStyle = glass; ctx.fillRect(wx, wy, ww, wh);
    critter(ctx, s.driver, wx + ww * 0.5, wy + wh * 0.62 - bounceAt(0.5) * 0.6, wh * 1.15, {
      blink: blink(t, loopSeconds, 3.7, 1.1), mouth: 0.25 + 0.5 * pulse(beat / P2 + 0.5), look: [0.8, 0.15], brow: 0.6, wave: -0.6,
      hat: s.hat !== 'none' ? s.hat : null, tilt: Math.sin((TAU * beat) / P4) * 0.06,
    });
    ctx.fillStyle = withAlpha('#ffffff', 0.28); ctx.beginPath(); ctx.moveTo(wx + ww * 0.55, wy); ctx.lineTo(wx + ww * 0.8, wy); ctx.lineTo(wx + ww * 0.35, wy + wh); ctx.lineTo(wx + ww * 0.1, wy + wh); ctx.closePath(); ctx.fill();
    ctx.restore();
    rr(ctx, cabX - u * 0.1, cabTop - u * 0.16, cabW + u * 0.2, u * 0.22, u * 0.1); outlined(ctx, cyl(ctx, darken(E, 0.35), cabTop - u * 0.16, cabTop + u * 0.06), lw);
    rr(ctx, cabX + u * 0.05, yb - u * 0.5, cabW - u * 0.1, u * 0.1, u * 0.05); ctx.fillStyle = trim; ctx.fill();
    // boiler (cylinder) with gold bands
    const bx = cabX + cabW - u * 0.05, bw = L * 0.6, bTop = yb - u * 1.1;
    rr(ctx, bx, bTop, bw, u * 1.1, u * 0.3); outlined(ctx, cyl(ctx, E, bTop, yb), lw);
    for (const f of [0.3, 0.62]) { ctx.fillStyle = cyl(ctx, trim, bTop, yb); ctx.fillRect(bx + bw * f, bTop + lw * 0.5, u * 0.1, u * 1.1 - lw); }
    // dome + chimney
    const dx = bx + bw * 0.4;
    ctx.beginPath(); ctx.ellipse(dx, bTop, u * 0.26, u * 0.24, 0, Math.PI, TAU); ctx.closePath(); outlined(ctx, lit(ctx, trim, dx, bTop - u * 0.1, u * 0.26), lw);
    const cx = bx + bw * 0.7, cTop = bTop - u * 0.72;
    ctx.beginPath(); ctx.moveTo(cx - u * 0.14, bTop + lw); ctx.lineTo(cx - u * 0.16, cTop + u * 0.2); ctx.lineTo(cx - u * 0.27, cTop); ctx.lineTo(cx + u * 0.27, cTop); ctx.lineTo(cx + u * 0.16, cTop + u * 0.2); ctx.lineTo(cx + u * 0.14, bTop + lw); ctx.closePath();
    const cg = ctx.createLinearGradient(cx - u * 0.27, 0, cx + u * 0.27, 0); cg.addColorStop(0, '#6a6474'); cg.addColorStop(0.35, '#8e889a'); cg.addColorStop(1, '#2e2a36');
    outlined(ctx, cg, lw);
    rr(ctx, cx - u * 0.31, cTop - u * 0.1, u * 0.62, u * 0.14, u * 0.06); outlined(ctx, cyl(ctx, trim, cTop - u * 0.1, cTop + u * 0.04), lw);
    // cylinder + running gear
    const axY = trackY - Rd, d1 = ex + L * 0.16, d2 = ex + L * 0.4, pony = ex + L * 0.78;
    rr(ctx, ex + L * 0.56, axY - u * 0.34, L * 0.17, u * 0.34, u * 0.1); outlined(ctx, cyl(ctx, '#4a4452', axY - u * 0.34, axY), lw);
    wheel(ctx, pony, trackY - rp, rp, aP, '#e9e4dc', lw);
    wheel(ctx, d1, axY, Rd, aD, E, lw);
    wheel(ctx, d2, axY, Rd, aD + 0.4, E, lw);
    const pr = Rd * 0.55, p1 = [d1 + Math.cos(aD) * pr, axY + Math.sin(aD) * pr], p2 = [d2 + Math.cos(aD) * pr, axY + Math.sin(aD) * pr];
    rod(ctx, p1[0], p1[1], p2[0], p2[1], u * 0.08, '#c9ccd6');
    rod(ctx, p2[0], p2[1], ex + L * 0.62, axY - u * 0.17, u * 0.07, trim);
    for (const p of [p1, p2]) circle(ctx, p[0], p[1], u * 0.06, '#c9ccd6', INK, lw * 0.7);
    // cow-catcher + buffer beam
    const fx = bx + bw;
    ctx.beginPath(); ctx.moveTo(fx - u * 0.35, yb + u * 0.12); ctx.lineTo(fx + u * 0.2, yb + u * 0.12); ctx.lineTo(fx + u * 0.42, trackY - u * 0.05); ctx.lineTo(fx - u * 0.35, trackY - u * 0.05); ctx.closePath();
    outlined(ctx, cyl(ctx, trim, yb, trackY), lw);
    ctx.save(); ctx.clip(); ctx.strokeStyle = darken(trim, 0.4); ctx.lineWidth = lw * 0.8;
    for (let k = 0; k < 5; k++) { ctx.beginPath(); ctx.moveTo(fx - u * 0.25 + k * u * 0.15, yb + u * 0.12); ctx.lineTo(fx - u * 0.1 + k * u * 0.15, trackY); ctx.stroke(); }
    ctx.restore();
    rr(ctx, fx - u * 0.3, yb - u * 0.05, u * 0.62, u * 0.2, u * 0.06); outlined(ctx, cyl(ctx, '#e63946', yb - u * 0.05, yb + u * 0.15), lw);
    // big friendly face on the smokebox front
    const fcx = fx - u * 0.02, fcy = yb - u * 0.58, fr = u * 0.66;
    ctx.beginPath(); ctx.ellipse(fcx, fcy, fr * 0.8, fr, 0, 0, TAU); outlined(ctx, cyl(ctx, darken(E, 0.25), fcy - fr, fcy + fr), lw);
    ctx.beginPath(); ctx.ellipse(fcx + u * 0.03, fcy, fr * 0.7, fr * 0.9, 0, 0, TAU); outlined(ctx, lit(ctx, '#dde4ee', fcx, fcy, fr * 0.9), lw);
    face(ctx, { x: fcx + u * 0.05, y: fcy + u * 0.02, size: fr * 1.55, blink: blink(t, loopSeconds, 3, 0.7), mouth: 0.25 + 0.55 * pulse(beat / P2), look: [0.35, 0.1], brow: 0.4 + 0.4 * pulse(beat), cheeks: true, eyeSpacing: 0.21, eyeScale: 1.12 });
    // lamp
    const lx = fcx + u * 0.02, ly = fcy - fr - u * 0.12;
    rr(ctx, lx - u * 0.12, ly - u * 0.1, u * 0.24, u * 0.22, u * 0.05); outlined(ctx, '#3a3440', lw * 0.8);
    circle(ctx, lx, ly + u * 0.01, u * 0.07, lit(ctx, '#fff3b0', lx, ly, u * 0.07), INK, lw * 0.6);

    // steam: a puff per beat, drifting back and up, growing and fading
    const N = 5;
    for (let k = N - 1; k >= 0; k--) {
      const f = (beatFrac(beat) + k) / N;          // 0..1 over N beats, periodic in the beat
      const a = Math.min(1, f * 10) * Math.pow(1 - f, 1.3) * 0.95;
      const px = cx - f * W * 0.22 - Math.sin(f * 3.5) * u * 0.2, py = cTop - u * 0.15 - f * H * 0.24 - eb;
      puff(ctx, px, py, u * (0.22 + f * 0.7), a, '#c6d4e6');
    }

    // foreground grass + flowers (4W per loop, period 4W/3 so the loop closes)
    const fspan = W * 4 / 3;
    for (const f of s.fg) {
      const x = mod(f.x - phase * W * 4, fspan) - W * 0.15;
      const y = H * f.y;
      grassTuft(ctx, x, y + H * 0.01, H * 0.04 * f.s, '#3f9a45');
      if (f.flower) flower(ctx, x + H * 0.01, y - H * 0.035 * f.s, H * 0.013 * f.s, f.col);
    }
    // vignette (as draw.vignette, but only the ring outside the clear centre is filled)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,10,30,0.12)');
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(W / 2 + H * 0.5, H / 2); ctx.arc(W / 2, H / 2, H * 0.5, 0, TAU, true);
    ctx.fillStyle = v; ctx.fill('evenodd');
  },
};
