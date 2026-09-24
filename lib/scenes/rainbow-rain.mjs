// Rainbow Rain — smiling clouds drop gentle rain on the beat, puddles ripple, and
// a rainbow breathes in and out over the loop. Calm; pairs with Prelude in C,
// Clair de lune, Gymnopédie.
import { TAU, pulse, blink, withAlpha, smoothstep } from '../easing.mjs';
import { pickPalette } from '../palette.mjs';
import { vgradient, cloud, face, circle, ellipse, emoji, confetti, makeConfetti, vignette } from '../draw.mjs';

const RAINBOW = ['#ff5a5a', '#ff9f43', '#ffd93d', '#6bcB77', '#4d96ff', '#845ec2'];

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
      return { cx: c, dx: rng.range(-0.4, 0.4), k: rng.int(2, 4), off: rng.range(0, 1), len: H * rng.range(0.02, 0.04) };
    });
    const puddles = Array.from({ length: 5 }, (_, i) => ({ x: W * (0.1 + i * 0.2) + rng.range(-W * 0.04, W * 0.04), w: W * rng.range(0.1, 0.16) }));
    const flowers = Array.from({ length: 9 }, (_, i) => ({ x: W * (0.05 + i * 0.11), e: rng.pick(['🌷', '🌼', '🌻', '🌸']), size: H * rng.range(0.06, 0.09) }));
    const pieces = pal.theme ? makeConfetti(rng, pal.theme.confetti, W, H, 8) : [];
    return { pal, clouds, drops, puddles, flowers, pieces };
  },

  draw(ctx, t, s, { W, H, beat, phase, loopSeconds }) {
    vgradient(ctx, W, H, '#bfe3ff', '#f2fbff');
    // rainbow: fades in and out once per loop
    const glow = 0.25 + 0.75 * (0.5 - 0.5 * Math.cos(TAU * phase));
    ctx.save();
    ctx.lineCap = 'butt';
    RAINBOW.forEach((c, i) => {
      ctx.strokeStyle = withAlpha(c, 0.55 * glow); ctx.lineWidth = H * 0.028;
      ctx.beginPath(); ctx.arc(W / 2, H * 0.78, H * 0.62 - i * H * 0.028, Math.PI, TAU); ctx.stroke();
    });
    ctx.restore();
    if (s.pieces.length) confetti(ctx, s.pieces, W, H, phase);
    // ground
    ctx.fillStyle = '#8fd48f';
    ctx.beginPath(); ctx.ellipse(W / 2, H * 1.02, W * 0.75, H * 0.28, 0, 0, TAU); ctx.fill();
    ctx.fillRect(0, H * 0.9, W, H);
    for (const p of s.puddles) {
      ellipse(ctx, p.x, H * 0.9, p.w / 2, p.w / 8, withAlpha('#6fb7ff', 0.7));
      const f = (beat / 2) % 1;
      ellipse(ctx, p.x, H * 0.9, (p.w / 2) * (0.2 + f * 0.8), (p.w / 8) * (0.2 + f * 0.8), 'rgba(0,0,0,0)');
      ctx.strokeStyle = withAlpha('#ffffff', 0.8 * (1 - f)); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(p.x, H * 0.9, (p.w / 2) * (0.2 + f * 0.8), (p.w / 8) * (0.2 + f * 0.8), 0, 0, TAU); ctx.stroke();
    }
    for (const f of s.flowers) emoji(ctx, f.e, f.x, H * 0.86 + Math.sin(TAU * phase * 2 + f.x) * 3, f.size);
    // rain drops (periodic falls from cloud to ground)
    ctx.strokeStyle = withAlpha('#4d96ff', 0.75); ctx.lineWidth = Math.max(2, H * 0.004); ctx.lineCap = 'round';
    for (const d of s.drops) {
      const q = (phase * d.k + d.off) % 1;
      const x = d.cx.x + d.cx.drift * Math.sin(TAU * phase) + d.dx * d.cx.w;
      const y0 = d.cx.y + H * 0.06, y = y0 + q * (H * 0.88 - y0);
      const a = Math.min(1, q * 6) * (1 - smoothstep((q - 0.9) / 0.1));
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(x, y - d.len); ctx.lineTo(x, y); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // clouds with faces, bobbing on the beat
    for (const c of s.clouds) {
      const bob = Math.sin(Math.PI * (beat / 2 + c.beatOff)) * H * 0.012;
      const x = c.x + c.drift * Math.sin(TAU * phase), y = c.y + bob;
      cloud(ctx, x, y, c.w, '#ffffff');
      face(ctx, { x, y: y + c.w * 0.03, size: c.w * 0.42, blink: blink(t, loopSeconds, 3.1, c.blinkOff), mouth: 0.15 + 0.35 * pulse(beat / 2 + c.beatOff), cheeks: true, eyeScale: 0.9 });
    }
    // sun peeking
    circle(ctx, W * 0.92, H * 0.1, H * 0.07, '#ffd84a');
    face(ctx, { x: W * 0.92, y: H * 0.1, size: H * 0.12, blink: blink(t, loopSeconds, 4, 1), mouth: 0.1, cheeks: true, eyeScale: 0.8 });
    vignette(ctx, W, H, 0.1);
  },
};
