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
  // celesta / glockenspiel-ish: long fundamental, faint inharmonic shimmer (album tracks)
  bells: (f, d) => tone(f, Math.min(d + 1.8, 3.6), [[1, 0.55, 1.7], [2, 0.1, 0.7], [2.76, 0.07, 0.45], [5.4, 0.035, 0.2]], 1.7, 0.0015),
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
function reverbFx(L, R, mix, size = 1, g = 0.805) {
  const combs = [1557, 1617, 1491, 1422].map((x) => Math.round(x * size));
  const aps = [225, 556];
  const proc = (x, offs) => {
    const n = x.length, out = new Float32Array(n);
    const bufs = combs.map((c) => new Float32Array(c + offs)), idx = combs.map(() => 0);
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

// Fast voices for full-length tracks: same partials/envelopes as V, but the
// sines come from a rotating phasor (two multiplies per sample, no Math.sin)
// and the pad's triangle is computed directly. ~4× faster; V is kept as-is
// so renderMusic()'s loops stay bit-identical.
function toneFast(freq, dur, partials, decayTau, attack = 0.004) {
  const n = Math.max(1, Math.round(dur * SR));
  const out = new Float32Array(n), aN = Math.max(1, attack * SR);
  for (const [mult, amp, tau] of partials) {
    const w = TAU * freq * mult / SR, c = Math.cos(w), sn = Math.sin(w), dk = Math.exp(-1 / (SR * (tau || decayTau)));
    let x = 0, y = 1, env = 1; // (x, y) = (sin, cos) of the phase
    for (let i = 0; i < n; i++) {
      out[i] += x * amp * env * (i < aN ? i / aN : 1);
      const nx = x * c + y * sn; y = y * c - x * sn; x = nx;
      env *= dk;
    }
  }
  return out;
}
function padFast(f, d) {
  const n = Math.round((d + 0.6) * SR), out = new Float32Array(n);
  const detune = [0.997, 1, 1.003], inc = detune.map((x) => f * x / SR);
  const u = [0, 1 / TAU, 2 / TAU]; // same start phases as V.pad (0, 1, 2 rad), in cycles
  const a = 0.35 * SR, r = 0.6 * SR, sus = d * SR;
  let lp = 0; const alpha = 0.06;
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < 3; k++) {
      const q = u[k];
      s += q < 0.25 ? 4 * q : q < 0.75 ? 2 - 4 * q : 4 * q - 4;
      u[k] += inc[k]; if (u[k] >= 1) u[k] -= 1;
    }
    const env = i < a ? i / a : i < sus ? 1 : Math.max(0, 1 - (i - sus) / r);
    lp += alpha * (s / 3 - lp);
    out[i] = lp * env * 0.6;
  }
  return out;
}
const VT = {
  musicbox: (f, d) => toneFast(f, Math.min(d + 1.2, 2.5), [[1, 0.6, 0.9], [2, 0.25, 0.5], [3, 0.12, 0.35], [5.4, 0.05, 0.15]], 0.9, 0.002),
  marimba: (f, d) => toneFast(f, Math.min(d + 0.5, 1.2), [[1, 0.7, 0.28], [4, 0.28, 0.08], [10.1, 0.05, 0.03]], 0.28, 0.002),
  pluck: (f, d) => toneFast(f, Math.min(d + 0.8, 1.6), [[1, 0.5, 0.5], [2, 0.2, 0.3], [3, 0.08, 0.2]], 0.5, 0.003),
  bass: (f, d) => toneFast(f, Math.min(d, 0.6), [[1, 0.8, 0.35], [2, 0.18, 0.2]], 0.35, 0.005),
  bells: (f, d) => toneFast(f, Math.min(d + 1.8, 3.6), [[1, 0.55, 1.7], [2, 0.1, 0.7], [2.76, 0.07, 0.45], [5.4, 0.035, 0.2]], 1.7, 0.0015),
  pad: padFast,
  kick: V.kick,
  shaker: V.shaker,
};

