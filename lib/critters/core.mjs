// Shared kit for drawn animal characters. Same visual language as the fruit
// cast in draw.mjs: bold dark outline (~0.03·s), studio-lit radial shading via
// shaded(), glossy happy face via face(), optional gloved arms, holiday hats.
//
// STYLE RULES every critter follows (so the cast reads as one family):
//  • Origin (0,0) is the body centre; the whole character fits in ~[-0.5s, 0.5s]
//    vertically (ears/horns may poke up to -0.7s). Facing: front or 3/4 facing RIGHT.
//  • Every filled body part uses sh(hex, r, cx, cy) → lit from the upper left.
//  • Outline with stroke(): colour o.outline, width s*0.03, round joins.
//  • Faces are always happy (face() only draws smiles). Big eyes, pink cheeks.
//  • Belly / muzzle / inner-ear patches in a lighter tint of the body.
//  • No text, no emoji, no images — pure Canvas2D paths, browser + Node safe.
import { TAU, withAlpha, mixHex } from '../easing.mjs';
import { circle, ellipse, roundRect, shaded, face, arms, accessory } from '../draw.mjs';

export { TAU, withAlpha, mixHex, circle, ellipse, roundRect, shaded, face, arms, accessory };

// A drawing context bundle handed to each critter's draw function.
export function kit(ctx, s, o) {
  const outline = o.outline || '#1b1b1b';
  const lw = s * 0.03;
  const sh = (hex, r = s * 0.5, cx = 0, cy = 0, strength = 1) => shaded(ctx, hex, r, cx, cy, strength);
  const stroke = (w = lw) => { ctx.lineWidth = w; ctx.strokeStyle = outline; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke(); };
  const fillStroke = (fill, w = lw) => { ctx.fillStyle = fill; ctx.fill(); stroke(w); };
  // lit ellipse with outline
  const blob = (x, y, rx, ry, hex, rot = 0, w = lw) => {
    ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
    fillStroke(sh(hex, Math.max(rx, ry), x, y), w);
  };
  const light = (hex, k = 0.45) => mixHex(hex, '#ffffff', k);
  const dark = (hex, k = 0.25) => mixHex(hex, '#2a1830', k);
  return { ctx, s, o, outline, lw, sh, stroke, fillStroke, blob, light, dark };
}

// Common option handling: squash & stretch pivoting at the feet, tilt, flip.
// draw(k) must draw the body and return face options (merged over defaults),
// or null to skip the default face (the critter drew its own).
export function drawCritter(ctx, x, y, size, o, draw) {
  const { squash = 0, tilt = 0, blink = 0, mouth = 0.5, look = [0, 0], brow = 0.5, flip = false } = o;
  const s = size;
  ctx.save();
  ctx.translate(x, y + s * 0.5);
  ctx.rotate(tilt);
  ctx.scale((flip ? -1 : 1) * (1 + 0.16 * squash), 1 - 0.16 * squash);
  ctx.translate(0, -s * 0.5);
  const k = kit(ctx, s, o);
  const f = draw(k);
  if (f) face(ctx, { x: 0, y: 0, size: s * 0.8, blink, mouth, look, brow, ink: o.ink || '#1b1b1b', ...f });
  if (o.hat) accessory(ctx, o.hat, (f && f.hatSize) || s * 0.8, k.outline);
  ctx.restore();
}
