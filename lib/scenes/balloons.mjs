// Balloons — a party of smiling balloons rising and bobbing to the beat, each
// completing an integer number of rises per loop. Lit rubber bodies with a
// specular highlight, tied knots and curly ribbon strings; drawn paper confetti
// tumbling around them under a friendly sun. Pairs with Can-Can, William Tell,
// Turkish March, Surprise Symphony.
import { TAU, pulse, blink, withAlpha, wobble, mixHex } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { face, confetti, makeConfetti, vignette, atmosphere, sunshine, softCloud, sparkle } from '../draw.mjs';

const BRIGHTS = ['#ff5a5a', '#ffd93d', '#4d96ff', '#6bcb77', '#ff8fb1', '#ff9f43', '#845ec2', '#08d9d6'];
const SKY_TOP = '#79c4ff', SKY_BOTTOM = '#e6f6ff';

function balloonPath(ctx, rx, ry) {
  ctx.beginPath();
  ctx.moveTo(0, -ry);
  ctx.bezierCurveTo(rx * 0.56, -ry, rx, -ry * 0.52, rx, -ry * 0.02);
  ctx.bezierCurveTo(rx, ry * 0.5, rx * 0.42, ry * 0.92, 0, ry);
  ctx.bezierCurveTo(-rx * 0.42, ry * 0.92, -rx, ry * 0.5, -rx, -ry * 0.02);
  ctx.bezierCurveTo(-rx, -ry * 0.52, -rx * 0.56, -ry, 0, -ry);
  ctx.closePath();
}

function drawBalloon(ctx, b, color, sq, phase, H, faceOpts) {
  const r = b.r, rx = r * sq, ry = (r * 1.18) / sq;
  const ink = mixHex(color, '#1b1030', 0.6);
  const lw = Math.max(1.5, H * 0.0035);
  // curly ribbon string (behind the body): a trochoid whose loops unwind
  // toward the free end; the curl travels along it an integer number of times
  const L = r * 3.2, top = ry + r * 0.14, N = 56;
  const pts = [];
  const th0 = -TAU * phase * b.curlK + b.ph, a0 = r * 0.16;
  const x0 = a0 * Math.sin(th0), y0 = a0 * 0.9 * Math.cos(th0);
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const th = s * b.turns * TAU + th0;
    const a = r * 0.16 * (1 - s * 0.55);
    const pin = (1 - s) * (1 - s);          // pin the top of the string to the knot
    pts.push([a * Math.sin(th) - x0 * pin + Math.sin(TAU * phase * b.wob + b.ph) * r * 0.35 * s * s, top + L * s + a * 0.9 * Math.cos(th) - y0 * pin]);
  }
  const trace = () => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  trace(); ctx.strokeStyle = mixHex(color, '#1b1030', 0.35); ctx.lineWidth = lw * 1.3; ctx.stroke();
  ctx.save(); ctx.translate(-lw * 0.3, -lw * 0.2);
  trace(); ctx.strokeStyle = withAlpha(mixHex(color, '#ffffff', 0.55), 0.85); ctx.lineWidth = lw * 0.45; ctx.stroke();
  ctx.restore();
  // knot: a little pinched neck + flared tie
  ctx.beginPath();
  ctx.moveTo(-r * 0.05, ry - r * 0.02);
  ctx.lineTo(r * 0.05, ry - r * 0.02);
  ctx.quadraticCurveTo(r * 0.03, ry + r * 0.05, r * 0.11, ry + r * 0.15);
  ctx.quadraticCurveTo(0, ry + r * 0.11, -r * 0.11, ry + r * 0.15);
  ctx.quadraticCurveTo(-r * 0.03, ry + r * 0.05, -r * 0.05, ry - r * 0.02);
  ctx.closePath();
  ctx.fillStyle = mixHex(color, '#1b1030', 0.18); ctx.fill();
  ctx.strokeStyle = ink; ctx.lineWidth = lw * 0.8; ctx.stroke();
  // body: lit rubber
  const g = ctx.createRadialGradient(-rx * 0.35, -ry * 0.45, r * 0.05, 0, 0, r * 1.35);
  g.addColorStop(0, mixHex(color, '#ffffff', 0.5));
  g.addColorStop(0.42, color);
  g.addColorStop(1, mixHex(color, '#2a1440', 0.32));
  balloonPath(ctx, rx, ry);
  ctx.fillStyle = g; ctx.fill();
  // translucent rim glow on the shadow side (light passing through the rubber)
  ctx.save();
  ctx.clip();
  const rim = ctx.createLinearGradient(-rx, -ry, rx, ry);
  rim.addColorStop(0.55, withAlpha(color, 0));
  rim.addColorStop(1, withAlpha(mixHex(color, '#ffffff', 0.6), 0.55));
  balloonPath(ctx, rx, ry);
  ctx.strokeStyle = rim; ctx.lineWidth = r * 0.16; ctx.stroke();
  ctx.restore();
  balloonPath(ctx, rx, ry);
  ctx.strokeStyle = ink; ctx.lineWidth = lw; ctx.stroke();
  // specular highlight: soft window + a crisp hot spot
  ctx.save();
  ctx.translate(-rx * 0.42, -ry * 0.44);
  ctx.rotate(-0.55);
  const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.3);
  hg.addColorStop(0, withAlpha('#ffffff', 0.75)); hg.addColorStop(1, withAlpha('#ffffff', 0));
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.16, r * 0.3, 0, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(-rx * 0.5, -ry * 0.52, r * 0.06, r * 0.11, -0.55, 0, TAU);
  ctx.fillStyle = withAlpha('#ffffff', 0.9); ctx.fill();
  face(ctx, { ...faceOpts, x: 0, y: ry * 0.1, size: r * 1.5 });
}

