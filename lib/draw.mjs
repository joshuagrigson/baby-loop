// Pure Canvas2D drawing vocabulary shared by every scene. No Node imports — this
// file runs unchanged in the browser preview and in the headless renderer.
import { TAU, clamp, lerp, withAlpha, mixHex } from './easing.mjs';
import { backdrop } from './palette.mjs';

export const FONT_DISPLAY = '"Fredoka", "Baloo 2", "DejaVu Sans", "Liberation Sans", Arial, sans-serif';
export const FONT_EMOJI = '"Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif';

export function circle(ctx, x, y, r, fill, stroke, lw = 0) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, TAU);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function ellipse(ctx, x, y, rx, ry, fill, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function roundRect(ctx, x, y, w, h, r, fill, stroke, lw = 0) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function star(ctx, x, y, rOuter, rInner, points, fill, stroke, lw = 0, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = rot + (i * Math.PI) / points;
    const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

export function heart(ctx, x, y, size, fill, stroke, lw = 0) {
  const s = size / 2;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.9);
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.9, y - s * 1.2, x, y - s * 0.45);
  ctx.bezierCurveTo(x + s * 0.9, y - s * 1.2, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
}

export function triangle(ctx, x, y, size, fill, stroke, lw = 0) {
  const h = size * 0.866;
  ctx.beginPath();
  ctx.moveTo(x, y - h / 2);
  ctx.lineTo(x + size / 2, y + h / 2);
  ctx.lineTo(x - size / 2, y + h / 2);
  ctx.closePath();
  ctx.lineJoin = 'round';
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke && lw > 0) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function square(ctx, x, y, size, fill, stroke, lw = 0) {
  roundRect(ctx, x - size / 2, y - size / 2, size, size, size * 0.14, fill, stroke, lw);
}

// --- Shading -----------------------------------------------------------------
// Soft studio light from the top-left: a radial gradient that lifts the
// highlight, keeps the body colour in the middle and deepens the far edge.
export function shaded(ctx, hex, r, cx = 0, cy = 0, strength = 1) {
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.05, cx, cy, r * 1.15);
  g.addColorStop(0, mixHex(hex, '#ffffff', 0.42 * strength));
  g.addColorStop(0.45, hex);
  g.addColorStop(1, mixHex(hex, '#3a1d3a', 0.28 * strength));
  return g;
}

// Atmosphere behind a scene: a lit field (lighter centre), slow bokeh discs and
// a gentle vignette. Periodic in `phase`. Replaces flat colour fills.
export function atmosphere(ctx, W, H, { bg, pops = [], phase = 0, bokeh = 14, vignette = 0.22, rng = null } = {}) {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.42, H * 0.1, W * 0.5, H * 0.5, H * 0.95);
  g.addColorStop(0, mixHex(bg, '#ffffff', 0.16));
  g.addColorStop(1, mixHex(bg, '#000000', 0.12));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // bokeh: deterministic positions from index, integer drift so the loop closes
  for (let i = 0; i < bokeh; i++) {
    const fx = ((i * 0.618) % 1), fy = ((i * 0.377 + 0.2) % 1);
    const k = 1 + (i % 2);
    const x = ((fx + phase * 0.05 * k) % 1) * W;
    const y = ((fy - phase * 0.08 * k) % 1 + 1) % 1 * H;
    const r = H * (0.05 + ((i * 7) % 5) * 0.02);
    const col = pops.length ? pops[i % pops.length] : '#ffffff';
    const bg2 = ctx.createRadialGradient(x, y, 0, x, y, r);
    bg2.addColorStop(0, withAlpha(col, 0.16));
    bg2.addColorStop(0.7, withAlpha(col, 0.07));
    bg2.addColorStop(1, withAlpha(col, 0));
    ctx.fillStyle = bg2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  if (vignette > 0) {
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(20,10,30,${vignette})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }
  void rng;
}

