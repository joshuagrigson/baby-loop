#!/usr/bin/env python3
"""
sing.py — make the Piper narrator SING a line onto a melody.

How it works (UTAU-style concatenative singing with a WORLD vocoder):
  1. espeak (via Piper) turns each text segment into phonemes; phonemes are
     split into syllables (one vowel nucleus each; consonants between vowels go
     to the next syllable, clusters split, word boundaries respected).
  2. Syllables are mapped onto notes. Fixed lyrics map 1:1; a segment with fewer
     syllables than notes holds the last vowel across the extra notes (melisma);
     more syllables than notes splits the longest notes in half until they match.
  3. Each syllable is synthesised on its own by Piper (phoneme input, no noise in
     durations) and analysed with WORLD (f0, spectral envelope, aperiodicity).
  4. The voiced core of the syllable (the vowel) is time-stretched to fill the
     note; onset consonants and the coda keep their natural length. The pitch
     track is replaced by the note pitch with a 45 ms glide from the previous
     note and gentle vibrato (5.3 Hz, ±18 cents) after 180 ms. The spectral
     envelope is untouched, so it is still the same voice, just sung.
  5. Syllables are resynthesised and overlap-added with 12 ms fades, placed on
     the beat grid, and a WAV is written.

Input: a JSON spec on stdin or --spec file:
  { "voice": "assets/voices/en_US-kristin-medium.onnx", "bpm": 90, "transpose": -12,
    "out": "out/sing/test.wav", "sampleRate": 44100,
    "segments": [ { "text": "happy birthday dear", "notes": "G4:1/2 G4:1/2 G5:1 E5:1 C5:1" },
                  { "text": "Mila", "notes": "B4:1 A4:1" } ] }
Notes use the melodies.mjs syntax (NAME[#b]OCT:beats, R:beats = rest).
Output: JSON on stdout { out, seconds, syllables:[{text,start,end,midi}] }.
"""
import sys, json, re, argparse, wave
from fractions import Fraction
import numpy as np
import pyworld as pw
from piper import PiperVoice
from piper.config import SynthesisConfig

NOISE = 0.0   # 0 = deterministic takes; >0 adds Piper's sampling variation (use with --takes)
VOWELS = set('aeiouyæɐɑɒɔəɘɚɛɜɝɞɤɨɪɯɵøœɶʉʊʌʏᵻ')
SEMI = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}

def parse_notes(s):
    out = []
    for tok in s.split():
        name, dur = tok.split(':')
        beats = float(Fraction(dur))
        if name.upper() == 'R':
            out.append((None, beats)); continue
        m = re.match(r'^([A-G])([#b]?)(-?\d)$', name)
        if not m: raise ValueError(f'bad note {tok}')
        n = SEMI[m.group(1)] + (1 if m.group(2) == '#' else -1 if m.group(2) == 'b' else 0)
        out.append((12 * (int(m.group(3)) + 1) + n, beats))
    return out

def is_vowel(p):
    return any(ch in VOWELS for ch in p)

def syllabify(voice, text):
    """Return list of syllables, each a list of phoneme symbols (stress marks kept with the vowel)."""
    sentences = voice.phonemize(text)
    phs = [p for s in sentences for p in s]
    # tokens: words split by ' '
    words, cur = [], []
    for p in phs:
        if p == ' ':
            if cur: words.append(cur); cur = []
        elif p in ('.', ',', '!', '?', ';', ':'):
            continue
        else:
            cur.append(p)
    if cur: words.append(cur)
    sylls = []
    word_of = []
    for wi, w in enumerate(words):
        # group into units: consonant or nucleus (consecutive vowel symbols incl. length marks, stress marks attach forward)
        units, pending_stress = [], ''
        i = 0
        while i < len(w):
            p = w[i]
            if p in ('ˈ', 'ˌ'):
                pending_stress += p; i += 1; continue
            if is_vowel(p):
                nuc = [pending_stress] if pending_stress else []
                pending_stress = ''
                while i < len(w) and (is_vowel(w[i]) or w[i] in ('ː', 'ˑ')):
                    nuc.append(w[i]); i += 1
                units.append(('V', nuc))
            else:
                units.append(('C', [p])); i += 1
        vidx = [k for k, u in enumerate(units) if u[0] == 'V']
        if not vidx:
            if sylls: sylls[-1] += [x for u in units for x in u[1]]
            continue
        bounds = []
        for a, b in zip(vidx, vidx[1:]):
            gap = b - a - 1
            split = a + 1 + (0 if gap <= 1 else 1)   # 1 consonant → onset of next; 2+ → first is coda
            bounds.append(split)
        starts = [0] + bounds
        ends = bounds + [len(units)]
        for s0, e0 in zip(starts, ends):
            sylls.append([x for u in units[s0:e0] for x in u[1]])
            word_of.append(wi)
    syllabify.word_of = word_of
    return sylls

