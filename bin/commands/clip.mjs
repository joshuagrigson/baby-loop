// babyloop clip — vertical demo-reel clips for TikTok / Reels / Shorts.
//   babyloop clip specs/clips/<x>.json [--out-dir out/clips] [--preview] [--name Mia]
//   babyloop clip specs/clips            (a directory: render every spec in it)
// Each clip lands in <out-dir>/<id>/: <id>.mp4, cover.png, post.json, clip.json.
import fs from 'node:fs';
import path from 'node:path';
import { composeClip } from '../../lib/clip.mjs';
import { loadJson } from '../../lib/content.mjs';

export async function run(args = {}, pos = []) {
  const target = pos[0];
  if (!target) throw new Error('clip: spec path (or a directory of specs) required, e.g. specs/clips/fruit-hop-twinkle.json');
  const specs = fs.statSync(target).isDirectory()
    ? fs.readdirSync(target).filter((f) => f.endsWith('.json')).sort().map((f) => path.join(target, f))
    : [target];
  const only = args.only ? String(args.only).split(',') : null;
  const outRoot = args['out-dir'] ? String(args['out-dir']) : 'out/clips';
  const preview = !!args.preview;
  const results = [];
  for (const specPath of specs) {
    const spec = loadJson(specPath);
    if (only && !only.includes(spec.id)) continue;
    if (args.name) spec.name = String(args.name);
    const outDir = path.join(outRoot, spec.id || path.basename(specPath, '.json'));
    const t0 = Date.now();
    console.log(`Clip "${spec.id}" (${spec.scene} · ${spec.melody || 'generated'} · ${spec.seconds || 45}s) → ${outDir}${preview ? '  (preview: 540x960@15)' : ''}`);
    const r = await composeClip(spec, { outDir, preview });
    fs.rmSync(path.join(outDir, 'work'), { recursive: true, force: true });
    console.log(`✔ ${r.final}\n  cover  ${r.cover}\n  post   ${path.join(outDir, 'post.json')}  (TikTok ${r.post.tiktok.chars} chars · Shorts title ${r.post.youtubeShorts.titleChars} chars)\n  ${((Date.now() - t0) / 1000).toFixed(0)} s to build`);
    results.push(r);
  }
  return results;
}
