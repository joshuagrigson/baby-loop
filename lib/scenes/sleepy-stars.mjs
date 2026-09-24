// Sleepy Stars — wind-down. Navy gradient, twinkling stars, a dozing moon with
// floating Zs, soft moonlit clouds, layered night hills and a wooden fence. An
// owl naps on a post while a sheep, a bunny and a hedgehog each hop the fence
// once per loop, and a few fireflies drift by. Calm, low contrast, slow music.
import { TAU, withAlpha, mixHex } from '../easing.mjs';
import { PALETTES } from '../palette.mjs';
import { vgradient, circle, face, label, star, shaded, vignette, ellipse } from '../draw.mjs';
import { critter } from '../critters/index.mjs';
import { softCloud } from './garden.mjs';

const WOOD = mixHex('#b07f58', '#3a4a86', 0.3);

// A moonlit plank: shaded across its width (moon on the right), grain lines, a knot.
function plank(ctx, x, y, w, h, { pointed = false, vertical = true, seed = 0 } = {}) {
  ctx.beginPath();
  if (pointed) { ctx.moveTo(x, y + w * 0.5); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w, y + w * 0.5); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); }
  else ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.18);
  const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, mixHex(WOOD, '#141a33', 0.35)); g.addColorStop(0.55, WOOD); g.addColorStop(1, mixHex(WOOD, '#c9d4ff', 0.3));
  ctx.fillStyle = g; ctx.fill();
  ctx.save(); ctx.clip();
  ctx.strokeStyle = withAlpha('#2a1f33', 0.35); ctx.lineWidth = Math.max(1, Math.min(w, h) * 0.06);
  for (let i = 1; i <= 2; i++) {
    ctx.beginPath();
    if (vertical) { const gx = x + (w * i) / 3; ctx.moveTo(gx, y); ctx.bezierCurveTo(gx + w * 0.12, y + h * 0.3, gx - w * 0.12, y + h * 0.6, gx + w * 0.05 * (seed % 2 ? 1 : -1), y + h); }
    else { const gy = y + (h * i) / 3; ctx.moveTo(x, gy); ctx.bezierCurveTo(x + w * 0.3, gy + h * 0.15, x + w * 0.6, gy - h * 0.15, x + w, gy); }
    ctx.stroke();
  }
  const kx = vertical ? x + w * 0.5 : x + w * (0.25 + 0.5 * ((seed * 0.37) % 1)), ky = vertical ? y + h * (0.35 + 0.3 * ((seed * 0.61) % 1)) : y + h * 0.5;
  ellipse(ctx, kx, ky, Math.min(w, h) * 0.16, Math.min(w, h) * 0.1, withAlpha('#2a1f33', 0.4));
  ctx.restore();
  ctx.strokeStyle = withAlpha('#120e22', 0.75); ctx.lineWidth = Math.max(1.5, Math.min(w, h) * 0.08); ctx.lineJoin = 'round'; ctx.stroke();
}

