// Demo-reel clips: 30–75 s vertical (1080×1920) cuts for TikTok / Reels /
// Shorts that send parents to the shop. One scene, one melody, an optional
// spoken hook at the start, a big caption in the platform-safe top third, and
// a 3 s end slate with a plain-text URL and a spoken sign-off.
//
//   babyloop clip specs/clips/<x>.json [--out-dir out/clips] [--preview]
//
// Output per clip: <id>.mp4 (H.264 High, 30 fps, AAC), cover.png (1080×1920),
// post.json (caption + hashtags + TikTok / Shorts / Instagram variants) and
// clip.json (what was rendered). Audio is loudness-normalised to -16 LUFS like
// the long-form composer.
//
// Safe zone (phone UI): caption text lives inside the middle 1080×1350 and the
// end-slate text stays above the bottom 300 px, so platform captions, the
// progress bar and the right-hand button column never cover it.
import fs from 'node:fs';
import path from 'node:path';
import { getScene } from './scenes/index.mjs';
import { renderVideo, renderStill, sceneInfo } from './render.mjs';
import { frameInfo } from './info.mjs';
import { renderMusic, encodeWav, decodeWav, resample, snapBpm, SR } from './music.mjs';
import { speakAll } from './tts.mjs';
import { run } from './ffmpeg.mjs';
import { loadJson } from './content.mjs';
import { label, roundRect, atmosphere, captionPill, shadow, FONT_DISPLAY, FRUITS } from './draw.mjs';
import { drawProp } from './critters/props.mjs';
import { CRITTERS } from './critters/index.mjs';
import { PALETTES, pickPalette } from './palette.mjs';
import { makeRng } from './rng.mjs';
import { TAU, clamp, smoothstep, easeOutBack, withAlpha } from './easing.mjs';

export const SHOP_URL = 'baby-loop.netlify.app/shop';
export const SHOP_HTTPS = 'https://baby-loop.netlify.app/shop';
const DEFAULT_SLATE_LINE = 'Made just for your little one';
const DEFAULT_SLATE_SAY = 'Made just for your little one at baby loop dot netlify dot app';

// Public-facing names, age bands and hashtags per scene (no "Dancing Fruit" —
// that phrasing is a registered mark, see PLAYBOOK §3).
export const SCENE_COPY = {
  'dancing-fruits': { name: 'Fruit Friends', ages: '3–18 months', tags: ['babysensory', 'fruitfriends', 'babydance'], heroes: ['fruit:strawberry', 'fruit:pear'] },
  'high-contrast': { name: 'High Contrast', ages: '0–3 months', tags: ['highcontrast', 'newborn', 'blackandwhite'], heroes: [] },
  bubbles: { name: 'Bubbles', ages: '3–24 months', tags: ['babysensory', 'visualtracking', 'bubbles'], heroes: ['critter:fish', 'critter:turtle'] },
  'sleepy-stars': { name: 'Sleepy Stars', ages: '0–36 months', tags: ['lullaby', 'babysleep', 'bedtime'], heroes: ['critter:sheep', 'critter:owl'] },
  garden: { name: 'Flower Garden', ages: '3–36 months', tags: ['babysensory', 'calmbaby', 'flowers'], heroes: ['critter:bee', 'critter:butterfly'] },
  'rainbow-rain': { name: 'Rainbow Rain', ages: '3–24 months', tags: ['babysensory', 'rainbow', 'calmbaby'], heroes: ['critter:duck', 'critter:frog'] },
  balloons: { name: 'Balloons', ages: '3–24 months', tags: ['babysensory', 'balloons', 'toddlerfun'], heroes: ['critter:bunny', 'critter:panda'] },
  train: { name: 'Animal Train', ages: '6–36 months', tags: ['toddlerlearning', 'animaltrain', 'toddlerfun'], heroes: ['critter:lion', 'critter:elephant'] },
};
const BASE_TAGS = ['babyloop', 'babyvideo', 'calmscreentime', 'momlife', 'dadlife', 'personalisedgift'];

