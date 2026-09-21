// Procedural nursery music. Pure JS DSP, no dependencies, browser-safe (the
// preview plays it through Web Audio), renders a seamless
// loop whose length is an exact whole number of beats — which the composer
// snaps to the video frame grid so audio and video repeat in lock-step forever.
//
// Modes:  dance   — soft kick, shaker, bass, pad, marimba + music box melody
//         learn   — music box + marimba, pad, light shaker, no kick
//         lullaby — pad, music box, slow harp arpeggio, long reverb
import { MELODIES, generateMelody } from './melodies.mjs';
import { makeRng } from './rng.mjs';

export const SR = 44100;
const TAU = Math.PI * 2;

// ---- parsing ---------------------------------------------------------------
const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export function noteToMidi(name) {
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(name.trim());
  if (!m) throw new Error(`bad note "${name}"`);
  let n = NOTE_IDX[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return n + (parseInt(m[3], 10) + 1) * 12;
}
const frac = (s) => (s.includes('/') ? s.split('/').reduce((a, b) => a / b) : parseFloat(s));
export function parseNotes(str) {
  return str.trim().split(/\s+/).map((tok) => {
    const [p, d] = tok.split(':');
    return { midi: p.toUpperCase() === 'R' ? null : noteToMidi(p), beats: frac(d || '1') };
  });
}
export function parseChords(str) {
  return str.trim().split(/\s+/).map((tok) => {
    const [c, d] = tok.split(':');
    const minor = /m$/.test(c);
    const root = noteToMidi(c.replace(/m$/, '') + '3');
    return { root, minor, beats: frac(d || '4') };
  });
}
export const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

export function getMelody(id, rng, mode) {
  if (id && MELODIES[id]) return { id, ...MELODIES[id] };
  if (!id || id === 'auto' || id === 'generated') return { id: 'generated', ...generateMelody(rng || makeRng(1), { mode }) };
  throw new Error(`Unknown melody "${id}". Known: ${Object.keys(MELODIES).join(', ')}, generated`);
}

// Loop length in beats: melody total, padded up to a whole number of bars.
export function melodyBeats(mel) {
  const total = parseNotes(mel.notes).reduce((a, n) => a + n.beats, 0);
  const bars = Math.ceil(total / mel.meter - 1e-6);
  return Math.round(bars * mel.meter);
}

// Snap bpm so one beat is a whole number of video frames (and of audio samples):
// bpm = 60*fps / framesPerBeat. Keeps N loops drift-free.
export function snapBpm(bpm, fps = 30) {
  const fpb = Math.max(1, Math.round((60 * fps) / bpm));
  return (60 * fps) / fpb;
}

// ---- voices (mono Float32Array) -------------------------------------------
function tone(freq, dur, partials, decayTau, attack = 0.004) {
  const n = Math.max(1, Math.round(dur * SR));
  const out = new Float32Array(n);
  for (const [mult, amp, tau] of partials) {
    const w = TAU * freq * mult / SR, k = 1 / (SR * (tau || decayTau));
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const env = Math.exp(-i * k) * Math.min(1, i / (attack * SR));
      out[i] += Math.sin(ph) * amp * env;
      ph += w;
    }
  }
  return out;
}
const V = {
  musicbox: (f, d) => tone(f, Math.min(d + 1.2, 2.5), [[1, 0.6, 0.9], [2, 0.25, 0.5], [3, 0.12, 0.35], [5.4, 0.05, 0.15]], 0.9, 0.002),
  marimba: (f, d) => tone(f, Math.min(d + 0.5, 1.2), [[1, 0.7, 0.28], [4, 0.28, 0.08], [10.1, 0.05, 0.03]], 0.28, 0.002),
  pluck: (f, d) => tone(f, Math.min(d + 0.8, 1.6), [[1, 0.5, 0.5], [2, 0.2, 0.3], [3, 0.08, 0.2]], 0.5, 0.003),
  bass: (f, d) => tone(f, Math.min(d, 0.6), [[1, 0.8, 0.35], [2, 0.18, 0.2]], 0.35, 0.005),
  pad(f, d) {
    const n = Math.round((d + 0.6) * SR), out = new Float32Array(n);
    const detune = [0.997, 1, 1.003], w = detune.map((x) => TAU * f * x / SR);
    const ph = [0, 1, 2];
    const a = 0.35 * SR, r = 0.6 * SR, sus = d * SR;
    let lp = 0; const alpha = 0.06;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < 3; k++) { s += (2 / Math.PI) * Math.asin(Math.sin(ph[k])); ph[k] += w[k]; } // triangle-ish
      const env = i < a ? i / a : i < sus ? 1 : Math.max(0, 1 - (i - sus) / r);
      lp += alpha * (s / 3 - lp); // gentle low-pass
      out[i] = lp * env * 0.6;
    }
    return out;
  },
  kick() {
    const n = Math.round(0.22 * SR), out = new Float32Array(n);
    let ph = 0;
    for (let i = 0; i < n; i++) {
      const t = i / SR, f = 48 + 90 * Math.exp(-t * 28);
      ph += TAU * f / SR;
      out[i] = Math.sin(ph) * Math.exp(-t * 16) * 0.9;
    }
    return out;
  },
  shaker(rng) {
    const n = Math.round(0.07 * SR), out = new Float32Array(n);
    let prev = 0;
    for (let i = 0; i < n; i++) {
      const w = rng.next() * 2 - 1;
      const hp = w - prev; prev = w; // crude high-pass
      out[i] = hp * Math.exp(-(i / SR) * 55) * 0.5;
    }
    return out;
  },
};