export default {
  id: 'sleepy-stars',
  name: 'Sleepy Stars',
  ageBand: '0–36 months',
  kind: 'loop',
  defaults: { bpm: 66, music: 'lullaby', palette: 'sleepy' },

  init({ W, H, rng }) {
    const pal = PALETTES.sleepy;
    const stars = Array.from({ length: 90 }, () => ({
      x: rng.range(0, 1) * W, y: rng.range(0, 0.62) * H, r: H * rng.range(0.002, 0.006), k: rng.int(1, 4), ph: rng.range(0, TAU), big: rng.chance(0.12),
    }));
    const shooting = [{ at: 0.28, x0: W * 0.15, y0: H * 0.12 }, { at: 0.74, x0: W * 0.5, y0: H * 0.06 }];
    const fireflies = Array.from({ length: 6 }, (_, i) => ({
      cx: W * (0.1 + i * 0.16) + rng.range(-W * 0.03, W * 0.03), cy: H * rng.range(0.44, 0.62), ax: W * rng.range(0.03, 0.07), ay: H * rng.range(0.03, 0.06),
      kx: rng.int(1, 2), ky: rng.int(2, 3), kg: rng.int(2, 4), p1: rng.range(0, TAU), p2: rng.range(0, TAU), p3: rng.range(0, TAU), size: H * rng.range(0.04, 0.055), flip: i % 2 === 1,
    }));
    const motes = Array.from({ length: 14 }, () => ({ x: rng.range(0, 1) * W, y: rng.range(0.62, 0.95) * H, k: rng.int(1, 3), ph: rng.range(0, TAU) }));
    return { pal, stars, shooting, fireflies, motes };
  },

  draw(ctx, t, s, { W, H, phase, loopSeconds }) {
    const { pal } = s;
    vgradient(ctx, W, H, pal.top, pal.bottom);
    const hz = ctx.createLinearGradient(0, H * 0.4, 0, H * 0.75);
    hz.addColorStop(0, withAlpha('#6a5fb0', 0)); hz.addColorStop(1, withAlpha('#6a5fb0', 0.28));
    ctx.fillStyle = hz; ctx.fillRect(0, H * 0.4, W, H * 0.35);
    for (const st of s.stars) {
      const tw = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(TAU * phase * st.k + st.ph));
      if (st.big) { circle(ctx, st.x, st.y, st.r * 5, withAlpha(pal.star, 0.08 * tw)); star(ctx, st.x, st.y, st.r * 4, st.r * 1.4, 4, withAlpha(pal.star, tw)); }
      else circle(ctx, st.x, st.y, st.r * (0.8 + 0.4 * tw), withAlpha(pal.star, tw));
    }
    // shooting stars
    for (const sh of s.shooting) {
      const d = 1.2 / loopSeconds; // 1.2 s long
      const q = (phase - sh.at) / d;
      if (q >= 0 && q <= 1) {
        const x = sh.x0 + q * W * 0.25, y = sh.y0 + q * H * 0.18;
        const g = ctx.createLinearGradient(x - W * 0.08, y - H * 0.06, x, y);
        g.addColorStop(0, withAlpha(pal.star, 0)); g.addColorStop(1, withAlpha(pal.star, 1 - q * 0.6));
        ctx.strokeStyle = g; ctx.lineWidth = H * 0.006; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x - W * 0.08, y - H * 0.06); ctx.lineTo(x, y); ctx.stroke();
        circle(ctx, x, y, H * 0.008, pal.star);
      }
    }
    // moon: halo, soft shading, faint craters, sleeping face, floating Zs
    const mx = W * 0.74, my = H * 0.28 + Math.sin(TAU * phase) * H * 0.012, mr = H * 0.14;
    const glow = ctx.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 3);
    glow.addColorStop(0, withAlpha(pal.moon, 0.3)); glow.addColorStop(0.4, withAlpha(pal.moon, 0.09)); glow.addColorStop(1, withAlpha(pal.moon, 0));
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, mr * 3, 0, TAU); ctx.fill();
    circle(ctx, mx, my, mr, shaded(ctx, pal.moon, mr, mx, my, 0.7), withAlpha('#c9a860', 0.6), H * 0.004);
    for (const [cx, cy, cr] of [[-0.5, -0.45, 0.14], [0.55, -0.35, 0.1], [0.5, 0.5, 0.12], [-0.62, 0.3, 0.08]]) circle(ctx, mx + cx * mr, my + cy * mr, cr * mr, withAlpha('#d8b86a', 0.3));
    face(ctx, { x: mx, y: my, size: mr * 1.8, blink: 1, mouth: 0.05, cheeks: true, ink: '#6b5a2e', brows: false });
    for (let i = 0; i < 3; i++) {
      const p = (phase * 3 + i / 3) % 1;
      label(ctx, 'z', mx + mr * 0.9 + p * mr * 0.8 + i * 6, my - mr * 0.6 - p * mr * 1.4, { size: mr * (0.28 + 0.12 * i), fill: pal.star, stroke: null, alpha: Math.sin(p * Math.PI) * 0.9 });
    }
    // moonlit clouds: bright rim on top, soft bodies — one wrap per loop
    for (let i = 0; i < 3; i++) {
      const cw = W * (0.24 - i * 0.03), span = W + cw * 1.6;
      const cx = ((W * (0.05 + i * 0.4) + phase * span) % span) - cw * 0.8;
      softCloud(ctx, cx, H * (0.5 + 0.1 * (i % 2)), cw, { rim: '#aebcee', top: '#4d5f99', belly: '#2d3d72', rimW: 0.04 });
    }
    // layered night hills, each with a faint moonlit edge
    const hill = (base, amp, f, off, c1, c2, rim) => {
      ctx.beginPath(); ctx.moveTo(0, H);
      const pts = [];
      for (let x = 0; x <= W + 20; x += 20) { const y = base + Math.sin((x / W) * TAU * f + off) * amp + Math.sin((x / W) * TAU * f * 2.2 + off) * amp * 0.3; pts.push([x, y]); ctx.lineTo(x, y); }
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, base - amp, 0, H); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill();
      ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = withAlpha(rim, 0.3); ctx.lineWidth = H * 0.003; ctx.stroke();
    };
    hill(H * 0.66, H * 0.04, 1.1, 0.6, '#34498a', '#223466', '#9fb2f0');
    hill(H * 0.74, H * 0.035, 0.8, 2.1, '#26396f', '#18264f', '#8497da');
    hill(H * 0.85, H * 0.02, 0.6, 4.0, '#1b2a57', '#0d1735', '#7084c8');
    for (const m of s.motes) circle(ctx, m.x, m.y, H * 0.003, withAlpha('#d8ff8a', 0.25 + 0.25 * Math.sin(TAU * phase * m.k + m.ph)));

    // wooden fence: rails behind pointed posts
    const fy = H * 0.86, fx = W * 0.5, fw = W * 0.32, ph = H * 0.14, pw = W * 0.024;
    ellipse(ctx, fx, fy + H * 0.01, fw * 0.58, H * 0.018, withAlpha('#050a1f', 0.35));
    for (const [ry, seed] of [[fy - ph * 0.72, 3], [fy - ph * 0.36, 5]]) plank(ctx, fx - fw / 2 - pw, ry, fw + pw * 2, H * 0.022, { vertical: false, seed });
    const posts = 5;
    for (let i = 0; i < posts; i++) plank(ctx, fx - fw / 2 + (fw * i) / (posts - 1) - pw / 2, fy - ph, pw, ph, { pointed: true, seed: i + 1 });

    // owl napping on the right-hand post (slow breaths)
    const breaths = Math.max(1, Math.round(loopSeconds / 4));
    const osz = H * 0.13, ox = fx + fw / 2, oy = fy - ph - osz * 0.45;
    critter(ctx, 'owl', ox, oy, osz, { blink: 1, mouth: 0.1, squash: 0.08 * Math.sin(TAU * phase * breaths) });
    // sheep, bunny and hedgehog each cross once per loop and hop the fence
    const hoppers = [{ kind: 'sheep', off: 0, size: H * 0.15 }, { kind: 'bunny', off: 0.34, size: H * 0.14 }, { kind: 'hedgehog', off: 0.67, size: H * 0.12 }];
    const steps = Math.max(1, Math.round(loopSeconds / 2.5));
    for (const a of hoppers) {
      const p = (phase + a.off) % 1;
      const sx = -W * 0.12 + p * W * 1.24;
      const hq = (sx - fx) / (W * 0.13);
      const hop = Math.abs(hq) < 1 ? Math.sin((Math.PI / 2) * (1 - Math.abs(hq))) ** 1.5 : 0;
      const trot = Math.abs(Math.sin(TAU * phase * steps * 2 + a.off * TAU)) * (1 - hop);
      const ground = fy + H * 0.04;
      const sy = ground - a.size * 0.5 - hop * H * 0.2 - trot * H * 0.008;
      const tilt = Math.abs(hq) < 1 ? 0.25 * Math.sin(Math.PI * hq) : 0;
      ellipse(ctx, sx, ground, a.size * (0.35 - 0.15 * hop), a.size * 0.06, withAlpha('#050a1f', 0.3 * (1 - hop * 0.6)));
      critter(ctx, a.kind, sx, sy, a.size, { tilt, squash: 0.25 * (1 - trot) * (1 - hop) - 0.15 * hop, blink: 0.4, mouth: 0.1 });
    }
    // hush the foreground: a soft blue multiply so characters sit calmly in the night
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    const tint = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.7);
    tint.addColorStop(0, 'rgba(255,255,255,0)'); tint.addColorStop(1, 'rgba(176,186,236,1)');
    ctx.fillStyle = tint; ctx.fillRect(0, H * 0.45, W, H * 0.55);
    ctx.restore();
    // fireflies drifting on closed Lissajous paths, glowing softly in turn
    for (const f of s.fireflies) {
      const x = f.cx + f.ax * Math.sin(TAU * phase * f.kx + f.p1), y = f.cy + f.ay * Math.sin(TAU * phase * f.ky + f.p2);
      const g = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(TAU * phase * f.kg + f.p3));
      critter(ctx, 'firefly', x, y, f.size, { glow: g, flap: phase * Math.max(1, Math.round(loopSeconds * 3)), blink: 0.35, mouth: 0.1, flip: f.flip });
    }
    vignette(ctx, W, H, 0.22);
    void t;
  },
};
