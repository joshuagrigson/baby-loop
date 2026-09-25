// 1280×720 thumbnail built like the ones top kids channels use:
//   1. the episode's first scene as a softly blurred, slightly darkened backdrop
//   2. two or three big hero characters from that scene, die-cut with a white
//      rim and a drop shadow so they pop off the background at phone size
//   3. a heavy two-line title (gradient fill, thick outline, shadow)
//   4. a duration badge ("30 MIN" / "1 HOUR") and a light vignette
// Faces stay large and centred-low so YouTube's own timestamp overlay (bottom
// right) never covers a face; the badge sits bottom-left for the same reason.
import fs from 'node:fs';
import { getScene } from './scenes/index.mjs';
import { renderStill } from './render.mjs';
import { makeCanvas } from './canvas.mjs';
import { label, roundRect, FRUITS } from './draw.mjs';
import { withAlpha } from './easing.mjs';
import { getTheme } from './palette.mjs';
import { drawProp } from './critters/props.mjs';
import { CRITTERS } from './critters/index.mjs';

// hero line-ups per scene: first available kinds are used
const HEROES = {
  'dancing-fruits': ['fruit:strawberry', 'fruit:orange', 'fruit:apple'],
  balloons: ['critter:bunny', 'critter:panda', 'critter:duck'],
  garden: ['critter:bee', 'critter:butterfly', 'critter:ladybug'],
  'rainbow-rain': ['critter:duck', 'critter:frog', 'critter:snail'],
  'sleepy-stars': ['critter:sheep', 'critter:owl', 'critter:bunny'],
  bubbles: ['critter:fish', 'critter:octopus', 'critter:turtle'],
  train: ['critter:lion', 'critter:panda', 'critter:elephant'],
  flashcards: ['fruit:apple', 'fruit:banana', 'fruit:grape'],
  story: ['critter:cow', 'critter:sheep', 'critter:duck'],
};
function available(tok) {
  const [type, kind] = tok.split(':');
  return type === 'fruit' ? FRUITS.includes(kind) : !!CRITTERS[kind];
}

// Draw fn onto its own layer, then composite it with a white die-cut rim and shadow.
function sticker(ctx, w, h, rim, drawFn) {
  const { canvas: layer, ctx: lx } = makeCanvas(w, h);
  drawFn(lx);
  const { canvas: sil, ctx: sx } = makeCanvas(w, h);
  sx.drawImage(layer, 0, 0);
  sx.globalCompositeOperation = 'source-in';
  sx.fillStyle = '#ffffff'; sx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.shadowColor = 'rgba(20,10,40,0.45)'; ctx.shadowBlur = rim * 2.2; ctx.shadowOffsetY = rim * 0.9;
  ctx.drawImage(sil, 0, 0);
  ctx.restore();
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.drawImage(sil, Math.cos(a) * rim, Math.sin(a) * rim);
  }
  ctx.drawImage(layer, 0, 0);
}

