// Pure math helpers shared by scenes (Node + browser).
export const TAU = Math.PI * 2;

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const easeInOutSine = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
export const easeOutBack = (t) => { const c1 = 1.70158, c3 = c1 + 1; t = clamp(t); return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
export const easeOutElastic = (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1; };

// fract of a beat: 0 at the beat, rising to 1 just before the next one
export const beatFrac = (beat) => beat - Math.floor(beat);

// "Bounce" envelope: 1 at the beat, decaying like a ball landing. Periodic per beat.
export function bounce(beat, sharpness = 6) {
  const f = beatFrac(beat);
  return Math.exp(-sharpness * f);
}

// Symmetric squash: peaks at the beat, zero midway — good for squash & stretch
export function pulse(beat) {
  return Math.abs(Math.cos(Math.PI * beat));
}

// A slow periodic wobble that is exactly periodic over `period`
export function wobble(t, period, phase = 0) {
  return Math.sin(TAU * (t / period) + phase);
}

// Blink schedule: eyes closed for ~120 ms every `every` seconds, periodic over loopSeconds.
// Returns 0 (open) .. 1 (closed).
export function blink(t, loopSeconds, every = 3.1, offset = 0) {
  // choose a count that divides the loop so blinks are periodic
  const n = Math.max(1, Math.round(loopSeconds / every));
  const period = loopSeconds / n;
  const local = ((t + offset) % period + period) % period;
  const d = 0.13;
  if (local > d) return 0;
  const x = local / d; // 0..1
  return Math.sin(Math.PI * x);
}

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}
export function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0')).join('');
}
export function mixHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex([lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]);
}
export function withAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${clamp(alpha)})`;
}