SUNG_WORDS = {'to': 'too', 'the': 'thee', 'a': 'ah'}
def sung_text(text):
    """Singers do not reduce function words: 'to' is sung 'too'."""
    return ' '.join(SUNG_WORDS.get(w.lower(), w) for w in text.split())

def open_vowels(syl):
    """Replace a reduced schwa nucleus with a full open vowel, as a singer would (Mila → Mee-lah)."""
    out = []
    for k, p in enumerate(syl):
        prev_v = k > 0 and is_vowel(syl[k - 1])
        closed = any(not is_vowel(q) and q not in ('ˈ', 'ˌ', 'ː', 'ˑ') for q in syl[k + 1:])
        if p == 'ə' and not prev_v and not closed: out.append('ɑ')   # open syllable: Mi-la → Mee-lah; closed (Li-am) stays soft
        elif p == 'ɚ' and not prev_v: out.append('ɜː')
        elif p == 'ᵻ': out.append('ɪ')
        else: out.append(p)
    return out

def align(sylls, notes):
    notes = [list(n) for n in notes if n[0] is not None]  # rests inside a segment are ignored here
    while len(sylls) > len(notes):
        k = max(range(len(notes)), key=lambda i: notes[i][1])
        m, d = notes[k]
        notes[k:k + 1] = [[m, d / 2], [m, d / 2]]
    groups = [[n] for n in notes[:len(sylls)]]
    for extra in notes[len(sylls):]:
        groups[-1].append(extra)            # melisma on the last syllable
    return list(zip(sylls, groups))

def synth_syllable(voice, phonemes, sr_out, length_scale):
    ids = voice.phonemes_to_ids(phonemes)
    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=NOISE, noise_w_scale=0.0)
    audio = voice.phoneme_ids_to_audio(ids, cfg)
    audio = np.asarray(audio, dtype=np.float64)
    sr_in = voice.config.sample_rate
    if sr_in != sr_out:
        n = int(round(len(audio) * sr_out / sr_in))
        audio = np.interp(np.linspace(0, len(audio) - 1, n), np.arange(len(audio)), audio)
    # trim leading/trailing silence
    env = np.abs(audio)
    thr = max(1e-4, env.max() * 0.004)
    idx = np.where(env > thr)[0]
    if len(idx): audio = audio[max(0, idx[0] - int(0.02 * sr_out)): idx[-1] + int(0.03 * sr_out)]
    return audio

def analyse(x, sr, frame_ms=5.0):
    f0, t = pw.harvest(x, sr, f0_floor=70, f0_ceil=600, frame_period=frame_ms)
    return f0, pw.cheaptrick(x, f0, t, sr), pw.d4c(x, f0, t, sr)

def split_word(f0, sp, n, codas=None):
    """Split a word's frames into n syllables at the unvoiced gaps / energy dips between vowels."""
    nf = len(f0)
    if n <= 1: return [(0, nf)]
    voiced = f0 > 0
    energy = np.log(np.sum(sp, axis=1) + 1e-12)
    runs, k = [], 0
    while k < nf:
        if voiced[k]:
            j = k
            while j < nf and voiced[j]: j += 1
            if j - k >= 4: runs.append((k, j))
            k = j
        else: k += 1
    cuts = []
    if len(runs) >= n:
        gaps = [(runs[i + 1][0] - runs[i][1], i) for i in range(len(runs) - 1)]
        keep = sorted(sorted(gaps, reverse=True)[:n - 1], key=lambda g: g[1])
        # a syllable with a coda consonant (birth|day) keeps the unvoiced gap: cut at the gap's END;
        # an open syllable (hap|py) gives the gap to the next syllable's onset: cut at the gap's START
        cuts = []
        for j, (_, i) in enumerate(keep):
            has_coda = bool(codas and codas[j])
            cuts.append(max(runs[i][1], runs[i + 1][0] - 2) if has_coda else runs[i][1])
    else:
        # fewer voiced runs than syllables (e.g. Mila is voiced throughout): cut at the deepest energy dips
        sm = np.convolve(energy, np.ones(5) / 5, mode='same')
        lo = runs[0][0] if runs else 0; hi = runs[-1][1] if runs else nf
        cand = [i for i in range(lo + 6, hi - 6) if sm[i] <= sm[i - 1] and sm[i] <= sm[i + 1]]
        cand.sort(key=lambda i: sm[i])
        chosen = []
        for c in cand:
            if all(abs(c - d) > 10 for d in chosen): chosen.append(c)
            if len(chosen) == n - 1: break
        if len(chosen) < n - 1: return None
        cuts = sorted(chosen)
    b = [0] + cuts + [nf]
    return [(b[i], b[i + 1]) for i in range(n)]