// ---- mixer / fx ------------------------------------------------------------
class Mixer {
  constructor(seconds) { const n = Math.round(seconds * SR); this.L = new Float32Array(n); this.R = new Float32Array(n); this.n = n; }
  add(buf, atSec, gain = 1, pan = 0) {
    const start = Math.round(atSec * SR);
    const gl = gain * Math.cos((pan + 1) * Math.PI / 4), gr = gain * Math.sin((pan + 1) * Math.PI / 4);
    const end = Math.min(this.n, start + buf.length);
    for (let i = Math.max(0, start), j = i - start; i < end; i++, j++) { this.L[i] += buf[j] * gl; this.R[i] += buf[j] * gr; }
  }
}

function delayFx(L, R, timeS, fb, mix) {
  const d = Math.round(timeS * SR), n = L.length;
  const bl = new Float32Array(n), br = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const il = i - d, ir = i - Math.round(d * 1.5);
    bl[i] = L[i] + (il >= 0 ? bl[il] * fb : 0);
    br[i] = R[i] + (ir >= 0 ? br[ir] * fb : 0);
  }
  for (let i = 0; i < n; i++) { L[i] = L[i] * (1 - mix) + bl[i] * mix; R[i] = R[i] * (1 - mix) + br[i] * mix; }
}

// Schroeder reverb (4 parallel combs + 2 series allpasses per channel)
function reverbFx(L, R, mix, size = 1) {
  const combs = [1557, 1617, 1491, 1422].map((x) => Math.round(x * size));
  const aps = [225, 556];
  const proc = (x, offs) => {
    const n = x.length, out = new Float32Array(n);
    const bufs = combs.map((c) => new Float32Array(c + offs)), idx = combs.map(() => 0);
    const g = 0.805;
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let k = 0; k < combs.length; k++) {
        const b = bufs[k], y = b[idx[k]];
        b[idx[k]] = x[i] + y * g;
        idx[k] = (idx[k] + 1) % b.length;
        s += y;
      }
      out[i] = s / combs.length;
    }
    for (const a of aps) {
      const b = new Float32Array(a); let p = 0;
      for (let i = 0; i < n; i++) {
        const y = b[p], v = out[i] + y * 0.5;
        b[p] = v; p = (p + 1) % a;
        out[i] = y - 0.5 * v;
      }
    }
    return out;
  };
  const rl = proc(L, 0), rr = proc(R, 23);
  for (let i = 0; i < L.length; i++) { L[i] = L[i] * (1 - mix * 0.6) + rl[i] * mix; R[i] = R[i] * (1 - mix * 0.6) + rr[i] * mix; }
}

function master(L, R, targetRms = 0.1) {
  let peak = 0, sq = 0;
  for (let i = 0; i < L.length; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > peak) peak = a; if (b > peak) peak = b; sq += L[i] * L[i] + R[i] * R[i]; }
  const rms = Math.sqrt(sq / (2 * L.length)) || 1e-6;
  let g = Math.min(0.85 / (peak || 1e-6), targetRms / rms);
  for (let i = 0; i < L.length; i++) { L[i] = Math.tanh(L[i] * g * 1.1) / 1.1; R[i] = Math.tanh(R[i] * g * 1.1) / 1.1; }
}

