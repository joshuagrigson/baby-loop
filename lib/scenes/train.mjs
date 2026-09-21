// Little Train — a smiling engine pulls three cars of animal friends past
// rolling hills; wheels turn and the whole train bounces on the beat, scenery
// scrolls exactly once per loop. Pairs with Mountain King, Surprise, Hornpipes,
// Old MacDonald.
import { TAU, pulse, blink, withAlpha, beatFrac } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { vgradient, roundRect, circle, face, emoji, confetti, makeConfetti, cloud } from '../draw.mjs';

const PASSENGERS = ['🐻', '🐰', '🐼', '🐸', '🦁', '🐨', '🐷', '🦊', '🐮', '🐵'];

export default {
  id: 'train',
  name: 'Little Train',
  ageBand: '6–36 months',
  kind: 'loop',
  defaults: { bpm: 108, music: 'dance', palette: 'primary' },

  init({ W, H, rng, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'primary', options.theme || null);
    const cars = Array.from({ length: options.cars || 3 }, (_, i) => ({ color: pal.pops[(i + 1) % pal.pops.length], a: PASSENGERS[(rng.int(0, 9) + i * 3) % PASSENGERS.length], b: PASSENGERS[(rng.int(0, 9) + i * 5 + 1) % PASSENGERS.length] }));
    const trees = Array.from({ length: 10 }, (_, i) => ({ x: (i / 10) * W * 2, e: rng.pick(['🌳', '🌲', '🌴', '🏡', '🌻', '🐑']), size: H * rng.range(0.08, 0.13), k: 1 }));
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 10) : [];
    return { pal, cars, trees, pieces, engine: pal.theme ? pal.bg : '#e63946', sky: pal.theme ? pal.bgs[0] : '#8fd9ff' };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds }) {
    vgradient(ctx, W, H, s.sky, '#eaf7ff');
    for (let i = 0; i < 3; i++) {
      const cw = W * 0.22, cx = ((W * (0.15 + i * 0.35) - phase * W * 0.3) % (W + cw * 2) + (W + cw * 2)) % (W + cw * 2) - cw;
      cloud(ctx, cx, H * (0.12 + 0.08 * (i % 2)), cw, withAlpha('#ffffff', 0.9));
    }
    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);
    // hills (parallax: scroll half a screen per loop, drawn twice for wrap)
    for (const [hy, col, speed] of [[H * 0.7, '#7ccf7c', 0.5], [H * 0.78, '#5fb95f', 1]]) {
      ctx.fillStyle = col;
      for (let k = -1; k <= 2; k++) {
        const ox = ((-phase * speed * W) % W) + k * W;
        ctx.beginPath(); ctx.ellipse(ox + W * 0.25, hy + H * 0.2, W * 0.45, H * 0.26, 0, 0, TAU); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ox + W * 0.8, hy + H * 0.24, W * 0.5, H * 0.3, 0, 0, TAU); ctx.fill();
      }
    }
    ctx.fillStyle = '#5fb95f'; ctx.fillRect(0, H * 0.86, W, H);
    // scenery scrolling exactly once per loop (2W wide strip)
    for (const tr of s.trees) {
      const x = ((tr.x - phase * W * 2) % (W * 2) + W * 2) % (W * 2) - W * 0.5;
      emoji(ctx, tr.e, x, H * 0.8, tr.size);
    }
    // track
    ctx.fillStyle = '#6b4a2b';
    const trackY = H * 0.88;
    for (let k = -1; k < W / (H * 0.06) + 2; k++) { const x = k * H * 0.06 - ((phase * W * 2) % (H * 0.06)); ctx.fillRect(x, trackY - H * 0.012, H * 0.03, H * 0.045); }
    ctx.fillStyle = '#4a4a55'; ctx.fillRect(0, trackY, W, H * 0.012); ctx.fillRect(0, trackY + H * 0.025, W, H * 0.012);

    // the train, bouncing on the beat
    const bounce = Math.abs(Math.sin(Math.PI * beat)) * H * 0.012;
    const baseY = trackY - H * 0.02 - bounce;
    const wheelAngle = TAU * (phase * 24); // 24 turns per loop → periodic
    const carW = W * 0.17, carH = H * 0.16, gap = W * 0.02, wheelR = H * 0.035;
    const startX = W * 0.5 - (carW * (s.cars.length + 1) + gap * s.cars.length) / 2;
    const wheel = (x, y) => {
      circle(ctx, x, y, wheelR, '#333', '#1b1b1b', 2);
      circle(ctx, x, y, wheelR * 0.55, '#c9c9d4');
      ctx.save(); ctx.translate(x, y); ctx.rotate(wheelAngle); ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = 3;
      for (let a = 0; a < 3; a++) { ctx.beginPath(); ctx.moveTo(-wheelR * 0.5, 0); ctx.lineTo(wheelR * 0.5, 0); ctx.stroke(); ctx.rotate(Math.PI / 3); }
      ctx.restore();
    };
    // cars
    s.cars.forEach((c, i) => {
      const x = startX + (i + 1) * (carW + gap);
      roundRect(ctx, x, baseY - carH, carW, carH, H * 0.02, c.color, '#1b1b1b', H * 0.004);
      // coupling
      ctx.fillStyle = '#1b1b1b'; ctx.fillRect(x - gap, baseY - carH * 0.35, gap, H * 0.012);
      // passengers peeking over the side, bobbing off-beat
      const pb = Math.abs(Math.sin(Math.PI * (beat + 0.5))) * H * 0.02;
      emoji(ctx, c.a, x + carW * 0.3, baseY - carH * 0.95 - pb, H * 0.11);
      emoji(ctx, c.b, x + carW * 0.7, baseY - carH * 0.95 - pb * 0.6, H * 0.11);
      wheel(x + carW * 0.25, baseY + wheelR * 0.4); wheel(x + carW * 0.75, baseY + wheelR * 0.4);
    });
    // engine (front)
    const ex = startX;
    roundRect(ctx, ex, baseY - carH * 0.7, carW * 0.95, carH * 0.7, H * 0.02, s.engine, '#1b1b1b', H * 0.004);   // boiler
    roundRect(ctx, ex + carW * 0.55, baseY - carH * 1.25, carW * 0.42, carH * 1.25, H * 0.02, s.engine, '#1b1b1b', H * 0.004); // cab
    roundRect(ctx, ex + carW * 0.62, baseY - carH * 1.12, carW * 0.28, carH * 0.4, H * 0.01, '#bfe9ff', '#1b1b1b', 2);          // window
    roundRect(ctx, ex + carW * 0.12, baseY - carH * 1.05, carW * 0.16, carH * 0.4, H * 0.008, '#333', '#1b1b1b', 2);            // chimney
    roundRect(ctx, ex - carW * 0.06, baseY - carH * 0.25, carW * 0.12, carH * 0.3, H * 0.008, '#ffd400', '#1b1b1b', 2);          // cow catcher / lamp
    face(ctx, { x: ex + carW * 0.3, y: baseY - carH * 0.35, size: carH * 0.75, blink: blink(t, loopSeconds, 3, 0.7), mouth: 0.25 + 0.5 * pulse(beat / 2), cheeks: true });
    wheel(ex + carW * 0.22, baseY + wheelR * 0.4); wheel(ex + carW * 0.7, baseY + wheelR * 0.4);
    // smoke puffs, one every beat, drifting up and back
    for (let k = 0; k < 6; k++) {
      const f = (beatFrac(beat / 6) + k / 6) % 1;
      const px = ex + carW * 0.2 - f * W * 0.18, py = baseY - carH * 1.1 - f * H * 0.28;
      circle(ctx, px, py, H * 0.02 + f * H * 0.05, withAlpha('#ffffff', 0.85 * (1 - f)));
    }
  },
};
