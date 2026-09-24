// Bubbles — a sunlit underwater reef. Drawn sea critters swim across on gentle,
// beat-synced bobs; kelp sways, god-rays shimmer, a crab waves on the sand and
// glassy bubbles rise. Everything is exactly periodic over one loop: motion uses
// `phase` (0..1) times integers, beat motion uses the loop's whole beats.
import { TAU, withAlpha, mixHex, blink, bounce, pulse, beatFrac } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { circle, confetti, makeConfetti, shaded } from '../draw.mjs';
import { critter } from '../critters/index.mjs';

const OUT = '#1b1b1b';
const sandY = (x, W, H) => H * 0.83 + Math.sin((x / W) * TAU * 1.3 + 0.5) * H * 0.018 + Math.sin((x / W) * TAU * 3.1) * H * 0.008;

export default {
  id: 'bubbles',
  name: 'Bubbles',
  ageBand: '3–24 months',
  kind: 'loop',
  defaults: { bpm: 96, music: 'learn', palette: 'pastel' },

  init({ W, H, rng, loopSeconds, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'pastel', options.theme || null);
    const bubbles = Array.from({ length: options.count || 26 }, () => ({
      x: rng.range(0.03, 0.97) * W,
      r: H * rng.range(0.014, 0.06),
      k: rng.int(1, 3),                // rises per loop
      off: rng.range(0, 1),
      wob: rng.int(1, 3),              // horizontal wobbles per loop
      wobAmp: W * rng.range(0.01, 0.03),
      color: rng.pick(pal.pops),
      phase: rng.range(0, TAU),
    })).sort((a, b) => a.r - b.r);
    // swimmers: kind, lane (y), direction, start offset, size, laps per loop
    const swim = (kind, y, dir, off, size, laps = 1, color) => ({ kind, y: H * y, dir, off, size: H * size, laps, color, beatOff: rng.pick([0, 0.5]), blinkOff: rng.range(0, 3), look: rng.range(0, TAU) });
    const swimmers = [
      swim('whale', 0.2, 1, 0.1, 0.24),
      swim('dolphin', 0.33, -1, 0.72, 0.19),
      swim('fish', 0.44, -1, 0.6, 0.12, 2, '#ff5fa2'),
      swim('pufferfish', 0.47, 1, 0.55, 0.13),
      swim('octopus', 0.53, -1, 0.22, 0.16),
      swim('fish', 0.58, 1, 0.35, 0.14, 2, '#ff9a1f'),
      swim('fish', 0.66, -1, 0.05, 0.11, 2, '#8a7bff'),
      swim('turtle', 0.7, 1, 0.82, 0.16),
    ];
    const jelly = { x: W * 0.8, size: H * 0.17, off: 0.3, blinkOff: 1.1 };
    const seahorse = { x: W * 0.1, y: H * 0.56, size: H * 0.19, blinkOff: 2.2 };
    const crab = { x: W * 0.68, size: H * 0.13, blinkOff: 0.4 };
    const star = { x: W * 0.3, size: H * 0.11, blinkOff: 1.7 };
    // reef dressing (static layout, swaying over the loop)
    const nSway = Math.max(1, Math.round(loopSeconds / 4));
    const kelpCols = ['#2fb35a', '#46c46a', '#23a07a', '#6fd16b'];
    const kelp = [0.03, 0.07, 0.17, 0.46, 0.53, 0.88, 0.95].map((fx, i) => ({
      x: W * (fx + rng.range(-0.012, 0.012)), h: H * rng.range(0.22, 0.36), w: H * rng.range(0.045, 0.065), ph: rng.range(0, TAU), color: kelpCols[i % kelpCols.length],
    }));
    const farKelp = Array.from({ length: 9 }, (_, i) => ({ x: W * (0.05 + i * 0.11 + rng.range(-0.03, 0.03)), h: H * rng.range(0.2, 0.34), w: H * 0.03, ph: rng.range(0, TAU) }));
    const branch = (x, y, len, ang, depth, out) => {
      const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
      out.push([x, y, x2, y2, H * 0.012 * (depth + 1.2)]);
      if (depth > 0) for (const d of [-1, 1]) branch(x2, y2, len * rng.range(0.62, 0.8), ang + d * rng.range(0.3, 0.6), depth - 1, out);
      return out;
    };
    const corals = [
      { x: W * 0.23, color: '#ff6f91', segs: branch(W * 0.23, sandY(W * 0.23, W, H) + H * 0.01, H * 0.09, -Math.PI / 2 + 0.1, 3, []) },
      { x: W * 0.6, color: '#ff9f43', segs: branch(W * 0.6, sandY(W * 0.6, W, H) + H * 0.01, H * 0.075, -Math.PI / 2 - 0.15, 3, []) },
      { x: W * 0.9, color: '#c774e8', segs: branch(W * 0.9, sandY(W * 0.9, W, H) + H * 0.01, H * 0.07, -Math.PI / 2, 2, []) },
    ];
    for (const c of corals) { c.byW = new Map(); for (const sg of c.segs) { if (!c.byW.has(sg[4])) c.byW.set(sg[4], []); c.byW.get(sg[4]).push(sg); } }
    const pebbles = Array.from({ length: 14 }, () => {
      const x = rng.range(0.02, 0.98) * W;
      return { x, y: sandY(x, W, H) + H * rng.range(0.03, 0.14), r: H * rng.range(0.008, 0.02), color: rng.pick(['#a9b4c2', '#c9b79c', '#8e9bb0', '#d8c3a5']) };
    });
    const shells = [0.14, 0.41, 0.77].map((fx) => { const x = W * (fx + rng.range(-0.02, 0.02)); return { x, y: sandY(x, W, H) + H * rng.range(0.05, 0.11), r: H * rng.range(0.022, 0.03), rot: rng.range(-0.4, 0.4), color: rng.pick(['#ffc2d1', '#ffe0b3', '#fff1e0']) }; });
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 10) : [];
    const tint = pal.theme ? pal.bg : (pal.bg || '#bde7ff');
    const water = {
      top: mixHex('#a6ecff', tint, 0.08), mid: mixHex('#3cb2e8', tint, 0.06), deep: mixHex('#1768b3', tint, 0.05),
    };
    const hat = options.hat !== undefined ? options.hat : pal.theme?.hat || 'none';
    return { hat, pal, bubbles, swimmers, jelly, seahorse, crab, star, kelp, farKelp, corals, pebbles, shells, pieces, water, nSway, loopSeconds };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds }) {
    const { water } = s;
    const L = loopSeconds || s.loopSeconds;
    // water
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, water.top); g.addColorStop(0.45, water.mid); g.addColorStop(1, water.deep);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Math.ceil(H * 0.88));   // the sand covers the rest
    // surface shimmer
    ctx.save();
    ctx.strokeStyle = withAlpha('#ffffff', 0.35); ctx.lineWidth = H * 0.006; ctx.lineCap = 'round';
    for (let row = 0; row < 3; row++) {
      ctx.beginPath();
      const yy = H * (0.02 + row * 0.035);
      for (let x = 0; x <= W; x += W / 48) ctx.lineTo(x, yy + Math.sin((x / W) * TAU * (5 + row) + TAU * phase * (2 + row)) * H * 0.008);
      ctx.globalAlpha = 1 - row * 0.3; ctx.stroke();
    }
    ctx.restore();
    // god-rays: one shared fade gradient, per-ray alpha shimmer
    // (two interleaved groups, one fill each, shimmering out of step)
    const rg = ctx.createLinearGradient(0, 0, 0, H * 0.85);
    rg.addColorStop(0, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.fillStyle = rg;
    for (let grp = 0; grp < 2; grp++) {
      ctx.beginPath();
      for (let i = grp; i < 7; i += 2) {
        const x = W * (0.02 + i * 0.16) + Math.sin(TAU * phase * 2 + i * 1.7) * W * 0.02;
        const w0 = W * (0.025 + 0.015 * (i % 3)), sk = W * 0.22;
        ctx.moveTo(x - w0, 0); ctx.lineTo(x + w0, 0); ctx.lineTo(x + w0 * 3 + sk, H * 0.85); ctx.lineTo(x - w0 * 2 + sk, H * 0.85); ctx.closePath();
      }
      ctx.globalAlpha = 0.26 + 0.14 * Math.sin(TAU * phase * (1 + grp) + grp * 2);
      ctx.fill();
    }
    ctx.restore();
    // far reef silhouettes + far kelp (depth)
    const far = mixHex(water.deep, water.mid, 0.35);
    ctx.fillStyle = withAlpha(far, 0.55);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 40) ctx.lineTo(x, H * 0.74 + Math.sin((x / W) * TAU * 2.2 + 1) * H * 0.03 + Math.sin((x / W) * TAU * 5.3) * H * 0.012);
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    for (const k of s.farKelp) kelpStrand(ctx, k, phase, s.nSway, H, withAlpha(far, 0.7), null);

    // seabed
    const top = H * 0.8;
    const sg = ctx.createLinearGradient(0, top, 0, H);
    sg.addColorStop(0, '#ffe8b5'); sg.addColorStop(0.35, '#f6d08e'); sg.addColorStop(1, '#d9a764');
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += W / 60) ctx.lineTo(x, sandY(x, W, H));
    ctx.lineTo(W, H); ctx.closePath();
    ctx.fillStyle = sg; ctx.fill();
    ctx.lineWidth = H * 0.006; ctx.strokeStyle = withAlpha('#c98f4a', 0.9); ctx.stroke();
    // sand ripples + caustic glints
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = withAlpha('#c28a4c', 0.35); ctx.lineWidth = H * 0.004;
    for (let i = 0; i < 18; i++) {
      const x = ((i * 0.618) % 1) * W, y = sandY(x, W, H) + H * (0.04 + ((i * 0.37) % 1) * 0.12);
      ctx.beginPath(); ctx.arc(x, y + H * 0.02, W * 0.03, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
    }
    ctx.strokeStyle = withAlpha('#ffffff', 0.35); ctx.lineWidth = H * 0.005;
    for (let i = 0; i < 12; i++) {
      const x = (((i * 0.43 + phase * (i % 2 ? 1 : -1)) % 1) + 1) % 1 * W, y = sandY(x, W, H) + H * (0.03 + ((i * 0.29) % 1) * 0.13);
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(TAU * phase * 3 + i);
      ctx.beginPath(); ctx.moveTo(x - W * 0.02, y); ctx.quadraticCurveTo(x, y - H * 0.012, x + W * 0.02, y); ctx.stroke();
    }
    ctx.restore();
    for (const pb of s.pebbles) {
      ctx.beginPath(); ctx.ellipse(pb.x, pb.y, pb.r * 1.3, pb.r, 0, 0, TAU);
      ctx.fillStyle = shaded(ctx, pb.color, pb.r * 1.3, pb.x, pb.y); ctx.fill(); ctx.lineWidth = Math.max(1, pb.r * 0.22); ctx.strokeStyle = OUT; ctx.stroke();
    }
    for (const sh of s.shells) shell(ctx, sh);

    // coral + kelp (front reef)
    for (const c of s.corals) coral(ctx, c, H);
    for (const k of s.kelp) kelpStrand(ctx, k, phase, s.nSway, H, null, k.color);

    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);

    // swimmers
    for (const f of s.swimmers) {
      const p = (phase * f.laps + f.off) % 1;
      const span = W + 2 * f.size;
      const x = f.dir > 0 ? -f.size + p * span : W + f.size - p * span;
      const lb = beat + f.beatOff;
      const hop = Math.sin(Math.PI * beatFrac(lb));
      const y = f.y + Math.sin(p * TAU * 3) * H * 0.02 - hop * H * 0.018;
      critter(ctx, f.kind, x, y, f.size, {
        flip: f.dir < 0, color: f.color, squash: bounce(lb, 8) * 0.35 - hop * 0.15, tilt: Math.sin(TAU * phase * 3 + f.look) * 0.06,
        wave: Math.sin(TAU * lb / 2), phase: (phase * Math.max(1, Math.round(L / 2)) + f.off) % 1,
        hat: s.hat, blink: blink(t, L, 3.3, f.blinkOff), mouth: 0.25 + 0.45 * pulse(lb / 2), look: [0.6, 0.1], brow: 0.35 + 0.5 * hop,
      });
    }
    // jellyfish drifting up with a pulse
    {
      const j = s.jelly, p = (phase + j.off) % 1;
      const y = H * 1.1 - p * H * 1.35, lb = beat / 2;
      critter(ctx, 'jellyfish', j.x + Math.sin(TAU * phase * 2) * W * 0.03, y, j.size, {
        squash: bounce(lb, 5) * 0.5 - 0.15, phase: (phase * Math.max(1, Math.round(L / 3))) % 1,
        hat: s.hat, blink: blink(t, L, 3.3, j.blinkOff), mouth: 0.2 + 0.5 * pulse(lb), look: [0.2, 0.3],
      });
    }



    // seahorse bobbing by the kelp
    {
      const sh = s.seahorse, lb = beat / 2;
      critter(ctx, 'seahorse', sh.x, sh.y + Math.sin(TAU * phase * 2) * H * 0.03 - Math.sin(Math.PI * beatFrac(lb)) * H * 0.012, sh.size, {
        tilt: Math.sin(TAU * phase * 2) * 0.06, wave: Math.sin(TAU * lb), squash: bounce(lb, 7) * 0.3,
        hat: s.hat, blink: blink(t, L, 3.3, sh.blinkOff), mouth: 0.25 + 0.45 * pulse(lb), look: [0.5, 0.1],
      });
    }
    // starfish + crab on the sand
    {
      const st = s.star, gy = sandY(st.x, W, H) + H * 0.07, land = bounce(beat, 7);
      critter(ctx, 'starfish', st.x, gy - st.size * 0.5, st.size, {
        squash: land * 0.4, tilt: 0.12 * Math.sin(Math.PI * beat / 2), wave: Math.sin(Math.PI * beat / 2),
        hat: s.hat, blink: blink(t, L, 3.3, st.blinkOff), mouth: 0.25 + 0.5 * pulse(beat / 2), look: [0, 0.2],
      });
      const c = s.crab, cx = c.x + Math.sin(TAU * phase * 2) * W * 0.07, cy = sandY(cx, W, H) + H * 0.06;
      const hop = Math.sin(Math.PI * beatFrac(beat));
      ctx.beginPath(); ctx.ellipse(cx, cy + c.size * 0.02, c.size * 0.45, c.size * 0.08, 0, 0, TAU); ctx.fillStyle = 'rgba(120,70,20,0.22)'; ctx.fill();
      critter(ctx, 'crab', cx, cy - c.size * 0.5 - hop * H * 0.01, c.size, {
        squash: bounce(beat, 8) * 0.5 - hop * 0.2, wave: Math.sin(TAU * beat / 2), tilt: Math.sin(TAU * phase * 4) * 0.05,
        hat: s.hat, blink: blink(t, L, 3.3, c.blinkOff), mouth: 0.3 + 0.5 * pulse(beat / 2), look: [Math.cos(TAU * phase * 2) * 0.8, 0.2],
      });
    }

    // bubbles
    for (const b of s.bubbles) {
      const span = H + 2 * b.r;
      const p = (phase * b.k + b.off) % 1;
      const y = H + b.r - p * span;
      const x = b.x + Math.sin(TAU * (phase * b.wob) + b.phase) * b.wobAmp;
      const bg = ctx.createRadialGradient(x - b.r * 0.3, y - b.r * 0.3, b.r * 0.1, x, y, b.r);
      bg.addColorStop(0, withAlpha('#ffffff', 0.25));
      bg.addColorStop(0.65, withAlpha(b.color, 0.08));
      bg.addColorStop(1, withAlpha(b.color, 0.5));
      ctx.fillStyle = bg;
      ctx.beginPath(); ctx.arc(x, y, b.r, 0, TAU); ctx.fill();
      circle(ctx, x, y, b.r, null, withAlpha('#ffffff', 0.75), Math.max(1.5, b.r * 0.07));
      ctx.strokeStyle = withAlpha('#ffffff', 0.95);
      ctx.lineWidth = Math.max(1.5, b.r * 0.1);
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(x, y, b.r * 0.68, Math.PI * 1.12, Math.PI * 1.45); ctx.stroke();
      circle(ctx, x + b.r * 0.35, y + b.r * 0.35, b.r * 0.08, withAlpha('#ffffff', 0.7));
      if (p > 0.96) {
        const q = (p - 0.96) / 0.04;
        circle(ctx, x, y, b.r * (1 + q * 0.8), null, withAlpha('#ffffff', 1 - q), b.r * 0.1 * (1 - q));
      }
    }
    // vignette (same look as draw.mjs vignette(), but only fills the ring
    // outside r = 0.5H where it is non-zero — saves ~40% of a full-screen pass)
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.05);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,10,30,0.16)');
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(W / 2 + H * 0.5, H / 2); ctx.arc(W / 2, H / 2, H * 0.5, 0, TAU, true);
    ctx.fillStyle = v; ctx.fill();
  },
};

