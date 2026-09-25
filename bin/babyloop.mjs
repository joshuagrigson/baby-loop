#!/usr/bin/env node
// BabyLoop CLI — see README.md
import fs from 'node:fs';
import path from 'node:path';
import { listScenes, getScene } from '../lib/scenes/index.mjs';
import { renderVideo, renderStill } from '../lib/render.mjs';
import { renderMusic, encodeWav, snapBpm } from '../lib/music.mjs';
import { MELODIES, melodyIds } from '../lib/melodies.mjs';
import { speak, ensureVoice, VOICES } from '../lib/tts.mjs';
import { composeEpisode } from '../lib/compose.mjs';
import { renderThumbnail } from '../lib/thumbnail.mjs';
import { ffmpegPath, probeStreams } from '../lib/ffmpeg.mjs';
import { fontFamilies } from '../lib/canvas.mjs';
import { loadJson, listStories, listRhymes } from '../lib/content.mjs';

const [, , cmd, ...rest] = process.argv;
const args = {}; const pos = [];
for (let i = 0; i < rest.length; i++) {
  const a = rest[i];
  if (a.startsWith('--')) {
    const k = a.slice(2);
    const v = rest[i + 1] !== undefined && !rest[i + 1].startsWith('--') ? rest[++i] : true;
    args[k] = v;
  } else pos.push(a);
}
const num = (k, d) => (args[k] !== undefined ? Number(args[k]) : d);
const str = (k, d) => (args[k] !== undefined ? String(args[k]) : d);

const HELP = `babyloop — faceless baby/toddler video factory

  babyloop scenes                              list scenes
  babyloop melodies                            list public-domain melodies
  babyloop still <scene> [--t 1.2] [--seed 1] [--bpm 112] [--w 1280 --h 720] [--out f.png]
  babyloop render <scene> [--seconds 20] [--seed 1] [--bpm 112] [--w 1920 --h 1080 --fps 30] [--out f.mp4]
  babyloop music [--mode dance|learn|lullaby] [--melody twinkle|…|generated] [--bpm 112] [--seed 1] [--out f.wav]
  babyloop say "text" [--voice amy|lessac|hfc_female|jenny] [--out f.wav]
  babyloop episode <spec.json> [--out-dir out/<id>] [--preview] [--name Mia]   ({name} tokens → Mia)
  babyloop thumbnail <spec.json> [--out thumb.png]
  babyloop content                             list stories / rhymes / lessons
  babyloop doctor                              check ffmpeg, piper, voices, fonts

  Products (sell direct to parents):
  babyloop order <birthday|goodnight|story> --name Mila [--age 2] [--say Meela]   made-to-order video → out/orders/
  babyloop library [--audio] [--out-dir out/library]                              the 10-hour Calm Library bundle
  babyloop album specs/albums/<id>.json                                           lullaby album (WAV/FLAC/MP3 + cover)
  babyloop clip specs/clips/<id>.json                                             9:16 demo clip for TikTok/Shorts/Reels
`;