// ---- audio helpers (same behaviour as compose.mjs, kept local so this file
// stays independent of the episode composer) ---------------------------------
function tileBed(m, seconds) {
  const n = Math.round(seconds * SR), L = new Float32Array(n), R = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = i % m.samples; L[i] = m.L[j]; R[i] = m.R[j]; }
  return { L, R, n };
}
function mixNarration(bed, clips, { bedGain = 0.3, duckGain = 0.1, narrGain = 0.9, rampS = 0.35 } = {}) {
  const n = bed.n;
  const target = new Float32Array(n).fill(bedGain);
  for (const c of clips) {
    const a = Math.max(0, Math.round((c.at - 0.4) * SR)), b = Math.min(n, Math.round((c.at + c.mono.length / SR + 0.6) * SR));
    for (let i = a; i < b; i++) target[i] = duckGain;
  }
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

// ---- text helpers -----------------------------------------------------------
function wrapLines(ctx, text, size, maxWidth) {
  const given = String(text).split('\n');
  ctx.font = `700 ${size}px ${FONT_DISPLAY}`;
  const out = [];
  for (const g of given) {
    const words = g.split(/\s+/).filter(Boolean);
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = w; } else line = test;
    }
    if (line) out.push(line);
  }
  return out;
}

// Big caption in the top third: white gradient text with a heavy outline over
// a soft dark band, so it reads on any scene at phone size.
function drawCaption(ctx, text, W, H, { pop = 1, alpha = 1, unit }) {
  if (!text || pop <= 0 || alpha <= 0) return;
  let size = unit * 0.095;
  let lines = wrapLines(ctx, text, size, W * 0.84);
  for (let i = 0; i < 6 && lines.length > 3; i++) { size *= 0.9; lines = wrapLines(ctx, text, size, W * 0.84); }
  const lh = size * 1.12;
  const cy = H * 0.235;                                  // block centre — inside the middle 1080×1350
  const top = cy - (lines.length * lh) / 2;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(W / 2, cy); ctx.scale(pop, pop); ctx.translate(-W / 2, -cy);
  ctx.font = `700 ${size}px ${FONT_DISPLAY}`;
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const pw = Math.min(W * 0.94, widest + size * 1.1), ph = lines.length * lh + size * 0.7;
  roundRect(ctx, W / 2 - pw / 2, top - size * 0.35, pw, ph, size * 0.5, withAlpha('#14101f', 0.3));
  lines.forEach((l, i) => label(ctx, l, W / 2, top + lh * (i + 0.5), {
    size, stroke: '#1b1b1b', lw: size * 0.2, gradient: i === 0 ? ['#ffffff', '#fff1c2'] : ['#ffe14d', '#ffab00'], shadow: size * 0.18, maxWidth: W * 0.9,
  }));
  ctx.restore();
}

const available = (tok) => { const [type, kind] = tok.split(':'); return type === 'fruit' ? FRUITS.includes(kind) : !!CRITTERS[kind]; };

// End slate: brand field, two heroes, the sign-off line, the URL in a pill and
// one plain-text offer line. Everything textual sits between 0.3 H and 0.78 H.
function drawSlate(ctx, u, W, H, { pal, heroes, line, url, offer, unit, phase }) {
  atmosphere(ctx, W, H, { bg: pal.bg, pops: pal.pops, phase, bokeh: 10, vignette: 0.22 });
  const pop = easeOutBack(clamp(u / 0.55));
  // heroes
  heroes.forEach((tok, i) => {
    const n = heroes.length;
    const x = W * (n === 1 ? 0.5 : 0.29 + 0.42 * i), y = H * 0.79;   // feet at 0.79 H: clear of the bottom 300 px
    const s = unit * (n === 1 ? 0.34 : 0.3) * pop;
    const hop = Math.abs(Math.sin(TAU * (u * 0.9 + i * 0.25)));
    shadow(ctx, x, y + s * 0.02, s * 0.85, 0.18);
    ctx.save(); ctx.translate(x, y - s * 0.5 - hop * s * 0.08); ctx.rotate((i ? 1 : -1) * 0.06);
    drawProp(ctx, tok, 0, 0, s, { mouth: 0.6, wave: 0.7, brow: 0.8, blink: 0, flip: i === 1 && tok.startsWith('critter') });
    ctx.restore();
  });
  // sign-off line
  ctx.save();
  ctx.translate(W / 2, H * 0.31); ctx.scale(pop, pop);
  const size = unit * 0.1;
  const lines = wrapLines(ctx, line, size, W * 0.86);
  lines.forEach((l, i) => label(ctx, l, 0, (i - (lines.length - 1) / 2) * size * 1.12, { size, stroke: '#1b1b1b', lw: size * 0.2, gradient: ['#ffffff', '#fff1c2'], shadow: size * 0.18, maxWidth: W * 0.88 }));
  ctx.restore();
  // URL pill (plain text; links are stripped on made-for-kids content)
  captionPill(ctx, url, W, H, { y: H * 0.43, size: unit * 0.068, alpha: smoothstep((u - 0.15) / 0.4), accent: '#ffcf5a' });
  // offer line
  label(ctx, offer, W / 2, H * 0.505, { size: unit * 0.05, fill: '#ffffff', stroke: '#1b1b1b', lw: unit * 0.008, alpha: smoothstep((u - 0.3) / 0.4), maxWidth: W * 0.86 });
}