// A swaying kelp ribbon rooted in the sand. fill = flat colour (far layer) or
// color = lit hex with outline (front layer).
function kelpStrand(ctx, k, phase, nSway, H, fill, color) {
  const N = 14, Lp = [], Rp = [];
  const base = H * 0.86;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = k.x + Math.sin(TAU * phase * nSway + k.ph - u * 2.2) * H * 0.05 * Math.pow(u, 1.3);
    const y = base - u * k.h;
    const w = k.w * (1 - 0.7 * u) * (0.8 + 0.3 * Math.sin(u * 9 + k.ph));
    Lp.push([x - w / 2, y]); Rp.push([x + w / 2, y]);
  }
  ctx.beginPath(); ctx.moveTo(Lp[0][0], Lp[0][1]);
  for (let i = 1; i <= N; i++) ctx.lineTo(Lp[i][0], Lp[i][1]);
  const tip = Lp[N], tipR = Rp[N];
  ctx.quadraticCurveTo((tip[0] + tipR[0]) / 2, tip[1] - k.w * 0.6, tipR[0], tipR[1]);
  for (let i = N - 1; i >= 0; i--) ctx.lineTo(Rp[i][0], Rp[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); return; }
  const g = ctx.createLinearGradient(k.x - k.w, 0, k.x + k.w, 0);
  g.addColorStop(0, mixHex(color, '#ffffff', 0.35)); g.addColorStop(0.5, color); g.addColorStop(1, mixHex(color, '#12352a', 0.35));
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = H * 0.005; ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.stroke();
  // midrib
  ctx.beginPath(); ctx.moveTo((Lp[0][0] + Rp[0][0]) / 2, Lp[0][1]);
  for (let i = 1; i < N; i++) ctx.lineTo((Lp[i][0] + Rp[i][0]) / 2, Lp[i][1]);
  ctx.lineWidth = H * 0.003; ctx.strokeStyle = withAlpha('#ffffff', 0.35); ctx.stroke();
}