// ---- arrangement -----------------------------------------------------------
export function renderMusic({ mode = 'dance', bpm = 112, melody = 'twinkle', seed = 1, fps = 30 } = {}) {
  const rng = makeRng(seed);
  bpm = snapBpm(bpm, fps);
  const mel = getMelody(melody, rng, mode);
  const beats = melodyBeats(mel);
  const spb = 60 / bpm;
  const loopSec = beats * spb;
  const notes = parseNotes(mel.notes), chords = parseChords(mel.chords || 'C:4');
  const meter = mel.meter || 4;
  const mix = new Mixer(loopSec * 2 + 3);

  const isDance = mode === 'dance', isLull = mode === 'lullaby';
  const melGain = isLull ? 0.42 : 0.5, padGain = isLull ? 0.22 : 0.13, bassGain = isLull ? 0.22 : 0.32;

  for (const pass of [0, 1]) {
    const off = pass * loopSec;
    // melody
    let b = 0;
    for (const n of notes) {
      if (n.midi != null) {
        const dur = n.beats * spb, f = midiToFreq(n.midi);
        if (isLull) mix.add(V.musicbox(f, dur), off + b * spb, melGain, 0.1);
        else {
          mix.add(V.marimba(f, dur), off + b * spb, melGain * 0.9, -0.1);
          mix.add(V.musicbox(f * 2, dur), off + b * spb, melGain * 0.35, 0.25);
        }
      }
      b += n.beats;
    }
    // harmony: pad + bass + (lullaby) arpeggio
    let cb = 0;
    for (const c of chords) {
      if (cb >= beats) break;
      const third = c.minor ? 3 : 4;
      const durS = c.beats * spb;
      for (const iv of [0, third, 7, 12]) mix.add(V.pad(midiToFreq(c.root + 12 + iv), durS), off + cb * spb, padGain / 4, iv === 7 ? 0.3 : -0.3);
      if (isLull) {
        const arp = [0, 7, 12, 7 + 12, 12, 7];
        for (let k = 0; k * 0.5 < c.beats; k++) mix.add(V.pluck(midiToFreq(c.root + 12 + arp[k % arp.length]), spb * 0.5), off + (cb + k * 0.5) * spb, 0.16, k % 2 ? 0.35 : -0.35);
        mix.add(V.bass(midiToFreq(c.root - 12), durS), off + cb * spb, bassGain);
      } else {
        for (let k = 0; k < c.beats; k++) {
          const iv = k % 2 === 0 ? 0 : 7;
          mix.add(V.bass(midiToFreq(c.root - 12 + iv), spb * 0.9), off + (cb + k) * spb, bassGain);
        }
      }
      cb += c.beats;
    }
    // drums
    if (!isLull) {
      const kick = V.kick();
      for (let k = 0; k < beats; k += 0.5) {
        const inBar = k % meter;
        if (isDance && (inBar === 0 || (meter === 4 && inBar === 2))) mix.add(kick, off + k * spb, 0.55);
        const accent = (k % 1) === 0.5 ? 0.16 : 0.08;
        mix.add(V.shaker(rng), off + k * spb, isDance ? accent : accent * 0.6, 0.4);
      }
    }
  }
  const L = mix.L, R = mix.R;
  delayFx(L, R, spb * 0.75, isLull ? 0.3 : 0.22, isLull ? 0.22 : 0.16);
  reverbFx(L, R, isLull ? 0.42 : 0.22, isLull ? 1.35 : 1);
  master(L, R, isLull ? 0.09 : isDance ? 0.13 : 0.12); // ≈ -18 dBFS RMS; YouTube normalises down, never up
  // keep the SECOND pass: it carries the first pass's tail, so the loop is seamless
  const n = Math.round(loopSec * SR), s0 = n;
  const outL = L.slice(s0, s0 + n), outR = R.slice(s0, s0 + n);
  return { L: outL, R: outR, seconds: n / SR, samples: n, beats, bpm, bars: beats / meter, meter, melody: { id: mel.id, name: mel.name, source: mel.source } };
}

// ---- WAV I/O ---------------------------------------------------------------
export function encodeWav(L, R, sr = SR) {
  const n = L.length, ch = R ? 2 : 1;
  const buf = Buffer.alloc(44 + n * ch * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * ch * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sr, 24); buf.writeUInt32LE(sr * ch * 2, 28); buf.writeUInt16LE(ch * 2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * ch * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), o); o += 2;
    if (ch === 2) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), o); o += 2; }
  }
  return buf;
}

export function decodeWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a WAV');
  let p = 12, fmt = null, data = null;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') fmt = { format: buf.readUInt16LE(p + 8), channels: buf.readUInt16LE(p + 10), sampleRate: buf.readUInt32LE(p + 12), bits: buf.readUInt16LE(p + 22) };
    if (id === 'data') { data = buf.subarray(p + 8, p + 8 + size); break; }
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('WAV missing fmt/data');
  const bytes = fmt.bits / 8, frames = Math.floor(data.length / (bytes * fmt.channels));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let c = 0; c < fmt.channels; c++) {
      const o = (i * fmt.channels + c) * bytes;
      s += fmt.bits === 16 ? data.readInt16LE(o) / 32768 : fmt.bits === 32 && fmt.format === 3 ? data.readFloatLE(o) : fmt.bits === 8 ? (data[o] - 128) / 128 : data.readInt32LE(o) / 2147483648;
    }
    mono[i] = s / fmt.channels;
  }
  return { sampleRate: fmt.sampleRate, channels: fmt.channels, mono, seconds: frames / fmt.sampleRate };
}

export function resample(mono, fromSr, toSr = SR) {
  if (fromSr === toSr) return mono;
  const n = Math.round(mono.length * toSr / fromSr), out = new Float32Array(n), r = fromSr / toSr;
  for (let i = 0; i < n; i++) { const x = i * r, j = Math.floor(x), f = x - j; out[i] = (mono[j] || 0) * (1 - f) + (mono[j + 1] || 0) * f; }
  return out;
}