// ---- the clip ---------------------------------------------------------------
export async function composeClip(specOrPath, { outDir, preview = false, log = console.log } = {}) {
  const spec = typeof specOrPath === 'string' ? loadJson(specOrPath) : { ...specOrPath };
  const id = spec.id || 'clip';
  const scene = getScene(spec.scene || 'dancing-fruits');
  if (scene.kind !== 'loop') throw new Error(`clip: scene "${scene.id}" is not a loop scene`);
  const width = preview ? 540 : spec.width || 1080, height = preview ? 960 : spec.height || 1920;
  const fps = preview ? 15 : spec.fps || 30;
  const unit = Math.min(width, height);
  fs.mkdirSync(outDir, { recursive: true });
  const work = path.join(outDir, 'work'); fs.mkdirSync(work, { recursive: true });
  const roundUp = (sec) => Math.ceil(sec * fps - 1e-9) / fps;

  // personalisation ({name} tokens, like the composer)
  const NAME = (spec.name || '').trim();
  const personalize = (str) => {
    if (str == null) return str;
    str = String(str);
    if (NAME) return str.replace(/\{name\}/gi, NAME);
    return str.replace(/,\s*\{name\}/gi, '').replace(/\{name\}'s\s*/gi, '').replace(/\s*\{name\}\s*/gi, ' ').replace(/\s+([!?.,])/g, '$1').trim();
  };

  const slate = { seconds: 3, url: SHOP_URL, line: DEFAULT_SLATE_LINE, say: DEFAULT_SLATE_SAY, offer: 'Personalised videos · ad-free Calm Library', ...(spec.slate || {}) };
  const total = roundUp(clamp(Number(spec.seconds) || 45, 30, 75));
  const slateSec = roundUp(slate.seconds);
  const bodySec = total - slateSec;
  const totalFrames = Math.round(total * fps), slateStart = Math.round(bodySec * fps);
  const hook = personalize(spec.hook || '');
  const caption = personalize(spec.caption || spec.hook || '');
  const captionSec = spec.captionSeconds ? Math.min(bodySec, Number(spec.captionSeconds)) : bodySec;

  // music: one seamless loop at a frame-snapped tempo, tiled under the clip
  const mode = spec.music || scene.defaults.music || 'dance';
  const bpm = snapBpm(spec.bpm || scene.defaults.bpm || 100, fps);
  const seed = spec.seed ?? 7;
  const music = renderMusic({ mode, bpm, melody: spec.melody || 'generated', seed, fps });
  const loopSec = music.seconds, loopFrames = Math.round(loopSec * fps);
  if (Math.abs(loopFrames / fps - loopSec) > 1e-6) throw new Error(`loop not frame-aligned: ${loopSec}s @ ${fps}fps`);

  // inner scene state, built exactly like renderVideo would for a loop
  const options = { ...(spec.options || {}), palette: spec.palette || spec.options?.palette || scene.defaults.palette, theme: spec.theme || spec.options?.theme || null };
  const inner = sceneInfo({ scene, width, height, fps, seconds: loopSec, seed, bpm, options });
  const innerState = scene.init(inner);
  const copy = SCENE_COPY[scene.id] || { name: scene.name, ages: scene.ageBand, tags: [], heroes: [] };
  const heroes = (spec.heroes || copy.heroes || []).filter(available).slice(0, 2);
  const pal = pickPalette(makeRng(seed * 13 + 5), scene.id === 'high-contrast' || scene.id === 'sleepy-stars' ? 'pastel' : 'primary', options.theme || null);
  const slatePal = scene.id === 'sleepy-stars' ? { bg: '#1c2e5c', pops: [PALETTES.sleepy.star, PALETTES.sleepy.moon, '#7cc7ff'] } : pal;

  const blend = roundUp(0.5);   // white blink between body and slate
  const wrapper = {
    id: `clip-${scene.id}`,
    init: () => ({}),
    draw(ctx, t, _s, { W, H, frame }) {
      if (frame < slateStart) {
        const f = frame % loopFrames;
        ctx.save();
        scene.draw(ctx, f / fps, innerState, frameInfo(inner, f / fps, f));
        ctx.restore();
        const pop = easeOutBack(clamp((t - 0.05) / 0.55));
        const fade = t > captionSec - 0.4 ? clamp((captionSec - t) / 0.4) : 1;
        if (t < captionSec) drawCaption(ctx, caption, W, H, { pop, alpha: fade, unit });
        const toWhite = t - (bodySec - blend / 2);
        if (toWhite > 0) { ctx.fillStyle = `rgba(255,255,255,${smoothstep(toWhite / (blend / 2))})`; ctx.fillRect(0, 0, W, H); }
      } else {
        const u = t - bodySec;
        drawSlate(ctx, u, W, H, { pal: slatePal, heroes, line: personalize(slate.line), url: slate.url, offer: slate.offer, unit, phase: (u / slateSec) % 1 });
        if (u < blend / 2) { ctx.fillStyle = `rgba(255,255,255,${1 - smoothstep(u / (blend / 2))})`; ctx.fillRect(0, 0, W, H); }
      }
    },
  };

  // narration (Piper, public-domain voice); the hook should be 2–4 s
  const tts = { cacheDir: path.join(outDir, '..', '.tts-cache'), voice: spec.voice, provider: spec.ttsProvider, lengthScale: spec.speechRate || 1.08 };
  const lines = [hook, personalize(slate.say)].filter(Boolean);
  const spoken = lines.length ? await speakAll(lines, tts) : [];
  const clips = [];
  let hookSeconds = 0;
  if (hook) {
    hookSeconds = spoken[0].seconds;
    if (hookSeconds > 4.5) log(`  ⚠ hook is ${hookSeconds.toFixed(1)}s — aim for 2–4 s`);
    clips.push({ at: 0.6, mono: loadClip(spoken[0].out) });
  }
  const slateSpoken = spoken[hook ? 1 : 0];
  if (slateSpoken) clips.push({ at: bodySec + 0.25, mono: loadClip(slateSpoken.out) });

  // video
  const t0 = Date.now();
  const video = path.join(work, `${id}-video.mp4`);
  const enc = { preset: preview ? 'ultrafast' : spec.preset || 'medium', crf: preview ? 28 : spec.crf || 18 };
  await renderVideo({ scene: wrapper, seconds: total, out: video, fps, width, height, seed, bpm, ...enc, onProgress: (i, n, s) => { if (i % (fps * 5) === 0 || i === n) log(`  ${String(i).padStart(5)}/${n} frames  ${(i / s).toFixed(1)} fps`); } });

  // audio: bed tiled for the whole clip, ducked under speech; the slate keeps the music at a lower level
  const bed = tileBed(music, total);
  const slateFrom = Math.round(bodySec * SR);
  for (let i = slateFrom; i < bed.n; i++) { bed.L[i] *= 0.7; bed.R[i] *= 0.7; }
  mixNarration(bed, clips, { bedGain: mode === 'lullaby' ? 0.4 : 0.34, duckGain: 0.11, narrGain: 0.92 });
  const wav = path.join(work, `${id}-audio.wav`);
  fs.writeFileSync(wav, encodeWav(bed.L, bed.R));

  // mux: video stream-copied, audio loudness-normalised (-16 LUFS, like the episodes) with a 2 s tail fade
  const final = path.join(outDir, `${id}${preview ? '-preview' : ''}.mp4`);
  await run(['-y', '-i', video, '-i', wav, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '44100', '-ac', '2',
    '-af', `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st=${(total - 2).toFixed(3)}:d=2`, '-shortest', '-movflags', '+faststart', final]);

  // cover: a mid-clip frame with the caption fully in (renderStill at full size even in preview)
  const coverT = spec.coverT ?? Math.min(bodySec - 1, 2 + (60 / bpm) * 0.5);
  const cover = path.join(outDir, 'cover.png');
  {
    const cw = spec.width || 1080, ch = spec.height || 1920;
    let still;
    if (cw === width && ch === height) still = renderStill({ scene: wrapper, t: coverT, width, height, seconds: total, seed, bpm, fps });
    else {
      // preview renders are small; build the cover at full size from a full-size inner state
      const inner2 = sceneInfo({ scene, width: cw, height: ch, fps: 30, seconds: loopSec, seed, bpm, options });
      const st2 = scene.init(inner2);
      const f = Math.round(coverT * 30) % Math.round(loopSec * 30);
      const w2 = { id: wrapper.id, init: () => ({}), draw(ctx, t, _s, { W, H }) { scene.draw(ctx, f / 30, st2, frameInfo(inner2, f / 30, f)); drawCaption(ctx, caption, W, H, { pop: 1, alpha: 1, unit: Math.min(W, H) }); } };
      still = renderStill({ scene: w2, t: coverT, width: cw, height: ch, seconds: total, seed, bpm, fps: 30 });
    }
    fs.writeFileSync(cover, still.png);
  }

  // post copy for each platform
  const post = buildPost({ spec, scene, copy, music, total, hook, caption, slate, heroes, cover, final });
  fs.writeFileSync(path.join(outDir, 'post.json'), JSON.stringify(post, null, 2));
  const manifest = { id, file: final, cover, seconds: total, bodySeconds: bodySec, slateSeconds: slateSec, width, height, fps, scene: scene.id, seed, bpm, mode, melody: music.melody, loopSeconds: loopSec, hook, hookSeconds, caption, slate, voice: spec.voice || 'kristin', renderSeconds: (Date.now() - t0) / 1000 };
  fs.writeFileSync(path.join(outDir, 'clip.json'), JSON.stringify(manifest, null, 2));
  return { final, cover, post, manifest };
}

// ---- post.json ----------------------------------------------------------------
const trunc = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');

export function buildPost({ spec, scene, copy, music, total, hook, caption, slate, cover, final }) {
  const melody = music.melody?.name || 'an original tune';
  const isGen = /^Original pentatonic/.test(melody);
  const tune = isGen ? 'an original music-box tune' : `a music-box "${melody.replace(/\s*\(.*\)$/, '')}"`;
  const tags = [...new Set([...(spec.hashtags || []), ...copy.tags, ...BASE_TAGS])].map((t) => t.replace(/^#/, ''));
  const hash = (n) => tags.slice(0, n).map((t) => '#' + t).join(' ');
  const secs = Math.round(total);
  const short = spec.post?.caption || caption || `${copy.name} — ${secs} seconds of calm`;
  const why = spec.post?.why || `${secs} seconds of BabyLoop's ${copy.name} (${copy.ages}): slow, beat-synced animation with ${tune}. No flashing, no fast cuts, volume kept low.`;
  const cta = `Personalised episodes with your little one's name, plus the ad-free Calm Library download: ${SHOP_URL}`;
  const tiktok = spec.post?.tiktok || [short, '', why, '', cta, '', hash(8)].join('\n');
  const instagram = spec.post?.instagram || [short, '', why, '', `${cta} (link in bio)`, '', hash(12)].join('\n');
  const ytTitleBase = spec.post?.title || spec.title || `${copy.name}: ${short.replace(/\n/g, ' ')}`;
  let ytTitle = `${ytTitleBase} #Shorts`;
  if (ytTitle.length > 100) ytTitle = `${trunc(ytTitleBase, 100 - ' #Shorts'.length)} #Shorts`;
  const ytDescription = [
    why,
    hook ? `Narrated hook: "${hook}"` : null,
    '',
    `More at ${SHOP_URL} — ${slate.line}.`,
    '',
    `🎵 ${isGen ? 'Original tune, procedurally arranged' : `Original arrangement of ${melody} (public domain)`}. 🗣 Narration: synthetic voice (Piper, public-domain training data).`,
    'Set as made for kids. For parents: keep sessions short and watch together when you can.',
    '',
    hash(6),
  ].filter((l) => l !== null).join('\n');
  return {
    id: spec.id, file: final, cover, seconds: secs, url: SHOP_HTTPS, plainUrl: SHOP_URL,
    caption: short, hashtags: tags.map((t) => '#' + t),
    spoken: { hook: hook || null, slate: slate.say },
    tiktok: { caption: tiktok, chars: tiktok.length, limit: 2200, ok: tiktok.length <= 2200, audience: 'parents (TikTok is 13+; the clip is parent-facing)', note: 'Upload as 9:16, keep sound on, pin the shop URL as the first comment as well.' },
    youtubeShorts: { title: ytTitle, titleChars: ytTitle.length, titleLimit: 100, ok: ytTitle.length <= 100, description: ytDescription, tags: [...new Set([copy.name, 'baby sensory', 'baby video', 'calm baby video', ...tags.slice(0, 10)])], madeForKids: true, note: 'MFK strips clickable links; the URL is plain text on screen, spoken, and in the description.' },
    instagram: { caption: instagram, chars: instagram.length, limit: 2200, ok: instagram.length <= 2200, note: 'Reels: cover from cover.png; the shop URL goes in the bio link.' },
  };
}