def sing_syllable(x, sr, notes, beat_s, prev_midi, transpose, frame_ms=5.0, frames=None):
    """Return audio for one syllable stretched across its notes."""
    if frames is None:
        f0, sp, ap = analyse(x, sr, frame_ms)
    else:
        f0, sp, ap = frames
    nf = len(f0)
    voiced = f0 > 0
    vi = np.where(voiced)[0]
    total_s = sum(d for _, d in notes) * beat_s
    total_f = max(4, int(round(total_s * 1000 / frame_ms)))
    if len(vi) < 3:
        # unvoiced syllable (rare): just pad
        src_idx = np.minimum(np.arange(total_f), nf - 1)
    else:
        v0, v1 = vi[0], vi[-1]
        onset = np.arange(0, v0)                       # consonant onset, natural length
        coda = np.arange(v1 + 1, nf)                   # coda, natural length
        head = min(8, (v1 - v0) // 4)                  # keep ~40 ms of the vowel attack natural
        tail = min(6, (v1 - v0) // 4)
        core_src = np.arange(v0 + head, v1 - tail + 1)
        fixed = len(onset) + head + tail + len(coda)
        core_len = max(4, total_f - fixed)
        if len(core_src) < 2: core_src = np.arange(v0, v1 + 1)
        core = np.linspace(core_src[0], core_src[-1], core_len)
        src_idx = np.concatenate([onset, np.arange(v0, v0 + head), core, np.arange(v1 - tail + 1, v1 + 1), coda])
    src_idx = np.clip(src_idx, 0, nf - 1)
    lo = np.floor(src_idx).astype(int); hi = np.minimum(lo + 1, nf - 1); fr = (src_idx - lo)[:, None]
    sp2 = sp[lo] * (1 - fr) + sp[hi] * fr
    ap2 = ap[lo] * (1 - fr) + ap[hi] * fr
    v2 = voiced[np.round(src_idx).astype(int)]
    # target pitch per frame, following the notes in order across the syllable
    n = len(src_idx)
    tgt = np.zeros(n)
    edges = np.cumsum([0] + [d * beat_s for _, d in notes])
    edges = edges / edges[-1] * n
    # the onset consonant sits before the beat conceptually; pitch starts at the first note
    for k, (m, _) in enumerate(notes):
        a, b = int(edges[k]), int(edges[k + 1])
        tgt[a:b] = 440.0 * 2 ** ((m + transpose - 69) / 12)
    # glide into the first note from the previous note, and between notes of a melisma
    glide = max(1, int(45 / frame_ms))
    start_hz = 440.0 * 2 ** ((prev_midi + transpose - 69) / 12) if prev_midi is not None else tgt[0]
    cents = 1200 * np.log2(tgt)
    cents[:glide] = np.linspace(1200 * np.log2(start_hz), cents[min(glide, n - 1)], glide)
    for k in range(1, len(notes)):
        a = int(edges[k]); b = min(n, a + glide)
        if b > a: cents[a:b] = np.linspace(cents[a - 1], cents[min(b, n - 1)], b - a)
    # vibrato after 180 ms of each note, fading in
    tt = np.arange(n) * frame_ms / 1000
    vib = np.zeros(n)
    for k in range(len(notes)):
        a, b = int(edges[k]), int(edges[k + 1])
        if b - a > int(250 / frame_ms):
            local = tt[a:b] - tt[a]
            depth = np.clip((local - 0.18) / 0.25, 0, 1) * 18
            vib[a:b] = depth * np.sin(2 * np.pi * 5.3 * local)
    f0_new = 2 ** ((cents + vib) / 1200)
    f0_new = np.where(v2, f0_new, 0.0)
    y = pw.synthesize(np.ascontiguousarray(f0_new), np.ascontiguousarray(sp2), np.ascontiguousarray(ap2), sr, frame_ms)
    lead_s = (len(np.arange(0, vi[0])) if len(vi) >= 3 else 0) * frame_ms / 1000
    return y, lead_s

def main():
    ap_ = argparse.ArgumentParser(); ap_.add_argument('--spec'); a = ap_.parse_args()
    spec = json.load(open(a.spec)) if a.spec else json.load(sys.stdin)
    global NOISE
    NOISE = float(spec.get('noise', NOISE))
    sr = int(spec.get('sampleRate', 44100))
    voice = PiperVoice.load(spec['voice'])
    bpm = float(spec.get('bpm', 90)); beat_s = 60.0 / bpm
    transpose = int(spec.get('transpose', -12))
    ls = float(spec.get('lengthScale', 1.0))
    placed, prev_midi, cursor = [], None, float(spec.get('lead', 0.4))
    for seg_i, seg in enumerate(spec['segments']):
        notes = parse_notes(seg['notes'])
        if seg.get('rest') or not seg.get('text', '').strip():
            cursor += sum(d for _, d in notes) * beat_s; continue
        sylls = [open_vowels(x) for x in syllabify(voice, sung_text(seg['text']))]
        word_of = syllabify.word_of
        pairs = align(sylls, notes)
        seg_ls = float(seg.get('lengthScale', ls))
        word_mode = seg.get('mode', 'word') == 'word'
        # word-level synthesis keeps consonants and joins natural; fall back to per-syllable if the split fails
        frames_for = {}
        for wi in sorted(set(word_of)):
            idx = [k for k, w in enumerate(word_of) if w == wi]
            if len(idx) < 2 or not word_mode: continue
            x = synth_syllable(voice, [p for k in idx for p in sylls[k]], sr, seg_ls)
            f0, sp, ap = analyse(x, sr)
            codas = []
            for k in idx[:-1]:
                syl = sylls[k]; vpos = max(i for i, p in enumerate(syl) if is_vowel(p))
                codas.append([p for p in syl[vpos + 1:] if p not in ('ː', 'ˑ')])
            parts = split_word(f0, sp, len(idx), codas)
            if parts:
                for k, (a0, b0) in zip(idx, parts):
                    frames_for[k] = (f0[a0:b0].copy(), sp[a0:b0].copy(), ap[a0:b0].copy())
        for si, (syl, ns) in enumerate(pairs):
            if si in frames_for:
                y, lead_s = sing_syllable(None, sr, ns, beat_s, prev_midi, transpose, frames=frames_for[si])
            else:
                x = synth_syllable(voice, syl, sr, seg_ls)
                y, lead_s = sing_syllable(x, sr, ns, beat_s, prev_midi, transpose)
            dur = sum(d for _, d in ns) * beat_s
            placed.append({'seg': seg_i, 'audio': y, 'start': max(0.0, cursor - lead_s), 'beat': cursor, 'text': ''.join(p for p in syl if p not in 'ˈˌ'), 'midi': ns[0][0], 'dur': dur})
            prev_midi = ns[-1][0]
            cursor += dur
        # rests after the segment's notes are part of its duration already
    total = cursor + 0.6
    out = np.zeros(int(total * sr) + sr)
    fade = int(0.012 * sr)
    for p in placed:
        y = p['audio'].copy()
        if len(y) > 2 * fade:
            y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
        s = int(p['start'] * sr)
        out[s:s + len(y)] += y
    out = out[:int(total * sr)]
    peak = np.max(np.abs(out)) or 1.0
    out = out / peak * 0.89
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(spec['out'], 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(pcm.tobytes())
    print(json.dumps({'out': spec['out'], 'seconds': total, 'syllables': [{'seg': p['seg'], 'text': p['text'], 'beat': round(p['beat'], 3), 'midi': p['midi'], 'dur': round(p['dur'], 3)} for p in placed]}))

if __name__ == '__main__':
    main()