export default {
  id: 'balloons',
  name: 'Balloon Party',
  ageBand: '3–24 months',
  kind: 'loop',
  defaults: { bpm: 116, music: 'dance', palette: 'primary' },

  init({ W, H, rng, loopSeconds, bpm, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'primary', options.theme || null);
    const n = options.count || rng.int(8, 11);
    const colors = pal.theme ? pal.pops : BRIGHTS;
    const balloons = Array.from({ length: n }, (_, i) => ({
      x: rng.range(0.06, 0.94) * W,
      r: H * rng.range(0.07, 0.12),
      color: colors[i % colors.length],
      k: rng.int(1, 2),
      off: rng.range(0, 1),
      wob: rng.int(1, 3),
      amp: W * rng.range(0.01, 0.04),
      beatOff: i % 2 ? 0.5 : 0,
      blinkOff: rng.range(0, 3),
      ph: rng.range(0, TAU),
      turns: rng.int(3, 5),
      curlK: rng.int(1, 3),
    })).sort((a, b) => a.r - b.r);
    const paper = pal.theme ? [...pal.pops, ...BRIGHTS.slice(0, 3)] : BRIGHTS;
    const pieces = makeConfetti(rng, paper, W, H, options.confetti || 30, { scale: 0.85 });
    const stickers = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 6) : [];
    const twinkles = Array.from({ length: 10 }, () => ({ x: rng.range(0.03, 0.97) * W, y: rng.range(0.05, 0.6) * H, k: rng.int(2, 4), ph: rng.range(0, TAU) }));
    // beat-synced swings must close over the loop: pick the longest swing
    // period (in beats) that divides the loop's beat count
    const nb = Math.round((loopSeconds * bpm) / 60);
    const swing = nb % 4 === 0 ? 4 : nb % 2 === 0 ? 2 : 1;
    const pulseP = nb % 2 === 0 ? 2 : 1;
    return { swing, pulseP, pal, balloons, back: pieces.filter((_, i) => i % 3), front: pieces.filter((_, i) => i % 3 === 0), stickers, twinkles, themed: !!pal.theme };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds }) {
    if (s.themed) {
      atmosphere(ctx, W, H, { bg: s.pal.bg, pops: s.pal.pops, phase, bokeh: 10, vignette: 0.18 });
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, SKY_TOP); g.addColorStop(1, SKY_BOTTOM);
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      sunshine(ctx, W * 0.86, H * 0.2, H * 0.085, { phase, blink: blink(t, loopSeconds, 4.1, 0.7) });
      for (let i = 0; i < 3; i++) {
        const cw = W * (0.17 + 0.03 * (i % 2)), span = W + cw * 2;
        const cx = ((W * (0.12 + i * 0.34) + phase * span) % span) - cw;
        softCloud(ctx, cx, H * (0.16 + 0.12 * (i % 2)) + (i === 2 ? H * 0.3 : 0), cw);
      }
    }
    for (const tw of s.twinkles) {
      const a = Math.max(0, Math.sin(TAU * phase * tw.k + tw.ph));
      sparkle(ctx, tw.x, tw.y, H * 0.018 * a, '#ffffff', a * 0.8);
    }
    confetti(ctx, s.back, W, H, phase);
    for (const b of s.balloons) {
      const span = H + b.r * 6;
      const p = (phase * b.k + b.off) % 1;
      const y = H + b.r * 1.4 - p * span + Math.sin(TAU * (beat / s.swing + b.beatOff / 2)) * H * 0.02;
      const x = b.x + Math.sin(TAU * (phase * b.wob) + b.ph) * b.amp;
      const sq = 1 + 0.06 * pulse(beat / s.pulseP + b.beatOff);
      const tilt = wobble(t, loopSeconds / (b.wob + 1), b.ph) * 0.12;
      // far (small) balloons sit back in the air a little
      const depth = Math.max(0, (H * 0.12 - b.r) / (H * 0.05));
      const color = s.themed ? b.color : mixHex(b.color, SKY_BOTTOM, 0.18 * depth);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tilt);
      drawBalloon(ctx, b, color, sq, phase, H, {
        blink: blink(t, loopSeconds, 3.2, b.blinkOff),
        mouth: 0.25 + 0.5 * pulse(beat / s.pulseP + b.beatOff),
        cheeks: true,
        look: [Math.sin(TAU * phase * b.wob + b.ph) * 0.6, 0.15],
      });
      ctx.restore();
    }
    confetti(ctx, s.front, W, H, phase);
    if (s.stickers.length) confetti(ctx, s.stickers, W, H, phase);
    vignette(ctx, W, H, 0.12);
  },
};
