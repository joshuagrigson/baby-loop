// Garden — a row of smiling flowers that sway and bloom on the beat, with a bee
// and butterflies looping through and a ladybug strolling the grass. Layered
// hills, a hazy tree line and a soft rayed sun give depth. Periodic over the
// loop. Good for Spring, Morning Mood, Waltz-time pieces and lullabies.
import { TAU, pulse, blink, withAlpha, mixHex } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { vgradient, circle, ellipse, face, confetti, makeConfetti, shaded, vignette } from '../draw.mjs';
import { critter } from '../critters/index.mjs';

const PETALS = ['#ff6fae', '#ffd166', '#c5a3ff', '#7cc7ff', '#ff8c42', '#ff5a6e', '#8ee6a4', '#ffffff'];

// Soft lit cloud (shared by garden, rainbow-rain, sleepy-stars): a bright rim
// along the top edge, a soft body and a cool shaded belly, optional outline.
export function softCloud(ctx, x, y, w, { rim = '#ffffff', top = '#f7fbff', belly = '#c9daf0', outline = null, alpha = 1, rimW = 0.05 } = {}) {
  const h = w * 0.36;
  const puffs = [[0, 0.05, 0.5, 0.42], [-0.26, 0.14, 0.26, 0.34], [0.26, 0.12, 0.3, 0.38], [-0.08, -0.22, 0.26, 0.5], [0.14, -0.12, 0.22, 0.4]];
  const path = (dy = 0) => { ctx.beginPath(); for (const [px, py, rx, ry] of puffs) { ctx.moveTo(x + px * w + rx * w, y + py * h + dy); ctx.ellipse(x + px * w, y + py * h + dy, rx * w, ry * h * 1.1, 0, 0, TAU); } };
  ctx.save(); ctx.globalAlpha *= alpha;
  if (outline) { path(); ctx.strokeStyle = outline; ctx.lineWidth = w * 0.022; ctx.stroke(); }
  path(); ctx.fillStyle = belly; ctx.fill();
  ctx.save(); ctx.clip();
  path(-h * 0.14); ctx.fillStyle = rim; ctx.fill(); ctx.clip();
  const g = ctx.createLinearGradient(0, y - h * 0.7, 0, y + h * 0.4);
  g.addColorStop(0, top); g.addColorStop(1, mixHex(top, belly, 0.3));
  path(h * rimW * 2); ctx.fillStyle = g; ctx.fill();
  ctx.restore(); ctx.restore();
}

