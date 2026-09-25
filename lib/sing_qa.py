#!/usr/bin/env python3
"""
sing_qa.py — quality gate for sung names.

Renders several takes of the song that differ only in how the NAME segment is
synthesised (whole-word vs syllable-by-syllable, three speaking rates), runs
speech recognition (faster-whisper) on each, and keeps the take in which the
recogniser hears the name most clearly. Every other line is identical across
takes, so this costs ~6 renders of a 16-second vocal (about a minute).

Input: the same JSON spec as sing.py on stdin, with the name segment marked
"name": true and an optional top-level "expect" (the name as written).
Output: sing.py's JSON plus { qa: { chosen, score, heard, takes:[...] } }.
Falls back to a single sing.py render if faster-whisper is not installed.
"""
import sys, json, os, shutil, subprocess, tempfile, difflib, re

here = os.path.dirname(os.path.abspath(__file__))
spec = json.load(sys.stdin)
out = spec['out']

def render(s):
    r = subprocess.run([sys.executable, os.path.join(here, 'sing.py')], input=json.dumps(s), capture_output=True, text=True)
    if r.returncode != 0: raise SystemExit(r.stderr[-800:])
    return json.loads(r.stdout)

try:
    from faster_whisper import WhisperModel
except Exception:
    res = render(spec); res['qa'] = {'chosen': 'default', 'note': 'faster-whisper not installed; no QA'}
    print(json.dumps(res)); sys.exit(0)

name_idx = next((i for i, g in enumerate(spec['segments']) if g.get('name')), None)
expect = (spec.get('expect') or (spec['segments'][name_idx]['text'] if name_idx is not None else '')).lower()
variants = [{'mode': m, 'lengthScale': ls} for m in ('word', 'syllable') for ls in (1.0, 0.9, 1.15)]
if name_idx is None: variants = variants[:1]

model = WhisperModel(os.environ.get('BABYLOOP_QA_MODEL', 'small.en'), device='cpu', compute_type='int8')
tmp = tempfile.mkdtemp(prefix='singqa-')
takes, best = [], None
norm = lambda t: re.sub(r'[^a-z ]', '', t.lower())
for k, v in enumerate(variants):
    s = json.loads(json.dumps(spec)); s['out'] = os.path.join(tmp, f'take{k}.wav')
    if name_idx is not None: s['segments'][name_idx].update(v)
    res = render(s)
    # listen only to the line that carries the name ("happy birthday dear ___"): Whisper tends to
    # stop after the first of several identical lines, so whole-song transcripts under-report
    audio_in = s['out']
    if name_idx is not None:
        import wave, numpy as np
        syl = res['syllables']
        line = [x for x in syl if x['seg'] in (name_idx - 1, name_idx)]
        a = max(0.0, line[0]['beat'] - 0.5); b = line[-1]['beat'] + line[-1]['dur'] + 0.6
        with wave.open(s['out']) as w:
            sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        crop = x[int(a * sr):int(b * sr)]
        audio_in = os.path.join(tmp, f'crop{k}.wav')
        with wave.open(audio_in, 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(crop.tobytes())
    def hear(f):
        segs, _ = model.transcribe(f, beam_size=5, language='en', condition_on_previous_text=False)
        return ' '.join(x.text.strip() for x in segs)
    def name_score(h):
        ws = norm(h).split(); cs = []
        for i, w in enumerate(ws):
            cs.append(w)
            if i + 1 < len(ws): cs.append(w + ws[i + 1])
        return max([difflib.SequenceMatcher(None, c, norm(expect).replace(' ', '')).ratio() for c in cs] or [0])
    # Whisper is noisy on sung audio: judge each take on both the whole song and the name line, keep the better
    heard_full = hear(s['out']); heard_line = hear(audio_in) if audio_in != s['out'] else heard_full
    heard = heard_line if name_score(heard_line) >= name_score(heard_full) else heard_full
    words = norm(heard).split()
    # the name is what follows "dear" (or the best-matching single/double word anywhere)
    cands = []
    for i, w in enumerate(words):
        cands.append(w); 
        if i + 1 < len(words): cands.append(w + words[i + 1])
    score = max([difflib.SequenceMatcher(None, c, norm(expect).replace(' ', '')).ratio() for c in cands] or [0])
    lyric = 1.0 if 'birthday' in norm(heard) else 0.0
    total = score * 0.8 + lyric * 0.2
    takes.append({'variant': v, 'heard': heard, 'nameScore': round(score, 3), 'lyricScore': round(lyric, 2), 'score': round(total, 3)})
    if best is None or total > best[0]: best = (total, k, res)
    if score >= 0.99 and lyric >= 1: break
shutil.copyfile(os.path.join(tmp, f'take{best[1]}.wav'), out)
res = best[2]; res['out'] = out
res['qa'] = {'chosen': variants[best[1]], 'score': round(best[0], 3), 'heard': takes[best[1]]['heard'], 'takes': takes}
shutil.rmtree(tmp, ignore_errors=True)
print(json.dumps(res))