// ---- full-length album tracks ----------------------------------------------
// renderTrack() builds a real 3–5 minute arrangement (not a loop) for
// Bandcamp / DistroKid: intro → verse A → verse B (octave up on bells, with a
// music-box echo) → arpeggiated bridge → … → verse A with a ritardando over
// the last two bars → held final chord with a long tail. Every onset and
// velocity is humanised from `seed` (±8 ms, ±10 %), so no two renders — and no
// two verses — are sample-identical. Loudness is mastered to an integrated
// target (default −14 LUFS, "sleep" variant −16) with a −1 dBTP ceiling via
// measureLoudness()/masterTrack() below.

// K-weighting (ITU-R BS.1770-4): pre-filter high shelf (+4 dB @ ~1.68 kHz)
// followed by the RLB high-pass (~38 Hz). The published coefficients are for
// 48 kHz; these are derived for any sample rate from the same analogue
// prototypes (RBJ cookbook), and match the 48 kHz table to 4 decimals.
function biquadCoefs(kind, fs, f0, Q, dB = 0) {
  const w0 = TAU * f0 / fs, cw = Math.cos(w0), sw = Math.sin(w0), alpha = sw / (2 * Q);
  let b0, b1, b2, a0, a1, a2;
  if (kind === 'highshelf') {
    const A = Math.pow(10, dB / 40), sA = 2 * Math.sqrt(A) * alpha;
    b0 = A * ((A + 1) + (A - 1) * cw + sA); b1 = -2 * A * ((A - 1) + (A + 1) * cw); b2 = A * ((A + 1) + (A - 1) * cw - sA);
    a0 = (A + 1) - (A - 1) * cw + sA; a1 = 2 * ((A - 1) - (A + 1) * cw); a2 = (A + 1) - (A - 1) * cw - sA;
  } else { // highpass
    b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function biquad(x, [b0, b1, b2, a1, a2]) {
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}

// Integrated loudness (LUFS, gated per BS.1770-4: −70 LUFS absolute, −10 LU
// relative), sample peak and 4× oversampled true peak (dBTP).
export function measureLoudness(L, R, sr = SR) {
  const shelf = biquadCoefs('highshelf', sr, 1681.974, 0.7071752, 3.999843);
  const hp = biquadCoefs('highpass', sr, 38.13547, 0.5003270);
  const kw = (x) => biquad(biquad(x, shelf), hp);
  const kl = kw(L), kr = kw(R);
  const block = Math.round(0.4 * sr), hop = Math.round(0.1 * sr);
  const blocks = [];
  for (let s = 0; s + block <= kl.length; s += hop) {
    let sq = 0;
    for (let i = s; i < s + block; i++) sq += kl[i] * kl[i] + kr[i] * kr[i];
    blocks.push(sq / block); // sum over channels of mean square
  }
  const toLufs = (ms) => -0.691 + 10 * Math.log10(Math.max(ms, 1e-20));
  const abs = blocks.filter((z) => toLufs(z) > -70);
  const mean = (arr) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);
  const rel = toLufs(mean(abs)) - 10;
  const gated = abs.filter((z) => toLufs(z) > rel);
  const lufs = gated.length ? toLufs(mean(gated)) : -Infinity;
  return { lufs, peak: samplePeak(L, R), truePeak: truePeak(L, R) };
}
function samplePeak(L, R) {
  let p = 0;
  for (let i = 0; i < L.length; i++) { const a = Math.abs(L[i]), b = Math.abs(R[i]); if (a > p) p = a; if (b > p) p = b; }
  return p;
}
// 4× oversampled peak with a 16-tap windowed-sinc interpolator (linear scale).
// Inter-sample overshoot is bounded (< ~3 dB), so only stretches whose sample
// level is within 4 dB of the current peak are interpolated — 20–50× faster.
function truePeak(L, R) {
  const taps = 16, phases = 4, k = [];
  for (let ph = 1; ph < phases; ph++) {
    const h = [];
    for (let n = 0; n < taps; n++) {
      const t = n - taps / 2 + 1 - ph / phases;
      const sinc = t === 0 ? 1 : Math.sin(Math.PI * t) / (Math.PI * t);
      const win = 0.5 - 0.5 * Math.cos(TAU * (n + 0.5) / taps);
      h.push(sinc * win);
    }
    k.push(h);
  }
  let p = samplePeak(L, R);
  const thresh = p * 0.63;
  for (const ch of [L, R]) {
    const n = ch.length;
    for (let i = taps; i < n; i++) {
      if (Math.abs(ch[i]) < thresh && Math.abs(ch[i - 1]) < thresh) continue;
      for (const h of k) {
        let s = 0;
        for (let j = 0; j < taps; j++) s += ch[i - j] * h[j];
        const a = Math.abs(s); if (a > p) p = a;
      }
    }
  }
  return p;
}

// Transparent look-ahead peak limiter (5 ms look-ahead, ~120 ms release).
// Gain = sliding-window minimum of the required gain over the look-ahead
// (monotonic deque, O(n)), smoothed with a 5 ms box so attacks are ramps, then
// a one-pole release.
function limit(L, R, ceiling, sr = SR, lookMs = 5, relMs = 120) {
  const n = L.length, la = Math.max(1, Math.round(lookMs * sr / 1000)), rel = Math.exp(-1 / (relMs * sr / 1000));
  const need = new Float32Array(n);
  for (let i = 0; i < n; i++) { const a = Math.max(Math.abs(L[i]), Math.abs(R[i])); need[i] = a > ceiling ? ceiling / a : 1; }
  const minf = new Float32Array(n); // minf[i] = min(need[i .. i+la])
  const dq = new Int32Array(n); let head = 0, tail = 0;
  for (let j = 0; j < n + la; j++) {
    if (j < n) { while (tail > head && need[dq[tail - 1]] >= need[j]) tail--; dq[tail++] = j; }
    const i = j - la;
    if (i >= 0) { while (dq[head] < i) head++; minf[i] = need[dq[head]]; }
  }
  // box-smooth (ramps the attack over the look-ahead) then release
  const g = new Float32Array(n);
  let acc = la; // window starts full of 1s (unity gain)
  for (let i = 0; i < n; i++) { acc += minf[i] - (i >= la ? minf[i - la] : 1); g[i] = Math.min(minf[i], acc / la); }
  let env = 1;
  for (let i = 0; i < n; i++) {
    const target = g[i];
    env = target < env ? target : target + (env - target) * rel;
    L[i] *= env; R[i] *= env;
  }
}

// Master in place to an integrated loudness with a true-peak ceiling.
// Returns the measured result. Two passes: gain → limit → re-measure → trim.
export function masterTrack(L, R, { lufs = -14, ceilingDb = -1, sr = SR } = {}) {
  const ceiling = Math.pow(10, ceilingDb / 20);
  let m = measureLoudness(L, R, sr);
  let totalGainDb = 0;
  for (let pass = 0; pass < 3; pass++) {
    const gDb = lufs - m.lufs;
    if (!Number.isFinite(gDb) || Math.abs(gDb) < 0.2) break;
    const g = Math.pow(10, gDb / 20);
    for (let i = 0; i < L.length; i++) { L[i] *= g; R[i] *= g; }
    totalGainDb += gDb;
    limit(L, R, ceiling * 0.97, sr);
    m = measureLoudness(L, R, sr);
  }
  if (m.truePeak > ceiling) { const t = ceiling / m.truePeak; for (let i = 0; i < L.length; i++) { L[i] *= t; R[i] *= t; } m = measureLoudness(L, R, sr); }
  return { lufs: m.lufs, truePeakDb: 20 * Math.log10(m.truePeak || 1e-9), peakDb: 20 * Math.log10(m.peak || 1e-9), gainDb: totalGainDb };
}

// Chord list covering exactly `beats` beats (cycles the progression if short).
function chordsFor(mel, beats) {
  const src = parseChords(mel.chords || 'C:4');
  const out = []; let b = 0, i = 0;
  while (b < beats - 1e-6) {
    const c = src[i % src.length];
    const len = Math.min(c.beats, beats - b);
    out.push({ ...c, beats: len, at: b });
    b += len; i++;
  }
  return out;
}

const SECTION_KINDS = ['A', 'B', 'bridge', 'A2', 'B2', 'bridge2'];

export function renderTrack({ melody = 'brahms', mode = 'lullaby', bpm, seed = 1, minutes = 3.5, key = 0, lead = null, lufs = null, sleep = false, fps = null } = {}) {
  const rng = makeRng(seed);
  const mel = getMelody(melody, rng, mode);
  const meter = mel.meter || 4;
  bpm = bpm || (mode === 'lullaby' ? 64 : mode === 'learn' ? 92 : 108);
  if (fps) bpm = snapBpm(bpm, fps);
  const spb = 60 / bpm;
  const notes = parseNotes(mel.notes).map((n) => ({ ...n, midi: n.midi == null ? null : n.midi + key }));
  const beats = melodyBeats(mel);
  const bars = beats / meter;
  const chords = chordsFor(mel, beats).map((c) => ({ ...c, root: c.root + key }));
  const isLull = mode === 'lullaby', isDance = mode === 'dance';
  const leadV = lead || (isLull ? 'musicbox' : 'marimba');

  // ---- plan the form -------------------------------------------------------
  const introBars = meter >= 4 ? 3 : 4, bridgeBars = Math.min(8, bars);
  const introBeats = introBars * meter, bridgeBeats = bridgeBars * meter;
  const ritBeats = 2 * meter, ritK = 0.9; // last beat of the piece is ~1.9× longer
  const finalBeats = beats + (ritK * ritBeats) / 2; // effective length of the closing verse
  const holdBeats = 4; // held chord before the tail
  const targetBeats = minutes * bpm;
  const plan = ['intro'];
  let total = introBeats, i = 0;
  const minBeats = (150 * bpm) / 60; // never shorter than 2.5 min
  const lenOf = (k) => (k.startsWith('bridge') ? bridgeBeats : beats);
  for (;;) {
    const next = SECTION_KINDS[i % SECTION_KINDS.length];
    const stopLen = total + finalBeats + holdBeats;
    // a bridge is only worth adding together with the verse that follows it
    const cost = lenOf(next) + (next.startsWith('bridge') ? lenOf(SECTION_KINDS[(i + 1) % SECTION_KINDS.length]) : 0);
    const goLen = total + cost + finalBeats + holdBeats;
    const afterBridge = plan[plan.length - 1].startsWith('bridge');
    if (!afterBridge && stopLen >= minBeats && Math.abs(stopLen - targetBeats) <= Math.abs(goLen - targetBeats)) break;
    plan.push(next); total += lenOf(next); i++;
    if (plan.length > 40) break;
  }
  plan.push('final');

  const totalSec = (total + finalBeats + holdBeats) * spb + 9; // + tail
  const mix = new Mixer(totalSec);
  const jitter = (ms = 8) => rng.range(-ms, ms) / 1000;
  const vel = (base, spread = 0.1) => base * (1 + rng.range(-spread, spread));
  const melGain = isLull ? 0.4 : 0.48, padGain = isLull ? 0.26 : 0.16, bassGain = isLull ? 0.2 : 0.3;

  // Section renderers. `t0` = section start (s); `tAt(beat)` maps a section-
  // relative beat to seconds (linear except in the ritardando).
  const linear = (b) => b * spb;
  const ritMap = (b) => {
    const rs = beats - ritBeats;
    if (b <= rs) return b * spb;
    const x = b - rs;
    return (rs + x + (ritK * x * x) / (2 * ritBeats)) * spb;
  };

  const playMelody = (t0, tAt, { voice = leadV, gain = melGain, pan = 0.1, oct = 0, echo = null, human = 8 }) => {
    let b = 0;
    for (let idx = 0; idx < notes.length; idx++) {
      const n = notes[idx];
      if (n.midi != null) {
        const on = tAt(b), dur = Math.max(0.08, tAt(b + n.beats) - on);
        const f = midiToFreq(n.midi + oct * 12);
        const downbeat = Math.abs((b % meter)) < 1e-6;
        const g = vel(gain * (downbeat ? 1 : 0.9));
        mix.add(VT[voice](f, dur), t0 + on + jitter(human), g, pan);
        if (echo) mix.add(VT[echo.voice](midiToFreq(n.midi + (echo.oct || 0) * 12), dur), t0 + on + echo.beats * spb + jitter(human), g * echo.gain, echo.pan ?? -pan);
      }
      b += n.beats;
    }
  };
  const playChords = (t0, tAt, list, { pad = true, arp = 'harp', bass = true, counter = false, gain = 1, drums = false }) => {
    for (const c of list) {
      const third = c.minor ? 3 : 4;
      const on = tAt(c.at), durS = Math.max(0.3, tAt(c.at + c.beats) - on);
      if (pad) for (const iv of [0, third, 7, 12]) mix.add(VT.pad(midiToFreq(c.root + 12 + iv), durS), t0 + on + jitter(4), vel(padGain * gain / 4, 0.05), iv === 7 ? 0.3 : iv === third ? -0.3 : 0);
      if (bass) mix.add(VT.bass(midiToFreq(c.root - 12), Math.min(durS, 1.2)), t0 + on + jitter(3), vel(bassGain * gain, 0.06));
      if (counter) { // long bell tones on chord changes: 5th then 3rd, an octave above the melody
        mix.add(VT.bells(midiToFreq(c.root + 24 + 7), durS), t0 + on + jitter(6), vel(0.09 * gain), -0.4);
        if (c.beats >= 2) mix.add(VT.bells(midiToFreq(c.root + 24 + third), durS), t0 + tAt(c.at + c.beats / 2) + jitter(6), vel(0.07 * gain), 0.4);
      }
      if (arp) {
        const pattern = arp === 'harp' ? [0, 7, 12, 7 + 12, 12, 7] : arp === 'slow' ? [0, 12, third + 12, 7 + 12] : arp === 'rising' ? [0, third, 7, 12, third + 12, 7 + 12, 24, 7 + 12] : [0, 12];
        const step = arp === 'slow' ? 1 : 0.5;
        const voice = arp === 'rising' ? 'pluck' : arp === 'bells' ? 'bells' : 'pluck';
        const ag = (arp === 'slow' ? 0.13 : arp === 'rising' ? 0.15 : 0.15) * gain;
        for (let k = 0; k * step < c.beats - 1e-6; k++) {
          const bb = c.at + k * step, on2 = tAt(bb);
          const dur = Math.max(0.15, tAt(bb + step) - on2);
          mix.add(VT[voice](midiToFreq(c.root + 12 + pattern[k % pattern.length]), dur), t0 + on2 + jitter(5), vel(ag), k % 2 ? 0.35 : -0.35);
        }
      }
      if (drums) {
        for (let k = 0; k < c.beats; k += 0.5) {
          const bb = c.at + k, inBar = bb % meter;
          if (isDance && (inBar === 0 || (meter === 4 && inBar === 2))) mix.add(VT.kick(), t0 + tAt(bb), 0.45 * gain);
          mix.add(VT.shaker(rng), t0 + tAt(bb) + jitter(3), vel((k % 1 === 0.5 ? 0.12 : 0.06) * gain * (isDance ? 1 : 0.6)), 0.4);
        }
      }
    }
  };

  // ---- render the plan -----------------------------------------------------
  const structure = [];
  let t = 1.0; // lead-in silence
  for (const kind of plan) {
    const start = t;
    if (kind === 'intro') {
      const list = chordsFor(mel, introBeats).map((c) => ({ ...c, root: c.root + key }));
      playChords(t, linear, list, { pad: true, arp: null, bass: false, gain: 0.8 });
      // sparse music box: chord tones, roughly one or two per bar, plus the melody's first note as a pickup
      for (const c of list) {
        const tones = [0, 7, 12, (c.minor ? 3 : 4) + 12];
        for (let k = 0; k < c.beats; k++) if (k === 0 || rng.chance(0.3)) mix.add(VT.musicbox(midiToFreq(c.root + 12 + rng.pick(tones)), spb), t + k * spb + c.at * spb + jitter(10), vel(melGain * 0.45), rng.range(-0.4, 0.4));
      }
      t += introBeats * spb;
    } else if (kind === 'bridge' || kind === 'bridge2') {
      const list = chordsFor(mel, bridgeBeats).map((c) => ({ ...c, root: c.root + key }));
      playChords(t, linear, list, { pad: true, arp: kind === 'bridge' ? 'rising' : 'slow', bass: true, counter: kind === 'bridge2', gain: 0.85, drums: false });
      if (kind === 'bridge') for (const c of list) mix.add(VT.bells(midiToFreq(c.root + 36), c.beats * spb), t + c.at * spb + jitter(6), vel(0.07), 0.2);
      t += bridgeBeats * spb;
    } else {
      const isFinal = kind === 'final';
      const tAt = isFinal ? ritMap : linear;
      const variant = isFinal ? 'A' : kind;
      if (variant === 'A') {
        playMelody(t, tAt, { voice: leadV, gain: melGain, pan: 0.1 });
        playChords(t, tAt, chords, { pad: true, arp: isLull ? 'harp' : null, bass: true, drums: !isLull });
      } else if (variant === 'B') { // octave up on bells, music box echoing a beat later
        playMelody(t, tAt, { voice: 'bells', gain: melGain * 0.75, pan: -0.15, oct: 1, echo: { voice: leadV, beats: 1, gain: 0.35, oct: 0, pan: 0.3 } });
        playChords(t, tAt, chords, { pad: true, arp: 'slow', bass: true, drums: !isLull });
      } else if (variant === 'A2') { // marimba + music box doubling, harp arpeggios
        playMelody(t, tAt, { voice: isLull ? 'marimba' : 'musicbox', gain: melGain * 0.8, pan: -0.1 });
        playMelody(t, tAt, { voice: leadV, gain: melGain * 0.4, pan: 0.25, human: 12 });
        playChords(t, tAt, chords, { pad: true, arp: 'harp', bass: true, drums: !isLull, gain: 0.95 });
      } else { // B2: music box lead with a bell countermelody (long chord tones)
        playMelody(t, tAt, { voice: leadV, gain: melGain * 0.9, pan: 0.15 });
        playChords(t, tAt, chords, { pad: true, arp: 'rising', bass: true, counter: true, drums: !isLull });
      }
      t += tAt(beats);
      if (isFinal) {
        // held final chord: pad + rolled music box + bass, then the reverb tail
        const last = chords[chords.length - 1], third = last.minor ? 3 : 4;
        const hold = holdBeats * spb * (1 + ritK);
        [0, third, 7, 12].forEach((iv, k) => mix.add(VT.pad(midiToFreq(last.root + 12 + iv), hold), t + 0.02, padGain / 4, k % 2 ? 0.3 : -0.3));
        [0, 7, 12, 12 + third, 19, 24].forEach((iv, k) => mix.add(VT.musicbox(midiToFreq(last.root + 12 + iv), hold), t + k * 0.07 + jitter(4), vel(melGain * 0.5), (k % 2 ? 1 : -1) * 0.25));
        mix.add(VT.bells(midiToFreq(last.root + 36), hold), t + 0.45, 0.08, 0.1);
        mix.add(VT.bass(midiToFreq(last.root - 12), 1.5), t + 0.01, bassGain);
        t += hold;
      }
    }
    structure.push({ kind, start: +start.toFixed(3), end: +t.toFixed(3) });
  }

  // ---- fx, tail, fade, mastering -------------------------------------------
  const L = mix.L, R = mix.R;
  delayFx(L, R, spb * 0.75, isLull ? 0.28 : 0.2, isLull ? 0.2 : 0.14);
  reverbFx(L, R, isLull ? 0.45 : 0.25, isLull ? 1.6 : 1.1, isLull ? 0.86 : 0.82);
  // total length: last chord + ≥4 s of tail; fade the last 3 s so it ends in silence
  const endSec = Math.min(totalSec, t + 6.5);
  const nOut = Math.round(endSec * SR);
  const fadeN = Math.round(3 * SR), fadeEnd = nOut - Math.round(0.3 * SR);
  for (let i = fadeEnd - fadeN; i < nOut; i++) {
    const x = i < fadeEnd ? 1 - (i - (fadeEnd - fadeN)) / fadeN : 0;
    const g = x * x * (3 - 2 * x);
    L[i] *= g; R[i] *= g;
  }
  const outL = L.subarray(0, nOut), outR = R.subarray(0, nOut);
  const target = lufs ?? (sleep ? -16 : -14);
  const mastered = masterTrack(outL, outR, { lufs: target, ceilingDb: -1 });
  return {
    L: outL, R: outR, seconds: nOut / SR, samples: nOut, sampleRate: SR, bpm, key, meter, bars, seed, mode,
    melody: { id: mel.id, name: mel.name, source: mel.source },
    structure, loudness: { targetLufs: target, ...mastered },
  };
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
