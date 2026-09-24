// Fruit Friends Dance — the genre's signature: saturated flat field, a whole
// troupe of smiling fruit characters hopping on the beat in two rows, squash &
// stretch, singing grins, floating notes, and (with a theme) hats + confetti.
// Fully periodic over the loop, beat-synced to info.bpm.
import { TAU, bounce, pulse, blink, wobble, beatFrac, withAlpha } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { fruit, FRUITS, circle, shadow, label, confetti, makeConfetti, atmosphere } from '../draw.mjs';

export default {
  id: 'dancing-fruits',
  name: 'Fruit Friends Dance',
  ageBand: '3–18 months',
  kind: 'loop',
  defaults: { bpm: 112, music: 'dance', palette: 'primary' },

  init({ W, H, rng, loopSeconds, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'primary', options.theme || null);
    const count = options.count || rng.int(6, 8);          // more friends by default
    const kinds = rng.shuffle(FRUITS);
    const front = Math.min(count, 5);
    const back = Math.min(4, Math.max(0, count - front));
    const hat = options.hat !== undefined ? options.hat : pal.theme?.hat || 'none';
    const mk = (kind, i, n, row) => {
      // back row is smaller, higher, and sits in the gaps between the front row
      const spacing = W / (n + 1);
      const base = row === 0 ? (n >= 5 ? 0.3 : n === 4 ? 0.34 : 0.4) : 0.17;
      return {
        kind, row,
        x: spacing * (i + 1),
        size: H * base * rng.range(0.92, 1.08),
        beatOffset: (i + row) % 2 === 0 ? 0 : 0.5,             // alternate on/off beat
        hopEvery: row === 1 ? 2 : rng.pick([1, 1, 2]),
        tiltDir: (i + row) % 2 ? 1 : -1,
        blinkOffset: rng.range(0, 3),
        lookPhase: rng.range(0, TAU),
        hat: hat === 'mixed' ? rng.pick(['santa', 'party', 'flower', 'none']) : hat,
      };
    };
    const chars = [
      ...Array.from({ length: back }, (_, i) => mk(kinds[front + i], i, back, 1)),
      ...Array.from({ length: front }, (_, i) => mk(kinds[i], i, front, 0)),
    ];
    const dot = { spacing: H * 0.12, r: H * 0.012, color: withAlpha(pal.pops[0], 0.35) };
    const notes = Array.from({ length: 7 }, (_, i) => ({
      x: W * rng.range(0.05, 0.95), off: rng.range(0, 1), speedK: rng.int(1, 2), glyph: rng.pick(['♪', '♫', '♩']), color: pal.pops[(i + 1) % pal.pops.length],
    }));
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 14) : [];
    return { pal, chars, dot, notes, pieces, loopSeconds };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds, bpm }) {
    const { pal } = s;
    atmosphere(ctx, W, H, { bg: pal.bg, pops: pal.pops, phase, bokeh: 12, vignette: 0.2 });

    // drifting polka dots (periodic: shift by exactly two cells over the loop,
    // so the staggered odd/even rows land back on their own parity)
    const shift = phase * s.dot.spacing * 2;
    ctx.fillStyle = s.dot.color;
    for (let y = -3 * s.dot.spacing; y < H + s.dot.spacing; y += s.dot.spacing) {
      for (let x = -3 * s.dot.spacing; x < W + s.dot.spacing; x += s.dot.spacing) {
        const row = Math.round(y / s.dot.spacing);
        ctx.beginPath();
        ctx.arc(x + shift + (row % 2) * s.dot.spacing * 0.5, y + shift, s.dot.r, 0, TAU);
        ctx.fill();
      }
    }

    // Motion periods must divide the loop's beat count or the seam jumps
    // (3/4 melodies and odd bar counts give loops that aren't multiples of 4).
    const nb = Math.max(1, Math.round((loopSeconds * bpm) / 60));
    const P4 = nb % 4 === 0 ? 4 : nb % 2 === 0 ? 2 : 1, P2 = nb % 2 === 0 ? 2 : 1;
    // beat rings from the centre
    for (let k = 0; k < 3; k++) {
      const f = (beatFrac(beat / P2) + k / 3) % 1;
      circle(ctx, W / 2, H * 0.55, H * 0.25 + f * H * 0.9, null, withAlpha('#ffffff', 0.18 * (1 - f)), H * 0.02);
    }

    // floating notes (periodic; rise over loopSeconds / speedK)
    for (const n of s.notes) {
      const p = (phase * n.speedK + n.off) % 1;
      const y = H * 1.05 - p * H * 1.1;
      const x = n.x + Math.sin(p * TAU * 2) * W * 0.02;
      label(ctx, n.glyph, x, y, { size: H * 0.09, fill: n.color, stroke: '#1b1b1b', lw: H * 0.008, font: '"DejaVu Sans", "Segoe UI Symbol", sans-serif', alpha: Math.sin(p * Math.PI) });
    }

    // holiday confetti behind the troupe
    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);

    // characters — back row first, then front row
    const floors = [H * 0.8, H * 0.44];
    for (const c of s.chars) {
      const floor = floors[c.row];
      const hopEvery = Math.min(c.hopEvery, P2);
      const lb = (beat + (P2 > 1 ? c.beatOffset : 0)) / hopEvery;
      const f = beatFrac(lb);
      const hop = Math.sin(Math.PI * f);                // 0 at beat, 1 mid-air
      const height = hop * H * (c.row ? 0.05 : 0.09) * (hopEvery === 2 ? 1.6 : 1);
      const land = bounce(lb, 9);
      const squash = land * 0.9 - hop * 0.45;
      const tilt = c.tiltDir * 0.14 * Math.sin((TAU * beat) / P4);
      const bl = blink(t, loopSeconds, 3.3, c.blinkOffset);
      const mouth = 0.3 + 0.55 * pulse(beat / P2 + c.beatOffset);   // big happy grin, opens on the beat
      const look = [wobble(t, loopSeconds / 2, c.lookPhase) * 0.9, 0.2];
      const wave = Math.sin((TAU * beat) / P4 + Math.PI * c.beatOffset) * (c.row ? 0.6 : 1);   // arms swing every two beats
      const brow = 0.35 + 0.65 * hop;                                                   // brows lift mid-hop
      if (c.row === 0) shadow(ctx, c.x, floor + c.size * 0.02, c.size * (0.9 - 0.3 * hop), 0.2 - 0.1 * hop);
      fruit(ctx, c.kind, c.x, floor - c.size * 0.5 - height, c.size, { squash, tilt, blink: bl, mouth, look, hat: c.hat, wave, brow });
    }
  },
};
