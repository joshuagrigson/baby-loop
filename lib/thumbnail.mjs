// 1280×720 thumbnail: a real frame from the episode's first visual segment,
// pushed in a little for a tighter composition, a two-line title with a
// gradient fill, heavy stroke and soft shadow, a duration badge, a vignette.
import fs from 'node:fs';
import { getScene } from './scenes/index.mjs';
import { renderStill } from './render.mjs';
import { makeCanvas } from './canvas.mjs';
import { label, roundRect } from './draw.mjs';
import { withAlpha } from './easing.mjs';

export function renderThumbnail({ spec, segments = [], out, width = 1280, height = 720, totalSeconds = 0 }) {
  const seg = segments.find((s) => s.type === 'loop') || segments.find((s) => s.type !== 'title') || segments[0];
  const scene = getScene(seg?.scene || 'dancing-fruits');
  const bpm = seg?.bpm || 112;
  const t = scene.id === 'high-contrast' ? 3 : (60 / bpm) * 0.5; // mid-hop
  // render 12 % larger and crop the centre → characters fill more of the frame
  const zoom = 1.12;
  const big = renderStill({ scene, t, width: Math.round(width * zoom), height: Math.round(height * zoom), seconds: seg?.loopSeconds || 30, seed: seg?.seed || 1, bpm, options: seg?.options || {} });
  const { canvas, ctx } = makeCanvas(width, height);
  ctx.drawImage(big.canvas, -(big.canvas.width - width) / 2, -(big.canvas.height - height) * 0.7, big.canvas.width, big.canvas.height);

  // top gradient so the title always reads
  const g = ctx.createLinearGradient(0, 0, 0, height * 0.5);
  g.addColorStop(0, withAlpha('#000000', 0.28)); g.addColorStop(1, withAlpha('#000000', 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, width, height * 0.5);

  const text = spec.thumbnailText || spec.title || '';
  const lines = String(text).split(/\s*[|·]\s*/).slice(0, 2);
  const size = height * (lines.length > 1 ? 0.13 : 0.15);
  lines.forEach((l, i) => label(ctx, l, width * 0.045, height * 0.07 + i * size * 1.08, {
    size, align: 'left', baseline: 'top', stroke: '#1b1b1b', lw: size * 0.17, maxWidth: width * 0.9, shadow: size * 0.18,
    gradient: i === 0 ? ['#ffffff', '#ffe9b0'] : ['#ffe14d', '#ffb400'],
  }));

  if (totalSeconds) {
    const mins = Math.round(totalSeconds / 60);
    const txt = mins >= 60 ? `${Math.round(mins / 60)} HOUR${mins >= 120 ? 'S' : ''}` : `${mins} MIN`;
    const bw = width * 0.21, bh = height * 0.115, bx = width - bw - width * 0.03, by = height - bh - height * 0.05;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
    roundRect(ctx, bx, by, bw, bh, bh / 2, '#1b1b1b');
    ctx.restore();
    const bg = ctx.createLinearGradient(0, by, 0, by + bh); bg.addColorStop(0, '#ffe14d'); bg.addColorStop(1, '#ffb400');
    roundRect(ctx, bx + 4, by + 4, bw - 8, bh - 8, bh / 2, bg);
    label(ctx, txt, bx + bw / 2, by + bh / 2 + 3, { size: bh * 0.56, fill: '#1b1b1b', stroke: null });
  }
  // vignette
  const v = ctx.createRadialGradient(width / 2, height / 2, height * 0.5, width / 2, height / 2, height * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,10,30,0.22)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, width, height);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}
