// `babyloop album …` — sellable lullaby albums (see lib/album.mjs).
//
//   babyloop album specs/albums/music-box-lullabies-vol1.json [--out-dir out/albums/<id>] [--mp3-only] [--tracks 1,3] [--sleep]
//   babyloop album track --melody brahms [--minutes 3.5] [--bpm 64] [--seed 1] [--key 0] [--lead bells] [--sleep] [--out x.wav] [--mp3]
//   babyloop album credits                       composer / PD credit lines for every melody
import fs from 'node:fs';
import path from 'node:path';
import { renderTrack, encodeWav } from '../../lib/music.mjs';
import { renderAlbum, credit, loadSpec } from '../../lib/album.mjs';
import { melodyIds } from '../../lib/melodies.mjs';
import { run as ffmpeg } from '../../lib/ffmpeg.mjs';

export const HELP = `  babyloop album <spec.json> [--out-dir out/albums/<id>] [--mp3-only] [--tracks 1,3] [--sleep]
  babyloop album track --melody brahms [--minutes 3.5] [--bpm 64] [--seed 1] [--key 0] [--lead bells] [--sleep] [--out x.wav] [--mp3]
  babyloop album credits                       composer / public-domain credit lines`;

const num = (args, k, d) => (args[k] !== undefined ? Number(args[k]) : d);
const str = (args, k, d) => (args[k] !== undefined ? String(args[k]) : d);
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export async function run(args = {}, pos = []) {
  const sub = pos[0];
  if (!sub || sub === 'help') { console.log(HELP); return; }

  if (sub === 'credits') {
    for (const id of melodyIds()) { const c = credit(id); console.log(`${id.padEnd(13)} ${c.line.padEnd(34)} ${c.work}`); }
    return;
  }

  if (sub === 'track') {
    const melody = str(args, 'melody', 'brahms');
    const out = str(args, 'out', `out/tracks/${melody}.wav`);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    const t0 = Date.now();
    const r = renderTrack({ melody, mode: str(args, 'mode', 'lullaby'), bpm: args.bpm !== undefined ? Number(args.bpm) : undefined, seed: num(args, 'seed', 1), minutes: num(args, 'minutes', 3.5), key: num(args, 'key', 0), lead: str(args, 'lead', null), sleep: !!args.sleep, lufs: args.lufs !== undefined ? Number(args.lufs) : null });
    fs.writeFileSync(out, encodeWav(r.L, r.R));
    console.log(`${out}  ${r.melody.name}  ${fmt(r.seconds)} @ ${r.bpm} bpm, key ${r.key >= 0 ? '+' : ''}${r.key}  ${r.loudness.lufs.toFixed(1)} LUFS / ${r.loudness.truePeakDb.toFixed(1)} dBTP  [${r.structure.map((s) => s.kind).join(' ')}]  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (args.mp3) {
      const mp3 = out.replace(/\.wav$/i, '') + '.mp3';
      await ffmpeg(['-y', '-i', out, '-c:a', 'libmp3lame', '-b:a', '320k', '-id3v2_version', '3', '-metadata', `title=${r.melody.name}`, '-metadata', 'artist=BabyLoop', '-metadata', `comment=${credit(melody).full}`, mp3]);
      console.log(mp3);
    }
    return;
  }

  // album from a spec
  const specPath = sub;
  if (!fs.existsSync(specPath)) throw new Error(`album: spec not found: ${specPath}\n${HELP}`);
  const spec = loadSpec(specPath);
  const only = args.tracks ? String(args.tracks).split(',').map(Number).filter(Boolean) : null;
  const t0 = Date.now();
  console.log(`Album "${spec.title}" — ${spec.tracks.length} tracks${only ? ` (rendering ${only.join(', ')})` : ''}${args.sleep ? '  [sleep variant −16 LUFS]' : ''}`);
  const r = await renderAlbum(spec, {
    outDir: str(args, 'out-dir', null), mp3Only: !!args['mp3-only'], only, sleep: args.sleep ? true : null,
    onProgress: (t, n, total) => console.log(`  ${String(n).padStart(2, '0')}/${total} ${t.title.padEnd(38)} ${t.duration}  ${t.loudness.lufs.toFixed(1)} LUFS ${t.loudness.truePeakDb.toFixed(1)} dBTP  ${t.structure}  (${t.renderSeconds}s)`),
  });
  console.log(`\n✔ ${r.outDir}  ${r.album.duration} total · ${((Date.now() - t0) / 1000).toFixed(0)}s to build`);
  console.log(`  cover     ${r.cover.cover}\n  listing   ${path.join(r.outDir, 'bandcamp.txt')}, ${path.join(r.outDir, 'distrokid.txt')}\n  manifest  ${path.join(r.outDir, 'album.json')}`);
  return r;
}
