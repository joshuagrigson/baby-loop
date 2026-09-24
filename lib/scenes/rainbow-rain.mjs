// Rainbow Rain — smiling lit clouds drop glossy raindrops, puddles ripple, a
// vivid rainbow glows behind, tulips and daisies nod, a bunny shelters under
// an umbrella and a snail enjoys the wet grass. Calm; pairs with Prelude in C,
// Clair de lune, Gymnopédie. Everything is periodic in `phase`.
import { TAU, pulse, blink, withAlpha, mixHex } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { vgradient, face, circle, ellipse, shaded, confetti, makeConfetti, vignette } from '../draw.mjs';
import { critter } from '../critters/index.mjs';
import { softCloud } from './garden.mjs';

const RAINBOW = ['#ff4d5e', '#ff9a3c', '#ffd83d', '#4fcf6a', '#3d9bff', '#8e5bd6'];
const FLOWER_COLS = ['#ff6fae', '#ff5a6e', '#ffb03a', '#c58bff', '#ff8fb1'];

function teardrop(ctx, x, y, r) {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 2.5);
  ctx.quadraticCurveTo(x + r * 1.1, y - r * 0.7, x + r, y);
  ctx.arc(x, y, r, 0, Math.PI);
  ctx.quadraticCurveTo(x - r * 1.1, y - r * 0.7, x, y - r * 2.5);
  ctx.closePath();
}

function tulip(ctx, r, col) {
  ctx.beginPath();
  ctx.moveTo(-r * 0.95, -r * 1.05); ctx.lineTo(-r * 0.42, -r * 0.5); ctx.lineTo(0, -r * 1.25); ctx.lineTo(r * 0.42, -r * 0.5); ctx.lineTo(r * 0.95, -r * 1.05);
  ctx.bezierCurveTo(r * 1.15, r * 0.25, r * 0.6, r * 0.9, 0, r * 0.9);
  ctx.bezierCurveTo(-r * 0.6, r * 0.9, -r * 1.15, r * 0.25, -r * 0.95, -r * 1.05);
  ctx.closePath();
  ctx.fillStyle = shaded(ctx, col, r * 1.1, 0, -r * 0.1); ctx.fill();
  ctx.lineJoin = 'round'; ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = r * 0.09; ctx.stroke();
  ellipse(ctx, -r * 0.45, -r * 0.35, r * 0.14, r * 0.3, withAlpha('#ffffff', 0.35), 0.3);
}

function daisy(ctx, r, col) {
  for (let p = 0; p < 12; p++) {
    const a = (p / 12) * TAU;
    ctx.beginPath(); ctx.ellipse(Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.95, r * 0.55, r * 0.22, a, 0, TAU);
    ctx.fillStyle = shaded(ctx, '#ffffff', r * 0.6, Math.cos(a) * r, Math.sin(a) * r, 0.5); ctx.fill();
    ctx.strokeStyle = withAlpha('#8a7aa8', 0.6); ctx.lineWidth = r * 0.05; ctx.stroke();
  }
  circle(ctx, 0, 0, r * 0.62, shaded(ctx, col, r * 0.62), '#1b1b1b', r * 0.08);
}

function umbrella(ctx, x, y, r, tilt) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  const n = 6, lw = r * 0.05, cols = ['#ff4d5e', '#ffd83d'], top = -r * 0.8;
  const xs = Array.from({ length: n + 1 }, (_, i) => r - (2 * r * i) / n);
  ctx.strokeStyle = '#1b1b1b'; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(0, r * 1.05); ctx.arc(r * 0.13, r * 1.05, r * 0.13, Math.PI, 0, true); ctx.stroke();
  const canopy = () => { ctx.beginPath(); ctx.ellipse(0, 0, r, -top, 0, Math.PI, TAU); for (let i = 1; i <= n; i++) ctx.quadraticCurveTo((xs[i - 1] + xs[i]) / 2, -r * 0.16, xs[i], 0); ctx.closePath(); };
  ctx.save(); canopy(); ctx.clip();
  for (let i = 0; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(xs[i] * 1.2, r * 0.05); ctx.lineTo(xs[i + 1] * 1.2, r * 0.05); ctx.closePath();
    ctx.fillStyle = shaded(ctx, cols[i % 2], r, -r * 0.2, -r * 0.3); ctx.fill();
  }
  ellipse(ctx, -r * 0.4, -r * 0.5, r * 0.3, r * 0.1, withAlpha('#ffffff', 0.45), -0.5);
  ctx.restore();
  ctx.lineWidth = lw * 0.6; for (let i = 1; i < n; i++) { ctx.beginPath(); ctx.moveTo(0, top); ctx.quadraticCurveTo(xs[i] * 0.7, top * 0.4, xs[i], 0); ctx.stroke(); }
  ctx.lineWidth = lw; canopy(); ctx.stroke();
  circle(ctx, 0, top - r * 0.06, r * 0.07, '#ffd83d', '#1b1b1b', lw * 0.8);
  ctx.restore();
}