export function vignette(ctx, W, H, strength = 0.18) {
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(10,10,30,${strength})`);
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, W, H);
}

// Big friendly outlined text. Auto-shrinks to maxWidth when given.
// `shadow` adds a soft drop shadow; `gradient: [top, bottom]` fills with a vertical gradient.
export function label(ctx, text, x, y, opts = {}) {
  const {
    size = 120, fill = '#ffffff', stroke = '#1b1b1b', lw = size * 0.14,
    align = 'center', baseline = 'middle', weight = 700, font = FONT_DISPLAY, maxWidth = null, alpha = 1,
    shadow = 0, gradient = null,
  } = opts;
  let s = size;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.lineJoin = 'round';
  ctx.font = `${weight} ${s}px ${font}`;
  if (maxWidth) {
    for (let i = 0; i < 12 && ctx.measureText(text).width > maxWidth; i++) {
      s *= 0.92;
      ctx.font = `${weight} ${s}px ${font}`;
    }
  }
  if (shadow > 0) {
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = shadow;
    ctx.shadowOffsetY = shadow * 0.4;
  }
  if (stroke && lw > 0) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw * (s / size);
    ctx.strokeText(text, x, y);
  }
  ctx.shadowColor = 'transparent';
  if (gradient) {
    const gg = ctx.createLinearGradient(0, y - s * 0.6, 0, y + s * 0.6);
    gg.addColorStop(0, gradient[0]); gg.addColorStop(1, gradient[1]);
    ctx.fillStyle = gg;
  } else ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
  return s;
}

export function emoji(ctx, char, x, y, size, opts = {}) {
  const { align = 'center', baseline = 'middle', alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.font = `${size}px ${FONT_EMOJI}`;
  ctx.fillStyle = '#000';
  // Noto Color Emoji renders a bit above the geometric middle; nudge down.
  ctx.fillText(char, x, y + size * 0.06);
  ctx.restore();
}

// --- Faces -----------------------------------------------------------------
// size ~ the character's height. blink 0..1 (1 = closed). mouth 0..1 (open).
export function face(ctx, o) {
  const {
    x, y, size, blink = 0, mouth = 0.4, look = [0, 0], cheeks = true,
    ink = '#1b1b1b', eyeSpacing = 0.22, eyeY = -0.08, mouthY = 0.22, eyeScale = 1, brows = true, brow = 0.5,
  } = o;
  const ex = size * eyeSpacing, ey = y + size * eyeY;
  const rx = size * 0.14 * eyeScale, ryOpen = size * 0.16 * eyeScale;
  const ry = Math.max(size * 0.012, ryOpen * (1 - blink));
  for (const sx of [-1, 1]) {
    const cx = x + sx * ex;
    // eyebrow: a soft arc that lifts with `brow` (happy, surprised on the beat)
    if (brows) {
      ctx.strokeStyle = withAlpha(ink, 0.85);
      ctx.lineWidth = size * 0.03;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const by = ey - ryOpen * 1.55 - brow * size * 0.04;
      ctx.moveTo(cx - rx * 0.8, by + rx * 0.15);
      ctx.quadraticCurveTo(cx, by - rx * 0.35, cx + rx * 0.8, by + rx * 0.05);
      ctx.stroke();
    }
    // white with a hint of shading at the top
    const wg = ctx.createLinearGradient(0, ey - ry, 0, ey + ry);
    wg.addColorStop(0, '#e9eef7'); wg.addColorStop(0.35, '#ffffff'); wg.addColorStop(1, '#ffffff');
    ellipse(ctx, cx, ey, rx, ry, wg);
    if (blink < 0.85) {
      // iris + pupil clipped to the white, two glossy highlights
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, ey, rx, ry, 0, 0, TAU);
      ctx.clip();
      const px = cx + look[0] * rx * 0.35, py = ey + look[1] * ry * 0.35;
      circle(ctx, px, py, rx * 0.6, mixHex(ink, '#4a3c6b', 0.35));
      circle(ctx, px, py, rx * 0.42, ink);
      circle(ctx, px - rx * 0.2, py - ry * 0.24, rx * 0.19, '#ffffff');
      circle(ctx, px + rx * 0.14, py + ry * 0.16, rx * 0.08, withAlpha('#ffffff', 0.85));
      ctx.restore();
    } else {
      // closed lid line
      ctx.strokeStyle = ink;
      ctx.lineWidth = size * 0.035;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(cx, ey - ry * 0.2, rx * 0.8, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    }
  }
  if (cheeks) {
    for (const sx of [-1, 1]) {
      const cx = x + sx * size * 0.36, cy = y + size * 0.1;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.1);
      cg.addColorStop(0, withAlpha('#ff6b8a', 0.6)); cg.addColorStop(1, withAlpha('#ff6b8a', 0));
      ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(cx, cy, size * 0.1, 0, TAU); ctx.fill();
    }
  }
  // Mouth: always a smile. Closed = a happy arc; open = a big "D"-shaped grin
  // (flat-ish top, round bottom) that opens and closes with the beat, never an "O".
  const my = y + size * mouthY;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (mouth < 0.15) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = size * 0.038;
    ctx.beginPath();
    ctx.arc(x, my - size * 0.07, size * 0.15, 0.12 * Math.PI, 0.88 * Math.PI);
    ctx.stroke();
  } else {
    const mw = size * 0.17 * (0.8 + 0.2 * mouth), mh = size * 0.17 * mouth;
    const top = my - size * 0.03;
    const grin = () => {
      ctx.beginPath();
      ctx.moveTo(x - mw, top);
      ctx.quadraticCurveTo(x, top + mh * 0.25, x + mw, top);
      ctx.quadraticCurveTo(x + mw * 0.95, top + mh * 2.1, x, top + mh * 2.1);
      ctx.quadraticCurveTo(x - mw * 0.95, top + mh * 2.1, x - mw, top);
      ctx.closePath();
    };
    ctx.save();
    grin();
    ctx.fillStyle = '#7a1f2b';
    ctx.fill();
    ctx.clip();
    ellipse(ctx, x, top + mh * 2.2, mw * 0.75, mh * 0.9, '#ff7b9c'); // tongue
    ctx.fillStyle = '#ffffff';                                          // little teeth line
    ctx.fillRect(x - mw * 0.7, top, mw * 1.4, Math.max(1, mh * 0.28));
    ctx.restore();
    ctx.strokeStyle = ink;
    ctx.lineWidth = size * 0.03;
    grin();
    ctx.stroke();
  }
}

// --- Holiday accessories ----------------------------------------------------
// Drawn on top of a character whose body height is `s`, origin at body centre.
export function accessory(ctx, kind, s, outline = '#1b1b1b') {
  if (!kind || kind === 'none') return;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.025;
  ctx.strokeStyle = outline;
  const top = -s * 0.5;
  switch (kind) {
    case 'santa': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, top + s * 0.06);
      ctx.quadraticCurveTo(-s * 0.05, top - s * 0.42, s * 0.3, top - s * 0.3);
      ctx.lineTo(s * 0.32, top + s * 0.06);
      ctx.closePath();
      ctx.fillStyle = '#e0242b'; ctx.fill(); ctx.stroke();
      roundRect(ctx, -s * 0.36, top - s * 0.02, s * 0.74, s * 0.13, s * 0.06, '#ffffff', outline, s * 0.02);
      circle(ctx, s * 0.31, top - s * 0.3, s * 0.07, '#ffffff', outline, s * 0.02);
      break;
    }
    case 'witch': {
      ellipse(ctx, 0, top + s * 0.04, s * 0.42, s * 0.09, '#2b2140');
      ctx.beginPath(); ctx.ellipse(0, top + s * 0.04, s * 0.42, s * 0.09, 0, 0, TAU); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, top + s * 0.04);
      ctx.quadraticCurveTo(-s * 0.02, top - s * 0.2, s * 0.08, top - s * 0.48);
      ctx.quadraticCurveTo(s * 0.12, top - s * 0.15, s * 0.22, top + s * 0.04);
      ctx.closePath();
      ctx.fillStyle = '#2b2140'; ctx.fill(); ctx.stroke();
      roundRect(ctx, -s * 0.2, top - s * 0.06, s * 0.4, s * 0.07, s * 0.02, '#8e5bd6');
      break;
    }
    case 'bunny': {
      for (const sx of [-1, 1]) {
        ellipse(ctx, sx * s * 0.16, top - s * 0.22, s * 0.09, s * 0.3, '#ffffff', sx * 0.15);
        ctx.beginPath(); ctx.ellipse(sx * s * 0.16, top - s * 0.22, s * 0.09, s * 0.3, sx * 0.15, 0, TAU); ctx.stroke();
        ellipse(ctx, sx * s * 0.16, top - s * 0.2, s * 0.045, s * 0.2, '#ffb3c6', sx * 0.15);
      }
      break;
    }
    case 'party': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.22, top + s * 0.04); ctx.lineTo(0, top - s * 0.45); ctx.lineTo(s * 0.22, top + s * 0.04); ctx.closePath();
      ctx.fillStyle = '#ffd400'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#ff5a36';
      for (let i = -3; i < 4; i++) ctx.fillRect(-s * 0.3, top - s * 0.45 + i * s * 0.12, s * 0.6, s * 0.06);
      ctx.restore();
      ctx.stroke();
      circle(ctx, 0, top - s * 0.45, s * 0.05, '#00a3e0', outline, s * 0.02);
      break;
    }
    case 'hearts': {
      for (const sx of [-1, 1]) {
        ctx.beginPath(); ctx.moveTo(sx * s * 0.12, top + s * 0.02); ctx.lineTo(sx * s * 0.2, top - s * 0.28); ctx.stroke();
        heart(ctx, sx * s * 0.2, top - s * 0.34, s * 0.16, '#ff3b5c', outline, s * 0.02);
      }
      break;
    }
    case 'flower': {
      const cols = ['#ff8fb1', '#ffd166', '#c5a3ff', '#8ee6a4', '#7cc7ff'];
      for (let i = -2; i <= 2; i++) {
        const fx = i * s * 0.15, fy = top + s * 0.02 - Math.abs(i) * s * 0.01;
        for (let p = 0; p < 5; p++) { const a = (p / 5) * TAU; circle(ctx, fx + Math.cos(a) * s * 0.045, fy + Math.sin(a) * s * 0.045, s * 0.035, cols[(i + 2) % cols.length]); }
        circle(ctx, fx, fy, s * 0.03, '#ffffff');
      }
      break;
    }
    case 'leaf': {
      for (let i = -2; i <= 2; i++) leaf(ctx, i * s * 0.14 - s * 0.05, top + s * 0.03, s * 0.18, s * 0.12, -0.9 + i * 0.2, i % 2 ? '#d97706' : '#b91c1c');
      break;
    }
    default: break;
  }
  ctx.restore();
}

// --- Fruit characters -------------------------------------------------------
export const FRUITS = ['strawberry', 'orange', 'blueberry', 'pear', 'lemon', 'watermelon', 'apple', 'grape', 'cherry', 'peach', 'kiwi', 'pineapple'];

function leaf(ctx, x, y, w, h, rot, fill = '#3fae49') {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(w * 0.5, -h, w, 0);
  ctx.quadraticCurveTo(w * 0.5, h * 0.6, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

// Little cartoon arms with white gloves. wave: -1..1 swings both arms up/down;
// drawn on top of the body so they read against any colour.
export function arms(ctx, s, wave = 0, outline = '#1b1b1b', bodyColor = '#ffffff') {
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    const ax = sx * s * 0.42, ay = s * 0.02;
    const lift = wave * s * 0.28 * (sx < 0 ? 1 : 0.85);
    const hx = sx * s * 0.68, hy = -s * 0.02 - lift;
    const cx = sx * s * 0.62, cy = s * 0.18 - lift * 0.4;
    ctx.strokeStyle = outline; ctx.lineWidth = s * 0.075;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.stroke();
    ctx.strokeStyle = mixHex(bodyColor, '#1b1b1b', 0.15); ctx.lineWidth = s * 0.045;
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(cx, cy, hx, hy); ctx.stroke();
    circle(ctx, hx, hy, s * 0.075, '#ffffff', outline, s * 0.02);
  }
  ctx.restore();
}

// Draws a fruit body centred at (x, y) with total height ~ size, then its face.
// squash: -1..1 (negative = stretched tall, positive = squashed flat). tilt: radians.
// wave: -1..1 arm swing (arms are drawn unless o.arms === false). brow: 0..1 eyebrow lift.
export function fruit(ctx, kind, x, y, size, o = {}) {
  const { squash = 0, tilt = 0, blink = 0, mouth = 0.5, look = [0, 0], outline = '#1b1b1b', wave = 0, brow = 0.5 } = o;
  const s = size;
  ctx.save();
  ctx.translate(x, y + s * 0.5); // pivot at the base so squash stays grounded
  ctx.rotate(tilt);
  ctx.scale(1 + 0.18 * squash, 1 - 0.18 * squash);
  ctx.translate(0, -s * 0.5);
  ctx.lineJoin = 'round';
  ctx.lineWidth = s * 0.03;
  ctx.strokeStyle = outline;
  let faceOpts = { x: 0, y: 0, size: s, blink, mouth, look, brow };
  const sh = (hex, r = s * 0.5, cx = 0, cy = 0) => shaded(ctx, hex, r, cx, cy);
  const BODY = { strawberry: '#ff3b5c', orange: '#ff9a1f', blueberry: '#4a6cf7', pear: '#b9d84b', lemon: '#ffe03a', watermelon: '#ff5a6e', apple: '#e63946', grape: '#8e5bd6', cherry: '#ff3b5c', peach: '#ffb07c', kiwi: '#7ccf4a', pineapple: '#ffb400', banana: '#ffe03a' };
  if (o.arms !== false) arms(ctx, s, wave, outline, BODY[kind] || '#ffffff');

  switch (kind) {
    case 'strawberry': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.38);
      ctx.bezierCurveTo(s * 0.55, -s * 0.42, s * 0.55, s * 0.1, 0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.55, s * 0.1, -s * 0.55, -s * 0.42, 0, -s * 0.38);
      ctx.closePath();
      ctx.fillStyle = sh('#ff3b5c', s * 0.52, 0, s * 0.02);
      ctx.fill();
      ctx.stroke();
      // seeds
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * TAU, r = s * (0.16 + 0.12 * ((i * 7) % 3));
        const sx = Math.cos(a) * r * 0.9, sy = Math.sin(a) * r * 0.7 + s * 0.02;
        if (Math.abs(sx) < s * 0.16 && sy > -s * 0.2 && sy < s * 0.35) continue; // keep the face clear
        ellipse(ctx, sx, sy, s * 0.018, s * 0.028, '#ffe36e');
      }
      for (let i = -2; i <= 2; i++) leaf(ctx, 0, -s * 0.36, s * 0.22, s * 0.16, -Math.PI / 2 + i * 0.55);
      roundRect(ctx, -s * 0.03, -s * 0.56, s * 0.06, s * 0.2, s * 0.03, '#3fae49');
      faceOpts = { ...faceOpts, y: -s * 0.02, eyeSpacing: 0.18 };
      break;
    }
    case 'orange': {
      circle(ctx, 0, 0, s * 0.46, sh('#ff9a1f', s * 0.46), outline, s * 0.03);
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + 0.3, r = s * 0.4;
        circle(ctx, Math.cos(a) * r, Math.sin(a) * r, s * 0.012, withAlpha('#c86a00', 0.5));
      }
      leaf(ctx, s * 0.08, -s * 0.44, s * 0.24, s * 0.16, -0.9);
      faceOpts = { ...faceOpts, size: s * 0.95 };
      break;
    }
    case 'blueberry': {
      circle(ctx, 0, 0, s * 0.44, sh('#4a6cf7', s * 0.44), outline, s * 0.03);
      circle(ctx, -s * 0.14, -s * 0.16, s * 0.12, withAlpha('#ffffff', 0.18));
      star(ctx, 0, -s * 0.34, s * 0.12, s * 0.05, 5, '#2e44a8');
      faceOpts = { ...faceOpts, y: s * 0.04, size: s * 0.95 };
      break;
    }
    case 'pear': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.48);
      ctx.bezierCurveTo(s * 0.32, -s * 0.48, s * 0.22, -s * 0.1, s * 0.4, s * 0.12);
      ctx.bezierCurveTo(s * 0.62, s * 0.4, s * 0.3, s * 0.5, 0, s * 0.5);
      ctx.bezierCurveTo(-s * 0.3, s * 0.5, -s * 0.62, s * 0.4, -s * 0.4, s * 0.12);
      ctx.bezierCurveTo(-s * 0.22, -s * 0.1, -s * 0.32, -s * 0.48, 0, -s * 0.48);
      ctx.closePath();
      ctx.fillStyle = sh('#b9d84b', s * 0.55, 0, s * 0.1);
      ctx.fill();
      ctx.stroke();
      roundRect(ctx, -s * 0.025, -s * 0.66, s * 0.05, s * 0.2, s * 0.02, '#7a4a1f');
      leaf(ctx, s * 0.02, -s * 0.56, s * 0.22, s * 0.14, -0.6);
      faceOpts = { ...faceOpts, y: s * 0.14, size: s * 0.9 };
      break;
    }
    case 'lemon': {
      ctx.save();
      ctx.rotate(-0.25);
      ellipse(ctx, 0, 0, s * 0.5, s * 0.35, sh('#ffe03a', s * 0.5));
      ctx.beginPath(); ctx.ellipse(0, 0, s * 0.5, s * 0.35, 0, 0, TAU); ctx.stroke();
      circle(ctx, -s * 0.5, 0, s * 0.07, '#ffe03a', outline, s * 0.03);
      circle(ctx, s * 0.5, 0, s * 0.07, '#ffe03a', outline, s * 0.03);
      ctx.restore();
      leaf(ctx, s * 0.3, -s * 0.36, s * 0.2, s * 0.12, -0.9);
      faceOpts = { ...faceOpts, size: s * 0.85, eyeY: -0.06, mouthY: 0.2 };
      break;
    }
    case 'watermelon': {
      const r = s * 0.55;
      ctx.beginPath(); ctx.arc(0, -s * 0.1, r, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = '#2f9e44'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, -s * 0.1, r * 0.92, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = '#c9f2c7'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, -s * 0.1, r * 0.84, 0, Math.PI); ctx.closePath();
      ctx.fillStyle = sh('#ff5a6e', r * 0.9, 0, -s * 0.1); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.18 + 0.64 * (i / 5)), rr = r * 0.62;
        ellipse(ctx, Math.cos(a) * rr, -s * 0.1 + Math.sin(a) * rr, s * 0.02, s * 0.035, '#1b1b1b', a - Math.PI / 2);
      }
      faceOpts = { ...faceOpts, y: s * 0.02, size: s * 0.8, eyeY: 0.02, mouthY: 0.28 };
      break;
    }
    case 'apple': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.3);
      ctx.bezierCurveTo(s * 0.12, -s * 0.52, s * 0.55, -s * 0.5, s * 0.5, -s * 0.05);
      ctx.bezierCurveTo(s * 0.48, s * 0.35, s * 0.2, s * 0.52, 0, s * 0.44);
      ctx.bezierCurveTo(-s * 0.2, s * 0.52, -s * 0.48, s * 0.35, -s * 0.5, -s * 0.05);
      ctx.bezierCurveTo(-s * 0.55, -s * 0.5, -s * 0.12, -s * 0.52, 0, -s * 0.3);
      ctx.closePath();
      ctx.fillStyle = sh('#e63946', s * 0.55); ctx.fill(); ctx.stroke();
      roundRect(ctx, -s * 0.025, -s * 0.6, s * 0.05, s * 0.28, s * 0.02, '#6b3e1d');
      leaf(ctx, s * 0.02, -s * 0.5, s * 0.24, s * 0.15, -0.5);
      faceOpts = { ...faceOpts, y: s * 0.02, size: s * 0.95 };
      break;
    }
    case 'cherry': {
      // two cherries joined by stems; the face lives on the front one
      ctx.beginPath(); ctx.moveTo(-s * 0.18, -s * 0.05); ctx.quadraticCurveTo(-s * 0.05, -s * 0.5, s * 0.05, -s * 0.62); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(s * 0.26, -s * 0.12); ctx.quadraticCurveTo(s * 0.15, -s * 0.5, s * 0.05, -s * 0.62); ctx.stroke();
      leaf(ctx, s * 0.05, -s * 0.6, s * 0.22, s * 0.14, -0.4);
      circle(ctx, s * 0.28, s * 0.05, s * 0.2, sh('#c81d3a', s * 0.2, s * 0.28, s * 0.05), outline, s * 0.03);
      circle(ctx, -s * 0.12, s * 0.16, s * 0.32, sh('#ff3b5c', s * 0.32, -s * 0.12, s * 0.16), outline, s * 0.03);
      circle(ctx, -s * 0.24, s * 0.02, s * 0.08, withAlpha('#ffffff', 0.35));
      faceOpts = { ...faceOpts, x: -s * 0.12, y: s * 0.2, size: s * 0.66 };
      break;
    }
    case 'peach': {
      circle(ctx, 0, s * 0.02, s * 0.46, sh('#ffb07c', s * 0.46, 0, s * 0.02), outline, s * 0.03);
      ctx.beginPath(); ctx.moveTo(s * 0.02, -s * 0.44); ctx.quadraticCurveTo(s * 0.12, -s * 0.05, s * 0.06, s * 0.46); ctx.strokeStyle = withAlpha('#c86a3a', 0.5); ctx.stroke(); ctx.strokeStyle = outline;
      circle(ctx, -s * 0.16, -s * 0.1, s * 0.14, withAlpha('#ffd2b0', 0.5));
      roundRect(ctx, -s * 0.025, -s * 0.62, s * 0.05, s * 0.2, s * 0.02, '#6b3e1d');
      leaf(ctx, s * 0.02, -s * 0.5, s * 0.26, s * 0.16, -0.5);
      faceOpts = { ...faceOpts, y: s * 0.04, size: s * 0.95 };
      break;
    }
    case 'kiwi': {
      circle(ctx, 0, 0, s * 0.47, '#8b5a2b', outline, s * 0.03);
      circle(ctx, 0, 0, s * 0.42, sh('#7ccf4a', s * 0.42));
      circle(ctx, 0, 0, s * 0.16, '#eef7c8');
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; ellipse(ctx, Math.cos(a) * s * 0.22, Math.sin(a) * s * 0.22, s * 0.015, s * 0.03, '#1b1b1b', a); }
      faceOpts = { ...faceOpts, size: s * 0.95 };
      break;
    }
    case 'pineapple': {
      for (let i = -2; i <= 2; i++) leaf(ctx, i * s * 0.06, -s * 0.36, s * 0.16, s * 0.42, -Math.PI / 2 + i * 0.32, i % 2 ? '#2f9e44' : '#3fae49');
      ellipse(ctx, 0, s * 0.08, s * 0.36, s * 0.46, sh('#ffb400', s * 0.46, 0, s * 0.08));
      ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.36, s * 0.46, 0, 0, TAU); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.ellipse(0, s * 0.08, s * 0.36, s * 0.46, 0, 0, TAU); ctx.clip();
      ctx.strokeStyle = withAlpha('#c47a00', 0.55); ctx.lineWidth = s * 0.018;
      for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(-s * 0.5 + k * s * 0.12, -s * 0.5); ctx.lineTo(s * 0.5 + k * s * 0.12, s * 0.7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * 0.5 - k * s * 0.12, -s * 0.5); ctx.lineTo(-s * 0.5 - k * s * 0.12, s * 0.7); ctx.stroke(); }
      ctx.restore();
      faceOpts = { ...faceOpts, y: s * 0.1, size: s * 0.85 };
      break;
    }
    case 'banana': {
      ctx.save(); ctx.rotate(0.35);
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.05);
      ctx.quadraticCurveTo(0, s * 0.55, s * 0.5, -s * 0.05);
      ctx.quadraticCurveTo(s * 0.5, s * 0.2, 0, s * 0.3);
      ctx.quadraticCurveTo(-s * 0.5, s * 0.2, -s * 0.5, -s * 0.05);
      ctx.closePath();
      ctx.fillStyle = '#ffe03a'; ctx.fill(); ctx.stroke();
      roundRect(ctx, -s * 0.54, -s * 0.12, s * 0.09, s * 0.12, s * 0.02, '#6b3e1d');
      ctx.restore();
      faceOpts = { ...faceOpts, y: s * 0.08, size: s * 0.7, eyeY: 0.02, mouthY: 0.26 };
      break;
    }
    case 'grape':
    default: {
      const pts = [[0, -0.3], [-0.2, -0.15], [0.2, -0.15], [-0.32, 0.05], [0, 0.02], [0.32, 0.05], [-0.18, 0.25], [0.18, 0.25], [0, 0.44]];
      for (const [px, py] of pts) circle(ctx, px * s, py * s, s * 0.17, sh('#8e5bd6', s * 0.17, px * s, py * s), outline, s * 0.025);
      roundRect(ctx, -s * 0.02, -s * 0.62, s * 0.04, s * 0.22, s * 0.02, '#6b3e1d');
      leaf(ctx, s * 0.02, -s * 0.5, s * 0.24, s * 0.15, -0.6);
      faceOpts = { ...faceOpts, y: s * 0.04, size: s * 0.9 };
      break;
    }
  }
  face(ctx, faceOpts);
  if (o.hat) accessory(ctx, o.hat, s, outline);
  ctx.restore();
}

// --- Backdrops (story / rhyme tableaux) -----------------------------------
export function vgradient(ctx, W, H, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// phase: 0..1 position inside the loop (drift is periodic in phase). t: seconds (twinkle).
export function drawBackdrop(ctx, name, W, H, { phase = 0, t = 0 } = {}) {
  const bd = backdrop(name);
  vgradient(ctx, W, H, bd.top, bd.bottom);
  const horizon = H * 0.72;
  if (bd.sun) {
    const sx = W * 0.82, sy = H * 0.2, r = H * 0.09;
    circle(ctx, sx, sy, r * 1.6, withAlpha('#ffd84a', 0.25));
    circle(ctx, sx, sy, r, '#ffd84a');
    face(ctx, { x: sx, y: sy, size: r * 1.7, blink: 0, mouth: 0.05, cheeks: true, eyeScale: 0.8 });
  }
  if (bd.stars) {
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 97) % 1000) / 1000 * W, sy = ((i * 61) % 1000) / 1000 * horizon * 0.95;
      const tw = 0.55 + 0.45 * Math.sin(TAU * (t / 2.4) + i);
      circle(ctx, sx, sy, H * 0.004 * (1 + (i % 3) * 0.5), withAlpha('#fff5c2', tw));
    }
    circle(ctx, W * 0.8, H * 0.2, H * 0.07, '#ffe9a6');
    circle(ctx, W * 0.8 - H * 0.03, H * 0.19, H * 0.06, bd.top);
  }
  if (bd.clouds || bd.sun || bd.castle || name === 'meadow') {
    for (let i = 0; i < 3; i++) {
      const cw = W * 0.18, base = W * (0.1 + i * 0.35);
      const cx = ((base + phase * W) % (W + cw * 2)) - cw;
      const cy = H * (0.16 + 0.1 * ((i * 7) % 3));
      cloud(ctx, cx, cy, cw, withAlpha('#ffffff', 0.92));
    }
  }
  if (bd.castle) {
    ctx.fillStyle = '#b7c9dc';
    const bw = W * 0.5, bx = W * 0.25, by = horizon - H * 0.28;
    ctx.fillRect(bx, by, bw, H * 0.3);
    for (let i = 0; i < 9; i++) if (i % 2 === 0) ctx.fillRect(bx + (i / 9) * bw, by - H * 0.04, bw / 9, H * 0.04);
    ctx.fillRect(bx - W * 0.04, by - H * 0.16, W * 0.09, H * 0.46);
    ctx.fillRect(bx + bw - W * 0.05, by - H * 0.16, W * 0.09, H * 0.46);
    triangle(ctx, bx + W * 0.005, by - H * 0.22, W * 0.11, '#e05a7a');
    triangle(ctx, bx + bw - W * 0.005, by - H * 0.22, W * 0.11, '#e05a7a');
    roundRect(ctx, W * 0.47, horizon - H * 0.14, W * 0.06, H * 0.14, W * 0.03, '#6b4a2b');
  }
  if (bd.trees) {
    for (let i = 0; i < 7; i++) {
      const tx = W * (0.04 + i * 0.155), th = H * (0.22 + 0.06 * ((i * 5) % 3));
      ctx.fillStyle = '#6b4a2b';
      ctx.fillRect(tx - W * 0.012, horizon - th * 0.4, W * 0.024, th * 0.45);
      triangle(ctx, tx, horizon - th * 0.75, th * 0.9, i % 2 ? '#2f7d3d' : '#3b9a4d');
      triangle(ctx, tx, horizon - th * 1.05, th * 0.7, i % 2 ? '#3b9a4d' : '#2f7d3d');
    }
  }
  if (bd.ground) {
    ctx.fillStyle = bd.ground;
    ctx.beginPath();
    ctx.ellipse(W * 0.3, horizon + H * 0.22, W * 0.6, H * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = bd.ground2;
    ctx.beginPath();
    ctx.ellipse(W * 0.85, horizon + H * 0.28, W * 0.55, H * 0.3, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = bd.ground;
    ctx.fillRect(0, horizon + H * 0.16, W, H);
  }
  if (bd.waves) {
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      const yb = horizon + H * 0.05 + k * H * 0.08;
      ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 20) {
        ctx.lineTo(x, yb + Math.sin(TAU * (x / (W * 0.25)) + TAU * phase * (k + 1) + k) * H * 0.015);
      }
      ctx.lineTo(W, H);
      ctx.closePath();
      ctx.fillStyle = mixHex('#2a9df4', '#1b7fd1', k / 2);
      ctx.fill();
    }
  }
  return { horizon };
}

export function cloud(ctx, x, y, w, fill) {
  const h = w * 0.35;
  const solid = typeof fill === 'string' && fill.startsWith('#');
  if (solid) {
    const g = ctx.createLinearGradient(0, y - h * 0.8, 0, y + h * 0.6);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, mixHex(fill, '#9fb4cc', 0.35));
    ctx.fillStyle = g;
  } else ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.ellipse(x, y, w * 0.5, h * 0.5, 0, 0, TAU);
  ctx.ellipse(x - w * 0.22, y + h * 0.1, w * 0.28, h * 0.42, 0, 0, TAU);
  ctx.ellipse(x + w * 0.22, y + h * 0.1, w * 0.3, h * 0.45, 0, 0, TAU);
  ctx.ellipse(x + w * 0.02, y - h * 0.25, w * 0.3, h * 0.5, 0, 0, TAU);
  ctx.fill();
}

// Falling holiday confetti (emoji), periodic over the loop: each piece completes
// an integer number of falls, so the loop closes.
export function confetti(ctx, pieces, W, H, phase) {
  for (const p of pieces) {
    const q = (phase * p.k + p.off) % 1;
    const y = -p.size + q * (H + 2 * p.size);
    const x = p.x + Math.sin(TAU * (phase * p.wob) + p.ph) * W * 0.03;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(TAU * phase * p.wob + p.ph) * 0.4);
    emoji(ctx, p.glyph, 0, 0, p.size, { alpha: 0.9 });
    ctx.restore();
  }
}

export function makeConfetti(rng, glyphs, W, H, count = 14) {
  return Array.from({ length: count }, (_, i) => ({
    glyph: glyphs[i % glyphs.length], x: rng.range(0.03, 0.97) * W, size: H * rng.range(0.05, 0.09),
    k: rng.int(1, 2), off: rng.range(0, 1), wob: rng.int(1, 3), ph: rng.range(0, TAU),
  }));
}

// Soft drop shadow ellipse under a character
export function shadow(ctx, x, y, w, alpha = 0.18) {
  ellipse(ctx, x, y, w / 2, w / 7, `rgba(0,0,0,${clamp(alpha)})`);
}

// Caption pill with auto-fit text (used by story / flashcards)
export function captionPill(ctx, text, W, H, { y = H * 0.88, size = H * 0.07, fill = '#ffffff', ink = '#2b2b3a', alpha = 1 } = {}) {
  if (!text) return;
  const lines = String(text).split('\n').filter((l) => l.trim().length);
  if (!lines.length) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  let s = lines.length > 1 ? size * 0.85 : size;
  ctx.font = `700 ${s}px ${FONT_DISPLAY}`;
  const maxW = W * 0.86;
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (widest() > maxW && s > 20) { s *= 0.93; ctx.font = `700 ${s}px ${FONT_DISPLAY}`; }
  const tw = widest();
  const lh = s * 1.18;
  const pw = tw + s * 1.4, ph = lh * lines.length + s * 0.6;
  const top = y - ph / 2;
  roundRect(ctx, W / 2 - pw / 2, top, pw, ph, Math.min(ph / 2, s * 0.9), withAlpha(fill, 0.92));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = ink;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, top + s * 0.3 + lh * (i + 0.5) + s * 0.04));
  ctx.restore();
}

export const lerpColor = mixHex;
export { lerp };
