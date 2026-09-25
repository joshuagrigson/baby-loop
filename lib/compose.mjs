// Episode composer. Turns a spec (specs/*.json) into a finished, upload-ready
// MP4 + thumbnail + metadata:
//
//   loop   segments: render ONE beat-synced loop (video + seamless music),
//                    then repeat it losslessly with the concat demuxer
//   story  segments: narrate a picture-book from content/stories
//   rhyme  segments: narrate a Mother Goose rhyme from content/rhymes
//   lesson segments: narrated flashcards from content/lessons.json
//   title  segments: a short title card
//
// Video segments are stream-copied together (one x264 encode per unique loop),
// audio is one continuous WAV, and everything is muxed once at the end.
import fs from 'node:fs';
import path from 'node:path';
import { getScene } from './scenes/index.mjs';
import { renderVideo } from './render.mjs';
import { renderMusic, encodeWav, decodeWav, resample, snapBpm, SR } from './music.mjs';
import { speakAll } from './tts.mjs';
import { run } from './ffmpeg.mjs';
import { loadStory, loadRhyme, lessonItems, loadJson } from './content.mjs';
import { renderThumbnail } from './thumbnail.mjs';
import { buildMetadata } from './metadata.mjs';
import { PALETTES, getTheme } from './palette.mjs';

const fmtTime = (s) => { s = Math.round(s); const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; };

// ---- audio helpers ----------------------------------------------------------
function tileBed(m, seconds) {
  const n = Math.round(seconds * SR), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = i % m.samples; L[i] = m.L[j]; R[i] = m.R[j]; }
  return { L, R, n };
}

// Bed under narration: gain envelope dips around each clip, clips are added on top.
function mixNarration(bed, clips, { bedGain = 0.3, duckGain = 0.1, narrGain = 0.9, rampS = 0.35 } = {}) {
  const n = bed.n;
  const target = new Float32Array(n).fill(bedGain);
  for (const c of clips) {
    const a = Math.max(0, Math.round((c.at - 0.4) * SR)), b = Math.min(n, Math.round((c.at + c.mono.length / SR + 0.6) * SR));
    for (let i = a; i < b; i++) target[i] = duckGain;
  }
  // smooth: forward + backward one-pole
  const k = 1 / (rampS * SR);
  let g = bedGain;
  for (let i = 0; i < n; i++) { g += (target[i] - g) * k; target[i] = g; }
  g = target[n - 1];
  for (let i = n - 1; i >= 0; i--) { g += (target[i] - g) * k; target[i] = Math.min(target[i], g); }
  for (let i = 0; i < n; i++) { bed.L[i] *= target[i]; bed.R[i] *= target[i]; }
  for (const c of clips) {
    const start = Math.round(c.at * SR);
    let peak = 0; for (let i = 0; i < c.mono.length; i++) peak = Math.max(peak, Math.abs(c.mono[i]));
    const gg = narrGain * Math.min(1, 0.8 / (peak || 1));
    for (let i = 0, j = start; i < c.mono.length && j < n; i++, j++) { const v = c.mono[i] * gg; bed.L[j] += v; bed.R[j] += v; }
  }
  return bed;
}

function loadClip(wavPath) {
  const w = decodeWav(fs.readFileSync(wavPath));
  return resample(w.mono, w.sampleRate, SR);
}

// The concat demuxer resolves relative paths against the LIST file, so always write absolute ones.
function writeConcatList(file, entries) {
  fs.writeFileSync(file, entries.map((e) => `file '${path.resolve(e.path).replace(/'/g, "'\\''")}'`).join('\n') + '\n');
}