async function main() {
  switch (cmd) {
    case 'scenes': {
      for (const s of listScenes()) console.log(`${s.id.padEnd(16)} ${s.name.padEnd(28)} ${s.ageBand.padEnd(14)} ${s.kind.padEnd(9)} bpm ${s.defaults.bpm} · ${s.defaults.music}`);
      break;
    }
    case 'melodies': {
      for (const id of melodyIds()) console.log(`${id.padEnd(10)} ${MELODIES[id].name.padEnd(40)} ${MELODIES[id].source}`);
      console.log(`${'generated'.padEnd(10)} Original pentatonic tune (seeded)          Procedural — always original`);
      break;
    }
    case 'still': {
      const scene = getScene(pos[0]);
      const out = str('out', `out/${scene.id}.png`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const { png } = renderStill({ scene, t: num('t', 1.2), width: num('w', 1280), height: num('h', 720), seconds: num('seconds', 30), seed: num('seed', 1), bpm: num('bpm', scene.defaults.bpm), options: parseOpts() });
      fs.writeFileSync(out, png);
      console.log(out);
      break;
    }
    case 'render': {
      const scene = getScene(pos[0]);
      const out = str('out', `out/${scene.id}.mp4`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const fps = num('fps', 30);
      const r = await renderVideo({ scene, seconds: num('seconds', 20), out, fps, width: num('w', 1920), height: num('h', 1080), seed: num('seed', 1), bpm: snapBpm(num('bpm', scene.defaults.bpm), fps), options: parseOpts(), onProgress: (i, n, s) => process.stdout.write(`\r  ${i}/${n} frames  ${(i / s).toFixed(1)} fps   `) });
      console.log(`\n${out}  ${r.frames} frames in ${r.renderSeconds.toFixed(1)}s`);
      break;
    }
    case 'music': {
      const out = str('out', 'out/music.wav');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const m = renderMusic({ mode: str('mode', 'dance'), bpm: num('bpm', 112), melody: str('melody', 'twinkle'), seed: num('seed', 1), fps: num('fps', 30) });
      fs.writeFileSync(out, encodeWav(m.L, m.R));
      console.log(`${out}  ${m.melody.name}  ${m.bars} bars  ${m.seconds.toFixed(3)}s @ ${m.bpm.toFixed(2)} bpm (frame-aligned)`);
      break;
    }
    case 'say': {
      const out = str('out', 'out/narration.wav');
      const r = await speak(pos.join(' '), { out, voice: str('voice', undefined), lengthScale: num('rate', 1.12) });
      console.log(`${r.out}  ${r.seconds.toFixed(2)}s`);
      break;
    }
    case 'episode': {
      const specPath = pos[0];
      if (!specPath) throw new Error('episode: spec path required');
      const spec = loadJson(specPath);
      if (args.name) spec.name = String(args.name);
      if (args.title) spec.title = String(args.title);
      const outDir = str('out-dir', `out/${spec.id || path.basename(specPath, '.json')}`);
      fs.mkdirSync(outDir, { recursive: true });
      const t0 = Date.now();
      console.log(`Composing "${spec.title}" → ${outDir}${args.preview ? '  (preview: 640x360@15, one loop each)' : ''}`);
      const r = await composeEpisode(spec, { outDir, preview: !!args.preview });
      console.log(`\n✔ ${r.final}\n  ${Math.floor(r.manifest.seconds / 60)} min ${Math.round(r.manifest.seconds % 60)} s · ${r.manifest.width}x${r.manifest.height}@${r.manifest.fps} · ${((Date.now() - t0) / 1000 / 60).toFixed(1)} min to build`);
      console.log(`  thumbnail ${r.thumb}\n  meta      ${path.join(outDir, 'meta.json')}  (title/description/tags for upload/upload.py)`);
      break;
    }
    case 'thumbnail': {
      const spec = loadJson(pos[0]);
      const out = str('out', `out/${spec.id}-thumbnail.png`);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      const first = spec.segments.find((s) => (s.type || 'loop') === 'loop') || {};
      renderThumbnail({ spec, segments: [{ type: 'loop', scene: first.scene || 'dancing-fruits', seed: first.seed || 1, bpm: first.bpm || 112, options: { palette: first.palette } }], out, totalSeconds: (spec.segments.reduce((a, s) => a + (s.minutes || 0), 0)) * 60 });
      console.log(out);
      break;
    }
    case 'content': {
      console.log('Stories:'); for (const s of listStories()) console.log(`  ${s.id.padEnd(32)} ${s.title} (${s.pages.length} pages)`);
      console.log('Rhymes:'); for (const r of listRhymes()) console.log(`  ${r.id.padEnd(32)} ${r.title}${r.melody ? '  ♪ ' + r.melody : ''}`);
      console.log('Lessons: colors, shapes, numbers, animals, firstWords');
      break;
    }
    case 'doctor': {
      const ok = (l, v) => console.log(`  ${v ? '✔' : '✖'} ${l}`);
      try { const p = ffmpegPath(); ok(`ffmpeg: ${p}`, true); } catch (e) { ok(`ffmpeg: ${e.message}`, false); }
      const fams = fontFamilies();
      ok(`display font: ${fams.find((f) => /fredoka|baloo/i.test(f)) || 'DejaVu Sans fallback (drop Fredoka-Variable.ttf into assets/fonts)'}`, true);
      ok(`emoji font: ${fams.find((f) => /emoji/i.test(f)) || 'MISSING — apt install fonts-noto-color-emoji'}`, fams.some((f) => /emoji/i.test(f)));
      try { const v = await ensureVoice(str('voice', undefined)); ok(`piper voice: ${v}`, true); } catch (e) { ok(`piper voice: ${e.message}`, false); }
      try { const r = await speak('Hello little one.', { out: 'out/doctor.wav' }); ok(`piper synthesis: ${r.seconds.toFixed(2)}s wav`, true); } catch (e) { ok(`piper synthesis: ${e.message.split('\n')[0]}`, false); }
      console.log(`  voices: ${Object.entries(VOICES).map(([k, v]) => `${k} (${v.note})`).join(', ')}`);
      console.log(`  stories: ${listStories().length}, rhymes: ${listRhymes().length}`);
      if (fs.existsSync('out/doctor.wav')) fs.unlinkSync('out/doctor.wav');
      break;
    }
    case 'probe': { console.log(probeStreams(pos[0]).join('\n')); break; }
    default: {
      // Product commands live in bin/commands/<name>.mjs and export run(args, pos).
      const here = path.dirname(new URL(import.meta.url).pathname);
      const mod = cmd && /^[a-z][a-z0-9-]*$/.test(cmd) ? path.join(here, 'commands', `${cmd}.mjs`) : null;
      if (mod && fs.existsSync(mod)) { await (await import(mod)).run(args, pos); break; }
      console.log(HELP);
      if (cmd && cmd !== 'help') process.exitCode = 1;
    }
  }
}

function parseOpts() {
  const o = {};
  if (args.palette) o.palette = args.palette;
  if (args.count) o.count = Number(args.count);
  if (args.options) Object.assign(o, JSON.parse(args.options));
  return o;
}

main().catch((e) => { console.error(`\n✖ ${e.message}`); process.exit(1); });
