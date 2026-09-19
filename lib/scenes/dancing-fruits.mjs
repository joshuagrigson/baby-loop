// Dancing Fruits — the genre's signature: saturated flat field, 3–5 fruit
// characters with faces hopping on the beat, squash & stretch, singing mouths,
// floating notes. Fully periodic over the loop, beat-synced to info.bpm.
import { TAU, bounce, pulse, blink, wobble, beatFrac, withAlpha } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { fruit, FRUITS, circle, shadow, label } from '../draw.mjs';

export default {
  id: 'dancing-fruits',
  name: 'Fruit Friends Dance',
  ageBand: '3–18 months',
  kind: 'loop',
  defaults: { bpm: 112, music: 'dance', palette: 'primary' },

  init({ W, H, rng, loopSeconds, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'primary');
    const count = options.count || rng.int(3, 5);
    const kinds = rng.shuffle(FRUITS).slice(0, count);
    const spacing = W / (count + 1);
    const chars = kinds.map((kind, i) => ({
      kind,
      x: spacing * (i + 1),
      size: H * (count >= 5 ? 0.3 : count === 4 ? 0.34 : 0.4) * rng.range(0.92, 1.08),
      beatOffset: i % 2 === 0 ? 0 : 0.5,          // alternate on/off beat
      hopEvery: rng.pick([1, 1, 2]),               // hop every beat or every other
      tiltDir: i % 2 ? 1 : -1,
      blinkOffset: rng.range(0, 3),
      lookPhase: rng.range(0, TAU),
    }));
    // background polka grid
    const dot = { spacing: H * 0.12, r: H * 0.012, color: withAlpha(pal.pops[0], 0.35) };
    const notes = Array.from({ length: 6 }, (_, i) => ({
      x: W * rng.range(0.05, 0.95), off: rng.range(0, 1), speedK: rng.int(1, 2), glyph: rng.pick(['♪', '♫', '♩']), color: pal.pops[(i + 1) % pal.pops.length],
    }));
    return { pal, chars, dot, notes, loopSeconds };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds }) {
    const { pal } = s;
    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, W, H);

    // drifting polka dots (periodic: shift by exactly one cell over the loop)
    const shift = phase * s.dot.spacing;
    ctx.fillStyle = s.dot.color;
    for (let y = -s.dot.spacing; y < H + s.dot.spacing; y += s.dot.spacing) {
      for (let x = -s.dot.spacing; x < W + s.dot.spacing; x += s.dot.spacing) {
        const row = Math.round(y / s.dot.spacing);
        ctx.beginPath();
        ctx.arc(x + shift + (row % 2) * s.dot.spacing * 0.5, y + shift, s.dot.r, 0, TAU);
        ctx.fill();
      }
    }

    // beat rings from the centre
    const b = bounce(beat, 5);
    for (let k = 0; k < 3; k++) {
      const f = (beatFrac(beat / 2) + k / 3) % 1;
      circle(ctx, W / 2, H * 0.55, H * 0.25 + f * H * 0.9, null, withAlpha('#ffffff', 0.18 * (1 - f)), H * 0.02);
    }

    // floating notes (periodic; rise over loopSeconds / speedK)
    for (const n of s.notes) {
      const p = (phase * n.speedK + n.off) % 1;
      const y = H * 1.05 - p * H * 1.1;
      const x = n.x + Math.sin(p * TAU * 2) * W * 0.02;
      label(ctx, n.glyph, x, y, { size: H * 0.09, fill: n.color, stroke: '#1b1b1b', lw: H * 0.008, font: '"DejaVu Sans", "Segoe UI Symbol", sans-serif', alpha: Math.sin(p * Math.PI) });
    }

    // characters
    const floor = H * 0.78;
    for (const c of s.chars) {
      const lb = (beat + c.beatOffset) / c.hopEvery;
      const f = beatFrac(lb);
      const hop = Math.sin(Math.PI * f);                // 0 at beat, 1 mid-air
      const height = hop * H * 0.09 * (c.hopEvery === 2 ? 1.6 : 1);
      // squash on landing, stretch in the air
      const land = bounce(lb, 9);
      const squash = land * 0.9 - hop * 0.45;
      const tilt = c.tiltDir * 0.14 * Math.sin(Math.PI * (beat / 2));
      const bl = blink(t, loopSeconds, 3.3, c.blinkOffset);
      const mouth = 0.25 + 0.5 * pulse(beat / 2 + c.beatOffset);
      const look = [wobble(t, loopSeconds / 2, c.lookPhase) * 0.9, 0.2];
      shadow(ctx, c.x, floor + c.size * 0.02, c.size * (0.9 - 0.3 * hop), 0.2 - 0.1 * hop);
      fruit(ctx, c.kind, c.x, floor - c.size * 0.5 - height, c.size, { squash, tilt, blink: bl, mouth, look });
    }
    void b;
  },
};
