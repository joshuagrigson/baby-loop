// Locate a full ffmpeg (libx264 + aac). Order:
//   1. $BABYLOOP_FFMPEG          2. `ffmpeg` on PATH
//   3. the static binary shipped by the Python package imageio-ffmpeg
//      (pip install imageio-ffmpeg) — handy on locked-down machines.
import { spawn, spawnSync } from 'node:child_process';

let cached = null;
export function ffmpegPath() {
  if (cached) return cached;
  const tryBin = (bin) => {
    try {
      const r = spawnSync(bin, ['-hide_banner', '-encoders'], { encoding: 'utf8' });
      if (r.status === 0 && /libx264/.test(r.stdout) && /\baac\b/.test(r.stdout)) return bin;
    } catch { /* ignore */ }
    return null;
  };
  const candidates = [];
  if (process.env.BABYLOOP_FFMPEG) candidates.push(process.env.BABYLOOP_FFMPEG);
  candidates.push('ffmpeg');
  for (const c of candidates) { const ok = tryBin(c); if (ok) return (cached = ok); }
  for (const py of ['python3', 'python']) {
    try {
      const r = spawnSync(py, ['-c', 'import imageio_ffmpeg as f; print(f.get_ffmpeg_exe())'], { encoding: 'utf8' });
      if (r.status === 0) { const p = r.stdout.trim(); const ok = tryBin(p); if (ok) return (cached = ok); }
    } catch { /* ignore */ }
  }
  throw new Error('No ffmpeg with libx264+aac found. Install ffmpeg, or `pip install imageio-ffmpeg`, or set BABYLOOP_FFMPEG=/path/to/ffmpeg');
}

export function run(args, { quiet = true, input = null } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(ffmpegPath(), ['-hide_banner', '-loglevel', quiet ? 'error' : 'info', ...args], { stdio: [input ? 'pipe' : 'ignore', 'inherit', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; if (!quiet) process.stderr.write(d); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}\n${err.slice(-2000)}`))));
    if (input) { p.stdin.end(input); }
  });
}

// Duration in seconds via `ffmpeg -i` (no ffprobe needed).
export function probeDuration(file) {
  const r = spawnSync(ffmpegPath(), ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(r.stderr || '');
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]);
}

export function probeStreams(file) {
  const r = spawnSync(ffmpegPath(), ['-hide_banner', '-i', file], { encoding: 'utf8' });
  return (r.stderr || '').split('\n').filter((l) => /Stream #/.test(l)).map((l) => l.trim());
}