// Branching coral: outline pass, colour pass, highlight pass, glossy tips.
function coral(ctx, c, H) {
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const pass = (col, extra, dx = 0, dy = 0, k = 1) => {           // one path per branch width
    ctx.strokeStyle = col;
    for (const [w, segs] of c.byW) {
      ctx.lineWidth = w * k + extra; ctx.beginPath();
      for (const [x1, y1, x2, y2] of segs) { ctx.moveTo(x1 + dx, y1 + dy); ctx.lineTo(x2 + dx, y2 + dy); }
      ctx.stroke();
    }
  };
  pass(OUT, H * 0.01);
  pass(mixHex(c.color, '#3a1d3a', 0.2), 0);
  pass(c.color, 0, -H * 0.003, -H * 0.002, 0.7);
  pass(withAlpha(mixHex(c.color, '#ffffff', 0.55), 0.8), 0, -H * 0.005, -H * 0.003, 0.25);
  for (const [, , x2, y2, w] of c.segs) if (w < H * 0.02) circle(ctx, x2, y2, w * 0.45, mixHex(c.color, '#ffffff', 0.4));
  ctx.restore();
}

// Scallop shell lying on the sand.
function shell(ctx, sh) {
  const { x, y, r, rot, color } = sh;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.moveTo(0, r * 0.5);
  for (let i = 0; i <= 5; i++) { const a = Math.PI * (1.1 + (i / 5) * 0.8); ctx.quadraticCurveTo(Math.cos(a - 0.08) * r * 1.15, Math.sin(a - 0.08) * r * 1.15, Math.cos(a) * r, Math.sin(a) * r); }
  ctx.closePath();
  ctx.fillStyle = shaded(ctx, color, r, 0, 0); ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.12); ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.strokeStyle = withAlpha(mixHex(color, '#b0602a', 0.6), 0.6); ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath();
  for (let i = 1; i < 5; i++) { const a = Math.PI * (1.1 + (i / 5) * 0.8); ctx.moveTo(0, r * 0.4); ctx.lineTo(Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9); }
  ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, r * 0.5, r * 0.3, r * 0.14, 0, 0, TAU); ctx.fillStyle = shaded(ctx, color, r * 0.3, 0, r * 0.5); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = Math.max(1, r * 0.1); ctx.stroke();
  ctx.restore();
}
