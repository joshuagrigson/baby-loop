// 1280x720 thumbnail: a real frame from the episode's first visual segment,
// a two-line title in the top-left, a duration badge bottom-right.
import fs from 'node:fs';
import { getScene } from './scenes/index.mjs';
import { renderStill } from './render.mjs';
import { label, roundRect } from './draw.mjs';
import { withAlpha } from './easing.mjs';

export function renderThumbnail({ spec, segments = [], out, width = 1280, height = 720, totalSeconds = 0 }) {
  const seg = segments.find((s) => s.type === 'loop') || segments.find((s) => s.type !== 'title') || segments[0];
  const scene = getScene(seg?.scene || 'dancing-fruits');
  const bpm = seg?.bpm || 112;
  const t = scene.id === 'high-contrast' ? 3 : (60 / bpm) * 0.5; // mid-hop
  const { canvas, ctx } = renderStill({ scene, t, width, height, seconds: seg?.loopSeconds || 30, seed: seg?.seed || 1, bpm, options: seg?.options || {} });

  // title (max 2 lines)
  const text = spec.thumbnailText || spec.title || '';
  const lines = String(text).split(/\s*[|·]\s*/).slice(0, 2);
  const size = height * (lines.length > 1 ? 0.12 : 0.14);
  lines.forEach((l, i) => label(ctx, l, width * 0.04, height * 0.08 + i * size * 1.1, { size, align: 'left', baseline: 'top', fill: i === 0 ? '#ffffff' : '#ffe14d', stroke: '#1b1b1b', lw: size * 0.16, maxWidth: width * 0.92 }));

  // duration badge
  if (totalSeconds) {
    const mins = Math.round(totalSeconds / 60);
    const txt = mins >= 60 ? `${Math.round(mins / 60)} HR` : `${mins} MIN`;
    const bw = width * 0.2, bh = height * 0.12;
    roundRect(ctx, width - bw - width * 0.03, height - bh - height * 0.05, bw, bh, bh / 2, '#1b1b1b');
    roundRect(ctx, width - bw - width * 0.03 + 4, height - bh - height * 0.05 + 4, bw - 8, bh - 8, bh / 2, '#ffd400');
    label(ctx, txt, width - bw / 2 - width * 0.03, height - bh / 2 - height * 0.05 + 3, { size: bh * 0.6, fill: '#1b1b1b', stroke: null });
  }
  // subtle vignette so text always reads
  const g = ctx.createLinearGradient(0, 0, 0, height * 0.45);
  g.addColorStop(0, withAlpha('#000000', 0.18)); g.addColorStop(1, withAlpha('#000000', 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, width, height * 0.45);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  return out;
}