export default {
  id: 'garden',
  name: 'Flower Garden',
  ageBand: '3–36 months',
  kind: 'loop',
  defaults: { bpm: 96, music: 'learn', palette: 'pastel' },

  init({ W, H, rng, loopSeconds = 30, options = {} }) {
    const pal = pickPalette(rng, options.palette || 'pastel', options.theme || null);
    // Portrait (9:16 clips): fewer flowers across the narrow frame and sizes
    // from the short side, so blooms keep their landscape pixel size instead of
    // piling on top of each other. In landscape unit === H and n is unchanged.
    const portrait = H > W;
    const unit = Math.min(W, H);
    const drawn = options.count || rng.int(6, 8);
    const n = portrait && !options.count ? Math.max(4, Math.round(drawn * 0.6)) : drawn;
    const flowers = Array.from({ length: n }, (_, i) => ({
      x: (W / (n + 1)) * (i + 1) + rng.range(-W * 0.02, W * 0.02),
      h: unit * rng.range(0.26, 0.42),
      r: unit * rng.range(0.055, 0.08),
      petals: rng.int(5, 8),
      color: pal.theme ? rng.pick(pal.pops) : PETALS[i % PETALS.length],
      centre: rng.pick(['#ffd400', '#ffb400', '#ff8c1a']),
      phase: rng.range(0, TAU),
      beatOff: i % 2 ? 0.5 : 0,
      blinkOff: rng.range(0, 3),
    }));
    const hat = pal.theme?.hat || null;
    const flap = (hz) => Math.max(1, Math.round(loopSeconds * hz));   // integer wing beats per loop
    const flyers = [
      { kind: 'bee', y: H * 0.3, k: 1, off: 0.0, amp: H * 0.05, loops: 3, loopR: H * 0.07, size: unit * 0.11, flapK: flap(5) },
      { kind: 'butterfly', y: H * 0.2, k: 1, off: 0.5, amp: H * 0.07, loops: 2, loopR: H * 0.05, size: unit * 0.13, dir: -1, flapK: flap(1.4), color: '#ff7eb6' },
      { kind: 'butterfly', y: H * 0.42, k: 1, off: 0.2, amp: H * 0.05, loops: 2, loopR: H * 0.04, size: unit * 0.1, flapK: flap(1.7), color: '#7cc7ff', color2: '#fff3a6' },
      { kind: 'bee', y: H * 0.46, k: 1, off: 0.72, amp: H * 0.04, loops: 3, loopR: H * 0.05, size: unit * 0.09, dir: -1, flapK: flap(5.5) },
    ].map((f) => ({ ...f, hat, blinkOff: rng.range(0, 3) }));
    const trees = Array.from({ length: 16 }, (_, i) => ({ x: (i + rng.range(0, 0.6)) / 15 * W - W * 0.03, r: H * rng.range(0.05, 0.085), dy: rng.range(0, H * 0.025) }));
    const blades = Array.from({ length: 140 }, (_, i) => ({ x: (i + rng.range(0, 1)) / 140 * W, h: H * rng.range(0.04, 0.09), lean: rng.range(-0.25, 0.25), tone: rng.range(0, 1), ph: rng.range(0, TAU) }));
    const specks = Array.from({ length: 40 }, () => ({ x: rng.range(0, 1) * W, y: rng.range(0.7, 0.86) * H, c: rng.pick(['#ffffff', '#fff2a8', '#ffc2d9']) }));
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 10) : [];
    return { pal, flowers, flyers, trees, blades, specks, pieces, hat, unit };
  },

  draw(ctx, t, s, { W, H, phase, loopSeconds, bpm }) {
    // integer beat counters per loop (loops are whole bars, 3/4 or 4/4) so beat motion always closes
    const nB = Math.max(1, Math.round((loopSeconds * bpm) / 60)), b2 = phase * Math.max(1, Math.round(nB / 2)), cyc = phase * Math.max(1, Math.round(nB / 4));
    const themed = !!s.pal.theme;
    vgradient(ctx, W, H, themed ? '#ffd76a' : '#6cc4ff', themed ? '#fff3c9' : '#e6f7ff');
    // clouds drift exactly one wrap per loop
    for (let i = 0; i < 3; i++) {
      const cw = W * (0.2 - i * 0.03), span = W + cw * 1.6;
      const cx = ((W * (0.12 + i * 0.37) + phase * span) % span) - cw * 0.8;
      softCloud(ctx, cx, H * (0.12 + 0.08 * (i % 2)), cw, { alpha: 0.95 });
    }
    // sun: soft glow, slowly turning rays (symmetry makes 1/12 turn a full cycle)
    const unit = s.unit || H;
    const sx = W * 0.84, sy = H * 0.17, sr = unit * 0.075;
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.8, sx, sy, sr * 4);
    glow.addColorStop(0, withAlpha('#fff3b0', 0.8)); glow.addColorStop(0.35, withAlpha('#fff3b0', 0.25)); glow.addColorStop(1, withAlpha('#fff3b0', 0));
    ctx.fillStyle = glow; ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
    ctx.save(); ctx.translate(sx, sy); ctx.rotate(phase * TAU / 12 * 2);
    for (let i = 0; i < 12; i++) {
      ctx.rotate(TAU / 12);
      const len = sr * (i % 2 ? 1.55 : 1.8) * (1 + 0.05 * Math.sin(TAU * phase * 4 + (i % 2) * Math.PI));
      ctx.beginPath(); ctx.moveTo(-sr * 0.16, -sr * 1.1); ctx.quadraticCurveTo(0, -len * 1.05, sr * 0.16, -sr * 1.1); ctx.closePath();
      ctx.fillStyle = withAlpha('#ffd23f', 0.85); ctx.fill();
    }
    ctx.restore();
    circle(ctx, sx, sy, sr, shaded(ctx, '#ffd84a', sr, sx, sy, 0.8), '#e8a317', H * 0.004);
    face(ctx, { x: sx, y: sy, size: sr * 1.6, blink: blink(t, loopSeconds, 4.2, 1.1), mouth: 0.1, eyeScale: 0.85, brows: false });
    // far hills + hazy tree line + mid hills
    const hill = (base, amp, f, off, c1, c2) => {
      ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, base + Math.sin(x / W * TAU * f + off) * amp + Math.sin(x / W * TAU * f * 2.3 + off * 2) * amp * 0.35);
      ctx.lineTo(W, H); ctx.closePath();
      const g = ctx.createLinearGradient(0, base - amp, 0, base + H * 0.2);
      g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill();
    };
    hill(H * 0.6, H * 0.035, 1.2, 0.8, themed ? '#b9d99a' : '#a9d8b8', themed ? '#9cc88a' : '#8cc7a4');
    ctx.beginPath();
    for (const tr of s.trees) { const ty = H * 0.62 + tr.dy + Math.sin(tr.x / W * TAU * 1.2 + 0.8) * H * 0.03; ctx.moveTo(tr.x + tr.r, ty); ctx.arc(tr.x, ty, tr.r, 0, TAU); ctx.moveTo(tr.x + tr.r * 0.7 + tr.r * 0.5, ty - tr.r * 0.5); ctx.arc(tr.x + tr.r * 0.5, ty - tr.r * 0.5, tr.r * 0.7, 0, TAU); }
    const tg = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.68);
    tg.addColorStop(0, '#7fbf8e'); tg.addColorStop(1, '#5aa574'); ctx.fillStyle = tg; ctx.fill();
    for (const tr of s.trees) { const ty = H * 0.62 + tr.dy + Math.sin(tr.x / W * TAU * 1.2 + 0.8) * H * 0.03; ellipse(ctx, tr.x + tr.r * 0.2, ty - tr.r * 0.85, tr.r * 0.45, tr.r * 0.28, withAlpha('#d8f5c8', 0.35), -0.3); }
    hill(H * 0.69, H * 0.04, 0.8, 2.2, '#8fd46e', '#5fb455');
    hill(H * 0.8, H * 0.03, 0.6, 4.1, '#7ccc5a', '#4c9e45');
    for (const sp of s.specks) circle(ctx, sp.x, sp.y, H * 0.004, withAlpha(sp.c, 0.85));
    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);
    // flowers
    const ground = H * 0.9;
    for (const f of s.flowers) {
      const sway = Math.sin(TAU * phase * 2 + f.phase) * 0.12 + Math.sin(TAU * (cyc + f.beatOff / 2)) * 0.05;
      const bloom = 1 + 0.12 * pulse(b2 + f.beatOff);
      const topX = f.x + Math.sin(sway) * f.h, topY = ground - Math.cos(sway) * f.h;
      ctx.lineCap = 'round';
      const stem = () => { ctx.beginPath(); ctx.moveTo(f.x, ground + H * 0.02); ctx.quadraticCurveTo(f.x + Math.sin(sway) * f.h * 0.3, ground - f.h * 0.55, topX, topY); };
      stem(); ctx.strokeStyle = '#2f7d3d'; ctx.lineWidth = H * 0.02; ctx.stroke();
      stem(); ctx.strokeStyle = '#5cbf5a'; ctx.lineWidth = H * 0.011; ctx.stroke();
      for (const side of [-1, 1]) {
        const lx = f.x + side * H * 0.04 + Math.sin(sway) * f.h * (side < 0 ? 0.12 : 0.2), ly = ground - f.h * (side < 0 ? 0.28 : 0.45);
        ctx.save(); ctx.translate(lx, ly); ctx.rotate(side * 0.5 + sway * 0.5);
        ctx.beginPath(); ctx.moveTo(-side * H * 0.045, 0); ctx.quadraticCurveTo(0, -H * 0.03, side * H * 0.045, 0); ctx.quadraticCurveTo(0, H * 0.025, -side * H * 0.045, 0);
        ctx.fillStyle = shaded(ctx, '#5cbf5a', H * 0.045, 0, 0); ctx.fill(); ctx.strokeStyle = '#2f7d3d'; ctx.lineWidth = H * 0.004; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-side * H * 0.035, 0); ctx.lineTo(side * H * 0.03, -H * 0.003); ctx.strokeStyle = withAlpha('#d9ffb8', 0.7); ctx.lineWidth = H * 0.003; ctx.stroke();
        ctx.restore();
      }
      ctx.save();
      ctx.translate(topX, topY);
      ctx.rotate(Math.sin(TAU * phase + f.phase) * 0.3);
      const edge = mixHex(f.color, '#6a2a50', 0.45);
      for (const layer of [0, 1]) {
        for (let p = 0; p < f.petals; p++) {
          const a = ((p + layer * 0.5) / f.petals) * TAU;
          const rr = f.r * (layer ? 0.8 : 1.08) * bloom;
          const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
          ctx.beginPath(); ctx.ellipse(px, py, f.r * (layer ? 0.5 : 0.64) * bloom, f.r * (layer ? 0.32 : 0.4) * bloom, a, 0, TAU);
          ctx.fillStyle = shaded(ctx, layer ? mixHex(f.color, '#ffffff', 0.35) : f.color, f.r * 0.7, px, py, 0.9); ctx.fill();
          ctx.strokeStyle = withAlpha(edge, 0.55); ctx.lineWidth = H * 0.003; ctx.stroke();
        }
      }
      circle(ctx, 0, 0, f.r * 0.78, shaded(ctx, f.centre, f.r * 0.8), '#1b1b1b', H * 0.004);
      face(ctx, { x: 0, y: 0, size: f.r * 1.5, blink: blink(t, loopSeconds, 3.4, f.blinkOff), mouth: 0.25 + 0.4 * pulse(b2 + f.beatOff), cheeks: true, eyeScale: 0.95 });
      ctx.restore();
    }
    // grass blades in front, catching the light on their tips
    for (const b of s.blades) {
      const lean = b.lean + Math.sin(TAU * phase * 2 + b.ph) * 0.12;
      const bx = b.x, by = H + H * 0.01, tipX = bx + lean * b.h * 1.4, tipY = H * 0.905 - b.h * 0.6;
      const g = ctx.createLinearGradient(0, tipY, 0, by);
      g.addColorStop(0, mixHex('#b8f27a', '#8fe06a', b.tone)); g.addColorStop(1, mixHex('#3f9a3f', '#2e7d32', b.tone));
      ctx.beginPath(); ctx.moveTo(bx - H * 0.008, by); ctx.quadraticCurveTo(bx + lean * b.h * 0.3, (by + tipY) / 2, tipX, tipY); ctx.quadraticCurveTo(bx + lean * b.h * 0.4, (by + tipY) / 2, bx + H * 0.008, by); ctx.closePath();
      ctx.fillStyle = g; ctx.fill();
    }
    // ladybug strolls along the grass once per loop
    {
      const p = (phase + 0.3) % 1, lx = -H * 0.1 + p * (W + H * 0.2);
      const step = Math.abs(Math.sin(TAU * phase * Math.max(1, Math.round(loopSeconds * 1.5))));
      critter(ctx, 'ladybug', lx, H * 0.925 - step * H * 0.006, unit * 0.095, { tilt: (step - 0.5) * 0.08, blink: blink(t, loopSeconds, 3.7, 0.4), mouth: 0.4, hat: s.hat });
    }
    // flyers: cross the screen once per loop with gentle loop-de-loops
    for (const fl of s.flyers) {
      const p = (phase * fl.k + fl.off) % 1;
      const dir = fl.dir || 1;
      const span = W + 2 * fl.size;
      const la = TAU * p * fl.loops;
      const x = (dir > 0 ? -fl.size + p * span : W + fl.size - p * span) + dir * Math.sin(la) * fl.loopR;
      const y = fl.y + Math.sin(p * TAU * 2) * fl.amp - Math.cos(la) * fl.loopR;
      const dy = Math.cos(p * TAU * 2) * fl.amp * TAU * 2 + Math.sin(la) * fl.loopR * TAU * fl.loops;
      critter(ctx, fl.kind, x, y, fl.size, {
        flip: dir < 0, tilt: dir * Math.max(-0.35, Math.min(0.35, dy / (W * 1.2))) , flap: phase * fl.flapK,
        blink: blink(t, loopSeconds, 3.2, fl.blinkOff), mouth: 0.35 + 0.3 * pulse(b2), color: fl.color, color2: fl.color2, hat: fl.hat,
      });
    }
    vignette(ctx, W, H, 0.12);
  },
};
