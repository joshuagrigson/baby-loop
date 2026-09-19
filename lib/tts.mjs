// Narration. Default provider is Piper (offline neural TTS, MIT): `pip install piper-tts`.
// Voice models (.onnx + .json) live in assets/voices/ and are auto-downloaded from
// Hugging Face the first time. Set BABYLOOP_TTS=openai + OPENAI_API_KEY to use
// OpenAI's TTS instead (paid, higher quality).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { ROOT } from './canvas.mjs';
import { decodeWav } from './music.mjs';

export const VOICE_DIR = path.join(ROOT, 'assets', 'voices');
// Only voices whose MODEL_CARD says the training data is PUBLIC DOMAIN and that
// were trained from scratch. A monetized channel is commercial use: lessac is
// under the Blizzard 2013 non-commercial licence, and amy / hfc_female / jenny /
// joe / arctic / libritts_r are fine-tuned from it (see PLAYBOOK.md §6).
const HF = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/en/';
export const VOICES = {
  kristin: { file: 'en_US-kristin-medium', url: HF + 'en_US/kristin/medium/', note: 'US female, LibriVox, public domain — the default' },
  ljspeech: { file: 'en_US-ljspeech-high', url: HF + 'en_US/ljspeech/high/', note: 'US female, LJ Speech, public domain, high quality (~110 MB)' },
  cori: { file: 'en_GB-cori-high', url: HF + 'en_GB/cori/high/', note: 'UK female, LibriVox, public domain, high quality' },
  norman: { file: 'en_US-norman-medium', url: HF + 'en_US/norman/medium/', note: 'US male, LibriVox, public domain' },
  bryce: { file: 'en_US-bryce-medium', url: HF + 'en_US/bryce/medium/', note: 'US male, own recordings, public domain' },
};
export const NON_COMMERCIAL_VOICES = ['lessac', 'amy', 'hfc_female', 'hfc_male', 'jenny_dioco', 'joe', 'kusal', 'arctic', 'l2arctic', 'ryan', 'libritts_r', 'alan', 'vctk'];

function piperBin() {
  if (process.env.BABYLOOP_PIPER) return [process.env.BABYLOOP_PIPER];
  for (const bin of ['piper']) {
    const r = spawnSync(bin, ['--help'], { encoding: 'utf8' });
    if (r.status === 0) return [bin];
  }
  for (const py of ['python3', 'python']) {
    const r = spawnSync(py, ['-m', 'piper', '--help'], { encoding: 'utf8' });
    if (r.status === 0) return [py, '-m', 'piper'];
  }
  throw new Error('Piper not found. `pip install piper-tts` (or set BABYLOOP_PIPER), or use BABYLOOP_TTS=openai.');
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download ${url}: HTTP ${res.status}`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

export async function ensureVoice(name = process.env.BABYLOOP_VOICE || 'kristin') {
  if (name.endsWith('.onnx') && fs.existsSync(name)) {
    if (NON_COMMERCIAL_VOICES.some((nc) => path.basename(name).includes(nc))) console.warn(`⚠ ${path.basename(name)} carries a non-commercial licence — not for a monetized channel.`);
    return name;
  }
  const v = VOICES[name];
  if (!v) throw new Error(`Unknown voice "${name}". Known: ${Object.keys(VOICES).join(', ')} or a path to a .onnx`);
  const onnx = path.join(VOICE_DIR, v.file + '.onnx');
  if (!fs.existsSync(onnx) || !fs.existsSync(onnx + '.json')) {
    console.log(`Downloading Piper voice ${v.file} (60–110 MB) …`);
    await download(v.url + v.file + '.onnx', onnx);
    await download(v.url + v.file + '.onnx.json', onnx + '.json');
    try { await download(v.url + 'MODEL_CARD', path.join(VOICE_DIR, `MODEL_CARD-${name}.txt`)); } catch { /* provenance only */ }
  }
  return onnx;
}

// Speak `text` to a WAV file. Returns { out, seconds, sampleRate }.
export async function speak(text, { out, voice, provider = process.env.BABYLOOP_TTS || 'piper', lengthScale = 1.12, sentenceSilence = 0.4 } = {}) {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (provider === 'openai') {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY not set');
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts', voice: process.env.OPENAI_TTS_VOICE || 'nova', input: text, response_format: 'wav', speed: 0.92 }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text()}`);
    fs.writeFileSync(out, Buffer.from(await res.arrayBuffer()));
  } else {
    const model = await ensureVoice(voice);
    const [bin, ...pre] = piperBin();
    await new Promise((resolve, reject) => {
      const p = spawn(bin, [...pre, '--model', model, '--output_file', out, '--length-scale', String(lengthScale), '--sentence-silence', String(sentenceSilence)], { stdio: ['pipe', 'ignore', 'pipe'] });
      let err = '';
      p.stderr.on('data', (d) => (err += d));
      p.on('error', reject);
      p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`piper exited ${code}: ${err.slice(-800)}`))));
      p.stdin.end(text.replace(/\s+/g, ' ').trim() + '\n');
    });
  }
  const wav = decodeWav(fs.readFileSync(out));
  return { out, seconds: wav.seconds, sampleRate: wav.sampleRate };
}

// Speak many lines with a small on-disk cache keyed by voice+text (re-renders are instant).
export async function speakAll(lines, { cacheDir, voice, provider, lengthScale } = {}) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const results = [];
  for (const text of lines) {
    const key = hashText(`${provider || 'piper'}|${voice || process.env.BABYLOOP_VOICE || 'kristin'}|${lengthScale || 1.12}|${text}`);
    const out = path.join(cacheDir, `${key}.wav`);
    if (fs.existsSync(out) && fs.statSync(out).size > 100) {
      const wav = decodeWav(fs.readFileSync(out));
      results.push({ out, seconds: wav.seconds, sampleRate: wav.sampleRate, cached: true, text });
    } else {
      results.push({ ...(await speak(text, { out, voice, provider, lengthScale })), text });
    }
  }
  return results;
}

function hashText(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