// ---- segment builders -------------------------------------------------------
export async function composeEpisode(specOrPath, { outDir, preview = false, log = console.log } = {}) {
  const spec = typeof specOrPath === 'string' ? loadJson(specOrPath) : specOrPath;
  const width = preview ? 640 : spec.width || 1920;
  const height = preview ? 360 : spec.height || 1080;
  const fps = preview ? 15 : spec.fps || 30;
  const work = path.join(outDir, 'work');
  fs.mkdirSync(work, { recursive: true });
  const tts = { cacheDir: path.join(outDir, '..', '.tts-cache'), voice: spec.voice, provider: spec.ttsProvider, lengthScale: spec.speechRate || 1.12 };
  const enc = { preset: preview ? 'ultrafast' : spec.preset || 'medium', crf: preview ? 28 : spec.crf || 18 };
  const roundUp = (sec) => Math.ceil(sec * fps - 1e-9) / fps;
  const baseSeed = spec.seed ?? 7;
  // Personalisation: spec.name (or --name) fills {name} tokens in titles, captions,
  // story/rhyme text and narration. Without a name, "{name}" phrases collapse to
  // their generic form ("Happy Birthday, {name}!" → "Happy Birthday!").
  const NAME = (spec.name || '').trim();
  const personalize = (str) => {
    if (str == null) return str;
    str = String(str);
    if (NAME) return str.replace(/\{name\}/gi, NAME);
    return str.replace(/,\s*\{name\}/gi, '').replace(/\{name\}'s\s*/gi, '').replace(/\s*\{name\}\s*/gi, ' ').replace(/\s+([!?.,])/g, '$1').trim();
  };
  if (NAME) {
    if (!spec.title || !/\{name\}/i.test(spec.title)) spec.title = spec.title ? `${spec.title} · for ${NAME}` : `For ${NAME}`;
    spec.title = personalize(spec.title);
    if (spec.thumbnailText) spec.thumbnailText = personalize(spec.thumbnailText);
    if (spec.hook) spec.hook = personalize(spec.hook);
  } else if (spec.title) spec.title = personalize(spec.title);

  const segments = [];
  const pieces = []; // segments + transitions, in order, for concat
  let cursor = 0;
  const transition = spec.transitions === undefined ? 'fade' : spec.transitions; // 'fade' | 'none'
  for (let i = 0; i < spec.segments.length; i++) {
    const seg = spec.segments[i];
    const tag = `seg-${String(i).padStart(2, '0')}`;
    const seed = seg.seed ?? baseSeed * 31 + i;
    const t0 = Date.now();
    let r;
    if (seg.type === 'loop' || !seg.type) r = await buildLoop({ seg, tag, seed });
    else if (seg.type === 'story') r = await buildStory({ seg, tag, seed });
    else if (seg.type === 'rhyme') r = await buildRhyme({ seg, tag, seed });
    else if (seg.type === 'lesson') r = await buildLesson({ seg, tag, seed });
    else if (seg.type === 'title') r = await buildTitle({ seg, tag, seed });
    else throw new Error(`Unknown segment type "${seg.type}" at index ${i}`);
    if (transition !== 'none' && segments.length) {
      const prev = segments[segments.length - 1];
      const tr = await buildTransition({ prev, next: r, tag: `tr-${String(i).padStart(2, '0')}` });
      cursor += tr.seconds;
      pieces.push(tr);
    }
    r.start = cursor; r.index = i; r.type = seg.type || 'loop';
    cursor += r.seconds;
    segments.push(r);
    pieces.push(r);
    log(`  ${tag} ${r.label.padEnd(28)} ${fmtTime(r.seconds).padStart(6)}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  }

  // ---- concat + mux (video stream-copied; audio loudness-normalised to -16 LUFS, 4 s tail fade)
  const vlist = path.join(work, 'video.txt'), alist = path.join(work, 'audio.txt');
  writeConcatList(vlist, pieces.flatMap((s) => (s.videoEntries || [s.video]).map((p) => ({ path: p }))));
  writeConcatList(alist, pieces.flatMap((s) => (s.audioEntries || [s.audio]).map((p) => ({ path: p }))));
  const total = cursor;
  const final = path.join(outDir, `${spec.id || 'episode'}${preview ? '-preview' : ''}.mp4`);
  const fadeStart = Math.max(0, total - 4);
  // Both concat lists feed the mux directly (video stream-copied, audio encoded once).
  await run(['-y', '-f', 'concat', '-safe', '0', '-i', vlist, '-f', 'concat', '-safe', '0', '-i', alist, '-map', '0:v:0', '-map', '1:a:0',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '44100', '-ac', '2',
    '-af', `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st=${fadeStart.toFixed(3)}:d=4`, '-shortest', '-movflags', '+faststart', final]);
  for (const s of segments) delete s._loopAudio;

  // ---- thumbnail + metadata + manifest
  const thumb = path.join(outDir, 'thumbnail.png');
  renderThumbnail({ spec, segments, out: thumb, totalSeconds: total });
  const meta = buildMetadata({ spec, segments, totalSeconds: total });
  fs.writeFileSync(path.join(outDir, 'meta.json'), JSON.stringify(meta, null, 2));
  const manifest = { id: spec.id, file: final, thumbnail: thumb, seconds: total, width, height, fps, segments: segments.map(({ video, audio, videoEntries, audioEntries, ...s }) => s) };
  fs.writeFileSync(path.join(outDir, 'episode.json'), JSON.stringify(manifest, null, 2));
  return { final, thumb, meta, manifest };

  // ---- builders (closures over width/height/fps/etc.) ----------------------
  async function buildLoop({ seg, tag, seed }) {
    const scene = getScene(seg.scene);
    const mode = seg.music || scene.defaults.music || 'dance';
    const bpm = snapBpm(seg.bpm || scene.defaults.bpm || 100, fps);
    const music = renderMusic({ mode, bpm, melody: seg.melody || 'generated', seed, fps });
    const loopSec = music.seconds;
    const frames = Math.round(loopSec * fps);
    if (Math.abs(frames / fps - loopSec) > 1e-6) throw new Error(`loop not frame-aligned: ${loopSec}s @ ${fps}fps`);
    const loopMp4 = path.join(work, `${tag}-loop.mp4`), loopWav = path.join(work, `${tag}-loop.wav`);
    const options = { ...(seg.options || {}), palette: seg.palette || seg.options?.palette || scene.defaults.palette, theme: seg.theme || seg.options?.theme || spec.theme || null };
    await renderVideo({ scene, seconds: loopSec, out: loopMp4, fps, width, height, seed, bpm, options, ...enc });
    fs.writeFileSync(loopWav, encodeWav(music.L, music.R));
    const minutes = preview ? Math.min(seg.minutes || 1, (loopSec * 2) / 60) : seg.minutes || 3;
    const repeat = Math.max(1, Math.ceil((minutes * 60) / loopSec));
    // No per-segment intermediate files: the final concat lists the loop itself
    // `repeat` times, so an 8-hour sleep video costs one loop + one final mux on disk.
    const video = loopMp4, audio = loopWav;
    const videoEntries = Array.from({ length: repeat }, () => loopMp4), audioEntries = Array.from({ length: repeat }, () => loopWav);
    return { video, audio, videoEntries, audioEntries, seconds: repeat * loopSec, label: seg.label || scene.name, scene: scene.id, seed, bpm, options, music: music.melody, loopSeconds: loopSec, repeat, ageBand: scene.ageBand, _loopAudio: music };
  }

  // Soft chapter change: the last frame of `prev` fades to white while its music
  // fades out, then the first frame of `next` fades in from white. 0.8 s total,
  // encoded once, so the loops themselves stay untouched and repeat cleanly.
  async function buildTransition({ prev, next, tag }) {
    const dur = roundUp(preview ? 0.5 : 0.8), half = dur / 2;
    const fa = path.join(work, `${tag}-a.png`), fb = path.join(work, `${tag}-b.png`);
    await run(['-y', '-sseof', '-0.08', '-i', prev.video, '-frames:v', '1', '-update', '1', fa]);
    await run(['-y', '-i', next.video, '-frames:v', '1', '-update', '1', fb]);
    const { loadImage } = await import('@napi-rs/canvas');
    const [ia, ib] = await Promise.all([loadImage(fa), loadImage(fb)]);
    const ease = (u) => u * u * (3 - 2 * u);
    const scene = {
      id: 'transition', init: () => ({}),
      draw(ctx, t, _s, { W, H }) {
        if (t < half) { ctx.drawImage(ia, 0, 0, W, H); ctx.fillStyle = `rgba(255,255,255,${ease(t / half)})`; }
        else { ctx.drawImage(ib, 0, 0, W, H); ctx.fillStyle = `rgba(255,255,255,${1 - ease((t - half) / half)})`; }
        ctx.fillRect(0, 0, W, H);
      },
    };
    const video = path.join(work, `${tag}.mp4`), audio = path.join(work, `${tag}.wav`);
    await renderVideo({ scene, seconds: dur, out: video, fps, width, height, seed: 1, bpm: 60, ...enc });
    // audio: prev's music continues (a loop is seamless, so its start IS its continuation) and fades out; then silence
    const n = Math.round(dur * SR), L = new Float32Array(n), R = new Float32Array(n);
    const m = prev._loopAudio;
    if (m) {
      const nf = Math.round(half * SR);
      for (let i = 0; i < nf; i++) { const g = 1 - i / nf; L[i] = m.L[i % m.samples] * g; R[i] = m.R[i % m.samples] * g; }
    }
    fs.writeFileSync(audio, encodeWav(L, R));
    return { video, audio, seconds: dur, label: '(transition)', type: 'transition' };
  }

  async function renderPages({ tag, seed, pages, bedMode, bpm, melody, clips, label, sceneId = 'story', bedGain = 0.28 }) {
    const total = pages[pages.length - 1].end;
    const scene = getScene(sceneId);
    const video = path.join(work, `${tag}.mp4`), audio = path.join(work, `${tag}.wav`);
    await renderVideo({ scene, seconds: total, out: video, fps, width, height, seed, bpm, options: { pages }, ...enc });
    const music = renderMusic({ mode: bedMode, bpm: snapBpm(bpm, fps), melody, seed, fps });
    const bed = tileBed(music, total);
    mixNarration(bed, clips, { bedGain, duckGain: bedGain * 0.35 });
    fs.writeFileSync(audio, encodeWav(bed.L, bed.R));
    return { video, audio, seconds: total, label, scene: sceneId, seed, bpm, music: music.melody, pages: pages.length, narrated: clips.length > 0 };
  }

  async function buildTitle({ seg, tag, seed }) {
    const seconds = roundUp(seg.seconds || 4);
    const theme = getTheme(seg.theme || spec.theme);
    const bgByTheme = { halloween: 'night', christmas: 'night', winter: 'sky', valentines: 'sunny', easter: 'meadow', spring: 'meadow', summer: 'ocean', thanksgiving: 'forest', birthday: 'sunny' };
    const pages = [{
      title: personalize(seg.text || (NAME && theme?.id === 'birthday' ? 'Happy Birthday, {name}!' : null) || theme?.title || spec.title), caption: personalize(seg.caption) || (NAME && theme?.id === 'birthday' ? `${NAME}'s party` : theme ? theme.name : ''),
      scene: seg.scene || { background: theme ? bgByTheme[theme.id] : 'sunny', props: seg.props || (theme ? theme.confetti.slice(0, 3) : ['🍓', '🍊', '🫐']), motion: 'bounce' },
      start: 0, end: seconds,
    }];
    return renderPages({ tag, seed, pages, bedMode: seg.music || 'learn', bpm: seg.bpm || 96, melody: seg.melody || 'generated', clips: [], label: seg.label || 'Title', bedGain: 0.35 });
  }

  async function buildStory({ seg, tag, seed }) {
    const story = loadStory(seg.story);
    const lines = story.pages.map((p) => personalize(p.text));
    const spoken = await speakAll(lines, tts);
    const lead = 0.9, gap = seg.pause ?? 1.5, minPage = seg.minPage ?? 4.5;
    const pages = [], clips = [];
    let t = 0;
    const titleSec = roundUp(preview ? 2.5 : 4);
    pages.push({ title: personalize(story.title), caption: NAME ? `A story for ${NAME}` : 'Story time', scene: story.pages[0].scene, start: 0, end: titleSec });
    t = titleSec;
    story.pages.forEach((p, k) => {
      const dur = roundUp(Math.max(minPage, lead + spoken[k].seconds + gap));
      pages.push({ ...p, text: lines[k], caption: personalize(p.caption), start: t, end: t + dur });
      clips.push({ at: t + lead, mono: loadClip(spoken[k].out) });
      t += dur;
    });
    const endSec = roundUp(preview ? 2.5 : 5);
    pages.push({ title: 'The End', caption: story.moral || '', scene: { ...story.pages[story.pages.length - 1].scene, motion: 'sway' }, start: t, end: t + endSec });
    return renderPages({ tag, seed, pages, bedMode: seg.music || 'lullaby', bpm: seg.bpm || 66, melody: seg.melody || 'brahms', clips, label: seg.label || story.title });
  }

  async function buildRhyme({ seg, tag, seed }) {
    const rhyme = loadRhyme(seg.rhyme);
    const per = seg.linesPerPage || 2;
    const groups = [];
    for (let i = 0; i < rhyme.lines.length; i += per) groups.push(rhyme.lines.slice(i, i + per));
    const spoken = await speakAll(groups.map((g) => g.join(' ')), tts);
    const lead = 0.8, gap = seg.pause ?? 1.2, minPage = seg.minPage ?? 4;
    const pages = [], clips = [];
    const titleSec = roundUp(preview ? 2 : 3.5);
    pages.push({ title: rhyme.title, caption: 'Mother Goose', scene: rhyme.scene, start: 0, end: titleSec });
    let t = titleSec;
    groups.forEach((g, k) => {
      const dur = roundUp(Math.max(minPage, lead + spoken[k].seconds + gap));
      pages.push({ caption: g.join('\n'), scene: { ...rhyme.scene, motion: k % 2 ? 'bounce' : rhyme.scene?.motion || 'sway' }, start: t, end: t + dur });
      clips.push({ at: t + lead, mono: loadClip(spoken[k].out) });
      t += dur;
    });
    return renderPages({ tag, seed, pages, bedMode: seg.music || 'learn', bpm: seg.bpm || 96, melody: seg.melody || rhyme.melody || 'generated', clips, label: seg.label || rhyme.title });
  }

  async function buildLesson({ seg, tag, seed }) {
    const items = lessonItems(seg.lesson, { limit: preview ? Math.min(seg.limit || 4, 4) : seg.limit || 0, hexes: PALETTES.primary.pops });
    const narrate = seg.narrate !== false;
    const spoken = narrate ? await speakAll(items.map((i) => i.say), tts) : [];
    const longest = spoken.reduce((m, s) => Math.max(m, s.seconds), 0);
    const perCard = roundUp(Math.max(seg.perCard || 5, 0.6 + longest + 1.4));
    const scene = getScene('flashcards');
    const total = perCard * items.length;
    const bpm = snapBpm(seg.bpm || scene.defaults.bpm, fps);
    const video = path.join(work, `${tag}.mp4`), audio = path.join(work, `${tag}.wav`);
    const options = { items, perCard, palette: seg.palette || 'primary', theme: seg.theme || spec.theme || null };
    const r = await renderVideo({ scene, seconds: total, out: video, fps, width, height, seed, bpm, options, ...enc });
    const clips = narrate ? r.state.cues.map((c, k) => ({ at: c.t, mono: loadClip(spoken[k].out) })) : [];
    const music = renderMusic({ mode: seg.music || 'learn', bpm, melody: seg.melody || 'generated', seed, fps });
    const bed = tileBed(music, total);
    mixNarration(bed, clips, { bedGain: 0.26, duckGain: 0.09 });
    fs.writeFileSync(audio, encodeWav(bed.L, bed.R));
    const names = { colors: 'Colors', shapes: 'Shapes', numbers: 'Counting 1–10', animals: 'Animal sounds', firstWords: 'First words' };
    return { video, audio, seconds: total, label: seg.label || names[seg.lesson] || seg.lesson, scene: 'flashcards', seed, bpm, music: music.melody, items: items.length, narrated: narrate, ageBand: scene.ageBand };
  }
}