export default {
  id: 'rainbow-rain',
  name: 'Rainbow Rain',
  ageBand: '3–24 months',
  kind: 'loop',
  defaults: { bpm: 84, music: 'lullaby', palette: 'pastel' },

  init({ W, H, rng, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'pastel', options.theme || null);
    const clouds = [0.2, 0.5, 0.8].map((fx, i) => ({
      x: W * fx, y: H * (0.17 + 0.05 * (i % 2)), w: W * rng.range(0.2, 0.26), blinkOff: rng.range(0, 3), beatOff: i % 2 ? 0.5 : 0, drift: rng.range(-1, 1) * W * 0.02,
    }));
    const drops = Array.from({ length: 60 }, () => {
      const c = rng.pick(clouds);
      return { cx: c, dx: rng.range(-0.36, 0.36), k: rng.int(2, 4), off: rng.range(0, 1), z: rng.range(0, 1) };
    });
    const puddles = Array.from({ length: 5 }, (_, i) => ({ x: W * (0.1 + i * 0.2) + rng.range(-W * 0.04, W * 0.04), w: W * rng.range(0.1, 0.16), off: rng.range(0, 1) }));
    const flowers = Array.from({ length: 9 }, (_, i) => ({
      x: W * (0.05 + i * 0.11) + rng.range(-W * 0.015, W * 0.015), kind: rng.pick(['tulip', 'tulip', 'daisy']), col: rng.pick(FLOWER_COLS),
      size: H * rng.range(0.035, 0.05), h: H * rng.range(0.07, 0.12), ph: rng.range(0, TAU), blinkOff: rng.range(0, 3),
    }));
    const blades = Array.from({ length: 90 }, (_, i) => ({ x: (i + rng.range(0, 1)) / 90 * W, h: H * rng.range(0.03, 0.06), lean: rng.range(-0.3, 0.3), tone: rng.range(0, 1), ph: rng.range(0, TAU) }));
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 8) : [];
    return { pal, clouds, drops, puddles, flowers, blades, pieces, hat: pal.theme?.hat || null };
  },

  draw(ctx, t, s, { W, H, phase, loopSeconds, bpm }) {
    // integer beat counters per loop (loops are whole bars, 3/4 or 4/4) so beat motion always closes
    const nB = Math.max(1, Math.round((loopSeconds * bpm) / 60)), b2 = phase * Math.max(1, Math.round(nB / 2)), cyc = phase * Math.max(1, Math.round(nB / 4));
    vgradient(ctx, W, H, '#8fd0ff', '#eef9ff');
    // sun peeking top-right, rays turn 1/6 turn per loop (alternating rays → seamless)
    const sx = W * 0.93, sy = H * 0.09, sr = H * 0.07;
    const sg = ctx.createRadialGradient(sx, sy, sr, sx, sy, sr * 3.5);
    sg.addColorStop(0, withAlpha('#fff3b0', 0.7)); sg.addColorStop(1, withAlpha('#fff3b0', 0));
    ctx.fillStyle = sg; ctx.fillRect(sx - sr * 3.5, sy - sr * 3.5, sr * 7, sr * 7);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate((phase * TAU) / 6);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      ctx.beginPath(); ctx.moveTo(-sr * 0.16, -sr * 1.1); ctx.quadraticCurveTo(0, -sr * (i % 2 ? 1.6 : 1.9), sr * 0.16, -sr * 1.1); ctx.closePath();
      ctx.fillStyle = withAlpha('#ffc83d', 0.9); ctx.fill();
    }
    ctx.restore();
    circle(ctx, sx, sy, sr, shaded(ctx, '#ffd84a', sr, sx, sy, 0.8), '#e8a317', H * 0.004);
    face(ctx, { x: sx, y: sy, size: sr * 1.6, blink: blink(t, loopSeconds, 4, 1), mouth: 0.1, cheeks: true, eyeScale: 0.85, brows: false });

    // rainbow: soft halo, vivid bands, glossy highlight; breathes once per loop
    const rcx = W / 2, rcy = H * 0.92, bw = H * 0.042, R = H * 0.76;
    const breathe = 0.85 + 0.15 * (0.5 - 0.5 * Math.cos(TAU * phase));
    ctx.save(); ctx.lineCap = 'butt';
    ctx.strokeStyle = withAlpha('#ffffff', 0.35 * breathe); ctx.lineWidth = bw * 8.5;
    ctx.beginPath(); ctx.arc(rcx, rcy, R - bw * 2.5, Math.PI, TAU); ctx.stroke();
    RAINBOW.forEach((c, i) => {
      const r = R - i * bw;
      ctx.strokeStyle = withAlpha(c, 0.22 * breathe); ctx.lineWidth = bw * 1.9;
      ctx.beginPath(); ctx.arc(rcx, rcy, r - bw / 2, Math.PI, TAU); ctx.stroke();
    });
    RAINBOW.forEach((c, i) => {
      const r = R - i * bw - bw / 2;
      ctx.strokeStyle = withAlpha(c, 0.92 * breathe); ctx.lineWidth = bw + 1;
      ctx.beginPath(); ctx.arc(rcx, rcy, r, Math.PI, TAU); ctx.stroke();
      ctx.strokeStyle = withAlpha(mixHex(c, '#ffffff', 0.55), 0.55 * breathe); ctx.lineWidth = bw * 0.22;
      ctx.beginPath(); ctx.arc(rcx, rcy, r + bw * 0.24, Math.PI * 1.04, Math.PI * 1.96); ctx.stroke();
    });
    ctx.strokeStyle = withAlpha('#ffffff', 0.7 * breathe); ctx.lineWidth = bw * 0.14;
    ctx.beginPath(); ctx.arc(rcx, rcy, R - bw * 0.12, Math.PI * 1.08, Math.PI * 1.45); ctx.stroke();
    ctx.restore();
    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);

    // rolling hills + meadow
    const hill = (base, amp, f, off, c1, c2) => {
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, base + Math.sin((x / W) * TAU * f + off) * amp);
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, base - amp, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill();
    };
    hill(H * 0.76, H * 0.03, 1.1, 0.5, '#a6e0a0', '#7cc47a');
    hill(H * 0.84, H * 0.02, 0.7, 2.4, '#8fd66e', '#4f9f45');

    // glossy raindrops: fall cloud → ground an integer number of times per loop, then splash
    for (const d of s.drops) {
      const q = (phase * d.k + d.off) % 1;
      const r = H * (0.006 + 0.006 * d.z);
      const x = d.cx.x + d.cx.drift * Math.sin(TAU * phase) + d.dx * d.cx.w;
      const y0 = d.cx.y + d.cx.w * 0.14, y1 = H * (0.86 + 0.1 * d.z);
      if (q < 0.9) {
        const y = y0 + (q / 0.9) * (y1 - y0);
        ctx.globalAlpha = Math.min(1, q * 12);
        teardrop(ctx, x, y, r);
        const g = ctx.createLinearGradient(x - r, 0, x + r, 0); g.addColorStop(0, '#a8dcff'); g.addColorStop(1, '#3d8cf0');
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = withAlpha('#1f5fbf', 0.8); ctx.lineWidth = r * 0.28; ctx.stroke();
        ellipse(ctx, x - r * 0.35, y - r * 0.35, r * 0.22, r * 0.4, withAlpha('#ffffff', 0.9), 0.3);
      } else {
        const sp = (q - 0.9) / 0.1;
        ctx.globalAlpha = 1 - sp;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.35;
        ctx.beginPath(); ctx.ellipse(x, y1, r * (1 + sp * 3), r * (0.3 + sp * 0.8), 0, 0, TAU); ctx.stroke();
        for (const side of [-1, 1]) circle(ctx, x + side * r * (1 + sp * 2.5), y1 - r * 3 * Math.sin(Math.PI * sp), r * 0.35, '#a8dcff');
      }
    }
    ctx.globalAlpha = 1;

    // flowers along the back of the meadow
    for (const f of s.flowers) {
      const sway = Math.sin(TAU * phase * 2 + f.ph) * 0.08 + Math.sin(TAU * cyc) * 0.04;
      const bx = f.x, by = H * 0.88, tx = bx + Math.sin(sway) * f.h, ty = by - Math.cos(sway) * f.h;
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#2f7d3d'; ctx.lineWidth = H * 0.012; ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx, by - f.h * 0.5, tx, ty); ctx.stroke();
      ctx.strokeStyle = '#5cbf5a'; ctx.lineWidth = H * 0.006; ctx.stroke();
      ellipse(ctx, bx + H * 0.018, by - f.h * 0.3, H * 0.024, H * 0.009, '#4fae4f', -0.5);
      ctx.save(); ctx.translate(tx, ty); ctx.rotate(sway);
      if (f.kind === 'tulip') tulip(ctx, f.size, f.col); else daisy(ctx, f.size, '#ffcf2e');
      face(ctx, { x: 0, y: f.kind === 'tulip' ? f.size * 0.05 : 0, size: f.size * (f.kind === 'tulip' ? 1.25 : 0.95), blink: blink(t, loopSeconds, 3.6, f.blinkOff), mouth: 0.1 + 0.3 * pulse(b2), brows: false, eyeScale: 1.05 });
      ctx.restore();
    }

    // puddles reflecting the sky, with expanding ripple rings (integer cycles)
    const py = H * 0.93;
    for (const p of s.puddles) {
      const rx = p.w / 2, ry = p.w / 9;
      ellipse(ctx, p.x, py + ry * 0.25, rx * 1.04, ry * 1.12, withAlpha('#3f7f3a', 0.45));
      const g = ctx.createLinearGradient(0, py - ry, 0, py + ry);
      g.addColorStop(0, '#5fb0ff'); g.addColorStop(0.6, '#a9dcff'); g.addColorStop(1, '#e6f6ff');
      ellipse(ctx, p.x, py, rx, ry, g);
      ctx.save(); ctx.beginPath(); ctx.ellipse(p.x, py, rx, ry, 0, 0, TAU); ctx.clip();
      for (let k = 0; k < 3; k++) {
        const f = (b2 + p.off + k / 3) % 1;
        ctx.strokeStyle = withAlpha('#ffffff', 0.85 * (1 - f)); ctx.lineWidth = H * 0.004;
        ctx.beginPath(); ctx.ellipse(p.x + rx * 0.2 * (k - 1), py, rx * (0.1 + f * 0.6), ry * (0.1 + f * 0.6), 0, 0, TAU); ctx.stroke();
      }
      ellipse(ctx, p.x - rx * 0.4, py - ry * 0.35, rx * 0.25, ry * 0.18, withAlpha('#ffffff', 0.6));
      ctx.restore();
    }

    // bunny under a striped umbrella, bobbing to the beat
    {
      const bx = W * 0.17, by = H * 0.84, bs = H * 0.17, hop = Math.abs(Math.sin(Math.PI * b2));
      const y = by - hop * H * 0.015;
      critter(ctx, 'bunny', bx, y, bs, { squash: (1 - hop) * 0.4 - 0.1, blink: blink(t, loopSeconds, 3.3, 0.7), mouth: 0.3 + 0.4 * pulse(b2), wave: 0.5, hat: s.hat });
      umbrella(ctx, bx + bs * 0.5, y - bs * 0.62, bs * 0.66, -0.28 + Math.sin(TAU * phase * 2) * 0.04);
    }
    // snail crawls across the front once per loop
    {
      const p = (phase + 0.15) % 1, ss = H * 0.12, x = -ss + p * (W + 2 * ss);
      const stretch = Math.sin(TAU * phase * Math.max(1, Math.round(loopSeconds / 1.5)));
      critter(ctx, 'snail', x, H * 0.935, ss, { squash: -0.15 * stretch, blink: blink(t, loopSeconds, 3.9, 2.1), mouth: 0.35, color: '#ff8fb1', hat: s.hat });
    }
    // foreground grass
    for (const b of s.blades) {
      const lean = b.lean + Math.sin(TAU * phase * 2 + b.ph) * 0.1, by = H * 1.01, tipX = b.x + lean * b.h * 1.4, tipY = H * 0.965 - b.h * 0.6;
      const g = ctx.createLinearGradient(0, tipY, 0, by); g.addColorStop(0, mixHex('#b8f27a', '#8fe06a', b.tone)); g.addColorStop(1, '#2e7d32');
      ctx.beginPath(); ctx.moveTo(b.x - H * 0.007, by); ctx.quadraticCurveTo(b.x + lean * b.h * 0.3, (by + tipY) / 2, tipX, tipY); ctx.quadraticCurveTo(b.x + lean * b.h * 0.4, (by + tipY) / 2, b.x + H * 0.007, by); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
    }

    // clouds with faces, lit from above with a bright rim, bobbing on the beat
    for (const c of s.clouds) {
      const bob = Math.sin(TAU * (cyc + c.beatOff / 2)) * H * 0.012;
      const x = c.x + c.drift * Math.sin(TAU * phase), y = c.y + bob;
      softCloud(ctx, x, y, c.w, { rim: '#ffffff', top: '#f4f8ff', belly: '#b7c8e6', outline: '#8ea6cf' });
      face(ctx, { x, y: y + c.w * 0.03, size: c.w * 0.42, blink: blink(t, loopSeconds, 3.1, c.blinkOff), mouth: 0.15 + 0.35 * pulse(b2 + c.beatOff), cheeks: true, eyeScale: 0.9 });
    }
    vignette(ctx, W, H, 0.1);
  },
};
