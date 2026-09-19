// Smoke test: every scene renders a non-blank frame, every melody renders a
// finite, frame-aligned loop, WAV round-trips, a 1-second video encodes, and
// every spec references known scenes / melodies / content. `npm test`
import fs from 'node:fs';
import path from 'node:path';
import { SCENES } from '../lib/scenes/index.mjs';
import { renderStill, renderVideo } from '../lib/render.mjs';
import { renderMusic, encodeWav, decodeWav, snapBpm } from '../lib/music.mjs';
import { melodyIds, MELODIES } from '../lib/melodies.mjs';
import { probeDuration } from '../lib/ffmpeg.mjs';
import { listStories, listRhymes, loadLessons, loadJson } from '../lib/content.mjs';
import { ROOT } from '../lib/canvas.mjs';

let failed = 0;
const check = (name, cond, extra = '') => { console.log(`${cond ? '✔' : '✖'} ${name}${extra ? '  ' + extra : ''}`); if (!cond) failed++; };
const outDir = path.join(ROOT, 'out', 'smoke'); fs.mkdirSync(outDir, { recursive: true });

// scenes
for (const scene of Object.values(SCENES)) {
  const { png, canvas } = renderStill({ scene, t: 1.7, width: 640, height: 360, seconds: 20, seed: 2, bpm: scene.defaults.bpm });
  const d = canvas.data();
  let distinct = new Set();
  for (let i = 0; i < d.length; i += 4 * 97) distinct.add((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
  check(`scene ${scene.id} renders`, png.length > 1000 && distinct.size > 8, `${distinct.size} colours sampled`);
}
// melodies
for (const id of [...melodyIds(), 'generated']) {
  const m = renderMusic({ mode: id === 'brahms' ? 'lullaby' : 'dance', bpm: id === 'brahms' ? 66 : 112, melody: id, seed: 1 });
  let bad = 0, peak = 0;
  for (let i = 0; i < m.L.length; i += 7) { if (!Number.isFinite(m.L[i])) bad++; peak = Math.max(peak, Math.abs(m.L[i])); }
  const frames = m.seconds * 30;
  check(`melody ${id}`, bad === 0 && peak > 0.15 && peak < 1 && Math.abs(frames - Math.round(frames)) < 1e-6, `${m.bars} bars, ${m.seconds.toFixed(2)}s, peak ${peak.toFixed(2)}`);
  if (MELODIES[id]) {
    const total = m.beats % m.meter;
    check(`melody ${id} fills whole bars`, total === 0);
  }
}
// wav round trip
{
  const m = renderMusic({ mode: 'learn', bpm: 96, melody: 'mary', seed: 4 });
  const w = decodeWav(encodeWav(m.L, m.R));
  check('wav encode/decode', w.sampleRate === 44100 && w.channels === 2 && Math.abs(w.seconds - m.seconds) < 1e-3);
}
// snapBpm
check('snapBpm 112→112.5 @30fps', snapBpm(112, 30) === 112.5);
// tiny video
{
  const out = path.join(outDir, 'one-second.mp4');
  const r = await renderVideo({ scene: SCENES['dancing-fruits'], seconds: 1, out, fps: 30, width: 640, height: 360, seed: 1, bpm: 112.5, preset: 'ultrafast', crf: 30 });
  check('1s video encodes', fs.existsSync(out) && fs.statSync(out).size > 5000 && Math.abs((probeDuration(out) || 0) - 1) < 0.1, `${r.frames} frames`);
}
// content + specs
const stories = new Set(listStories().map((s) => s.id)), rhymes = new Set(listRhymes().map((r) => r.id));
let lessons = {};
try { lessons = loadLessons(); } catch { /* optional */ }
check('content: stories present', stories.size >= 1, [...stories].join(', '));
check('content: rhymes present', rhymes.size >= 1, `${rhymes.size} rhymes`);
check('content: lessons present', Object.keys(lessons).length >= 5, Object.keys(lessons).join(', '));
for (const f of fs.readdirSync(path.join(ROOT, 'specs')).filter((f) => f.endsWith('.json'))) {
  const spec = loadJson(path.join(ROOT, 'specs', f));
  const problems = [];
  spec.segments.forEach((s, i) => {
    const type = s.type || 'loop';
    if (type === 'loop' && !SCENES[s.scene]) problems.push(`#${i} scene ${s.scene}`);
    if (s.melody && s.melody !== 'generated' && !MELODIES[s.melody]) problems.push(`#${i} melody ${s.melody}`);
    if (type === 'story' && !stories.has(s.story)) problems.push(`#${i} story ${s.story}`);
    if (type === 'rhyme' && !rhymes.has(s.rhyme)) problems.push(`#${i} rhyme ${s.rhyme}`);
    if (type === 'lesson' && !lessons[s.lesson]) problems.push(`#${i} lesson ${s.lesson}`);
  });
  check(`spec ${f}`, problems.length === 0 && spec.title && spec.id, problems.join('; '));
}
console.log(failed ? `\n${failed} check(s) failed` : '\nall good');
process.exit(failed ? 1 : 0);