export function renderThumbnail({ spec, segments = [], out, width = 1280, height = 720, totalSeconds = 0 }) {
  const seg = segments.find((s) => s.type === 'loop') || segments.find((s) => s.type !== 'title') || segments[0];
  const scene = getScene(seg?.scene || 'dancing-fruits');
  const bpm = seg?.bpm || 112;
  const t = scene.id === 'high-contrast' ? 3 : (60 / bpm) * 0.5; // mid-hop
  const opts = seg?.options || {};
  const theme = opts.theme || spec.theme;
  const big = renderStill({ scene, t, width, height, seconds: seg?.loopSeconds || 30, seed: seg?.seed || 1, bpm, options: { ...opts, ...(theme ? { theme } : {}) } });
  const { canvas, ctx } = makeCanvas(width, height);

  let line = spec.thumbnailHeroes || HEROES[scene.id] || [];
  if (!spec.thumbnailHeroes && scene.id === 'dancing-fruits') {
    // vary the fruit line-up per episode (seeded) so a channel page doesn't repeat itself
    const seed = Math.abs(Number(spec.seed ?? seg?.seed ?? 1)) || 1;
    const pool = [...FRUITS];
    line = [];
    for (let i = 0; i < 3; i++) line.push('fruit:' + pool.splice((seed * 7 + i * 5) % pool.length, 1)[0]);
  }
  const heroes = line.filter(available).slice(0, 3);
  const heroHat = getTheme(theme)?.hat || null;
  // sleep episodes get calm, dozy heroes instead of party grins
  const sleepy = (seg?.music === 'lullaby') || (seg?.mode === 'lullaby') || /lullaby|sleep/i.test(spec.title || '') || scene.id === 'sleepy-stars';
  const heroFace = sleepy ? { mouth: 0.05, wave: 0.15, brow: 0.2, blink: 0.9 } : { mouth: 0.75, wave: 0.8, brow: 1, blink: 0 };
  const useHeroes = heroes.length >= 2 && scene.id !== 'high-contrast';

  // 1. backdrop
  ctx.save();
  if (useHeroes) { ctx.filter = `blur(${Math.round(height * 0.012)}px) saturate(1.15)`; ctx.drawImage(big.canvas, -width * 0.03, -height * 0.03, width * 1.06, height * 1.06); ctx.filter = 'none'; }
  else ctx.drawImage(big.canvas, 0, 0);
  ctx.restore();
  const g = ctx.createLinearGradient(0, 0, 0, height * 0.55);
  g.addColorStop(0, withAlpha('#000000', 0.34)); g.addColorStop(1, withAlpha('#000000', 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, width, height * 0.55);

  // 2. hero characters, biggest in the middle
  if (useHeroes) {
    const n = heroes.length;
    const layout = n === 3
      ? [{ x: 0.2, y: 0.69, s: 0.46, tilt: -0.12 }, { x: 0.8, y: 0.69, s: 0.46, tilt: 0.12 }, { x: 0.5, y: 0.66, s: 0.6, tilt: 0 }]
      : [{ x: 0.32, y: 0.67, s: 0.54, tilt: -0.1 }, { x: 0.7, y: 0.67, s: 0.54, tilt: 0.1 }];
    const order = n === 3 ? [heroes[1], heroes[2], heroes[0]] : heroes;
    order.forEach((tok, i) => {
      const L = layout[i];
      sticker(ctx, width, height, height * 0.012, (lx) => {
        lx.save(); lx.translate(width * L.x, height * (L.y - (tok.startsWith('critter') ? 0.045 : 0))); lx.rotate(L.tilt);
        drawProp(lx, tok, 0, 0, height * L.s, { ...heroFace, hat: heroHat, flip: L.x > 0.6 && tok.startsWith('critter') });
        lx.restore();
      });
    });
  }

  // 3. title
  const text = spec.thumbnailText || spec.title || '';
  const lines = String(text).split(/\s*[|·]\s*/).slice(0, 2);
  const size = height * (lines.length > 1 ? 0.125 : 0.15);
  lines.forEach((l, i) => label(ctx, l.toUpperCase(), width / 2, height * 0.05 + i * size * 1.04, {
    size, align: 'center', baseline: 'top', stroke: '#1b1b1b', lw: size * 0.2, maxWidth: width * (totalSeconds ? 0.7 : 0.92), shadow: size * 0.2,
    gradient: i === 0 ? ['#ffffff', '#ffe9b0'] : ['#ffe14d', '#ff9f00'],
  }));

  // 4. duration stamp, top-right (YouTube puts its own timestamp bottom-right,
  //    and the heroes own the bottom of the frame)
  if (totalSeconds) {
    const mins = Math.round(totalSeconds / 60);
    const [n, unit] = mins >= 60 ? [Math.round(mins / 60), mins >= 120 ? 'HOURS' : 'HOUR'] : [mins, 'MIN'];
    const r = height * 0.115, cx = width - r - width * 0.022, cy = r + height * 0.035;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(0.12);
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fillStyle = '#1b1b1b'; ctx.fill();
    ctx.restore();
    const bg = ctx.createLinearGradient(0, -r, 0, r); bg.addColorStop(0, '#ff6a88'); bg.addColorStop(1, '#d81f45');
    ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2); ctx.fillStyle = bg; ctx.fill();
    ctx.setLineDash([r * 0.08, r * 0.07]); ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = r * 0.035;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.78, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    label(ctx, String(n), 0, -r * 0.12, { size: r * 0.82, fill: '#ffffff', stroke: null });
    label(ctx, unit, 0, r * 0.45, { size: r * 0.3, fill: '#ffffff', stroke: null });
    ctx.restore();
  }
  const v = ctx.createRadialGradient(width / 2, height / 2, height * 0.55, width / 2, height / 2, height * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,10,30,0.2)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, width, height);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}
