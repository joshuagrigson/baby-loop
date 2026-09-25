// babyloop library — renders the "Calm Library" download bundle: ~10 hours of
// 1080p episodes from the existing specs plus audio-only MP3s, a manifest, and
// a delivery page. Sold as a one-time ad-free download (travel, no wifi, no
// autoplay). Skips episodes that already exist unless --force.
//   babyloop library [--audio] [--force] [--only sensory-30min,sleepy-60min] [--out-dir out/library] [--preview]
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { composeEpisode } from '../../lib/compose.mjs';
import { loadJson } from '../../lib/content.mjs';
import { ffmpegPath } from '../../lib/ffmpeg.mjs';

// Order matters: this is the order parents see on the delivery page.
export const LIBRARY = [
  { spec: 'specs/sensory-30min.json', group: 'Play' },
  { spec: 'specs/learn-colors-shapes.json', group: 'Learn' },
  { spec: 'specs/classical-favorites-60min.json', group: 'Play' },
  { spec: 'specs/story-jack-and-the-beanstalk.json', group: 'Story' },
  { spec: 'specs/holiday-birthday-20min.json', group: 'Play' },
  { spec: 'specs/holiday-christmas-30min.json', group: 'Seasons' },
  { spec: 'specs/holiday-halloween-30min.json', group: 'Seasons' },
  { spec: 'specs/sleepy-60min.json', group: 'Sleep' },
  { spec: 'specs/classical-lullabies-60min.json', group: 'Sleep' },
];

const fmt = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`; };
const mb = (f) => (fs.statSync(f).size / 1048576).toFixed(0);

export async function run(args = {}, pos = []) {
  const outDir = args['out-dir'] ? String(args['out-dir']) : 'out/library';
  const only = args.only ? String(args.only).split(',') : null;
  const preview = !!args.preview;
  fs.mkdirSync(outDir, { recursive: true });
  const items = [];
  let total = 0;
  for (const it of LIBRARY) {
    const spec = loadJson(it.spec);
    if (only && !only.includes(spec.id)) continue;
    const dir = path.join(outDir, spec.id);
    const mp4 = path.join(dir, `${spec.id}${preview ? '-preview' : ''}.mp4`);
    const manifestPath = path.join(dir, 'episode.json');
    if (!args.force && fs.existsSync(mp4) && fs.existsSync(manifestPath)) {
      console.log(`✓ ${spec.id} (exists)`);
    } else {
      const t0 = Date.now();
      console.log(`▶ ${spec.id} — ${spec.title}`);
      await composeEpisode(spec, { outDir: dir, preview });
      console.log(`  done in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
      fs.rmSync(path.join(dir, 'work'), { recursive: true, force: true });
    }
    const man = loadJson(manifestPath);
    let mp3 = null;
    if (args.audio) {
      mp3 = path.join(dir, `${spec.id}.mp3`);
      if (args.force || !fs.existsSync(mp3)) {
        const r = spawnSync(ffmpegPath(), ['-y', '-loglevel', 'error', '-i', mp4, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', '-metadata', `title=${spec.title}`, '-metadata', 'artist=BabyLoop', '-metadata', 'album=Calm Library', '-metadata', 'genre=Children\'s Music', mp3], { stdio: 'inherit' });
        if (r.status !== 0) { console.warn(`  mp3 export failed for ${spec.id}`); mp3 = null; }
      }
    }
    total += man.seconds;
    items.push({ id: spec.id, group: it.group, title: spec.title, hook: spec.hook || '', seconds: man.seconds, file: path.relative(outDir, mp4), mb: mb(mp4), mp3: mp3 ? path.relative(outDir, mp3) : null, mp3mb: mp3 ? mb(mp3) : null, thumbnail: path.relative(outDir, path.join(dir, 'thumbnail.png')), chapters: (man.segments || []).map((s) => ({ start: s.start, label: s.label })) });
  }
  const manifest = { name: 'BabyLoop Calm Library', built: new Date().toISOString().slice(0, 10), totalSeconds: total, items };
  fs.writeFileSync(path.join(outDir, 'library.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(outDir, 'index.html'), deliveryPage(manifest));
  console.log(`\n${items.length} episodes · ${fmt(total)} · ${items.reduce((a, i) => a + Number(i.mb), 0)} MB video${args.audio ? ` · ${items.reduce((a, i) => a + Number(i.mp3mb || 0), 0)} MB audio` : ''}\n${outDir}/index.html is the delivery page (upload the folder to R2/Drive and share that link).`);
  return manifest;
}

function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function deliveryPage(m) {
  const groups = [...new Set(m.items.map((i) => i.group))];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Calm Library</title>
<style>:root{--bg:#f4efe6;--panel:#fffdf9;--ink:#1f1c26;--muted:#6f6979;--line:#e4dccd;--accent:#ffd400}@media(prefers-color-scheme:dark){:root{--bg:#0e1015;--panel:#161920;--ink:#eceef3;--muted:#c9cdd6;--line:#252a35}}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}main{max-width:960px;margin:0 auto;padding:32px 16px 64px}h1{font-size:34px;margin:0 0 6px}p.lead{color:var(--muted);margin:0 0 28px}h2{font-size:20px;margin:28px 0 12px}
.card{display:grid;grid-template-columns:160px 1fr;gap:16px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px;margin-bottom:12px}.card img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;background:#000}.card b{font-size:17px}.card .meta{color:var(--muted);font-size:14px;margin:2px 0 8px}
a.btn{display:inline-block;background:var(--accent);color:#1b1b1b;font-weight:700;text-decoration:none;padding:8px 14px;border-radius:999px;margin:0 8px 6px 0;font-size:14px}a.btn.alt{background:transparent;border:1px solid var(--line);color:var(--ink)}
details{color:var(--muted);font-size:13px}@media(max-width:560px){.card{grid-template-columns:1fr}}footer{color:var(--muted);font-size:13px;margin-top:40px}</style></head><body><main>
<h1>Your Calm Library</h1><p class="lead">${m.items.length} episodes · ${fmt(m.totalSeconds)} of calm, ad-free video. Yours to keep: download once, play anywhere, no wifi needed. Personal use for your family.</p>
${groups.map((g) => `<h2>${esc(g)}</h2>` + m.items.filter((i) => i.group === g).map((i) => `<div class="card"><img src="${esc(i.thumbnail)}" alt=""><div><b>${esc(i.title)}</b><div class="meta">${fmt(i.seconds)} · ${i.mb} MB</div><p style="margin:0 0 10px">${esc(i.hook)}</p><a class="btn" href="${esc(i.file)}" download>Download video</a>${i.mp3 ? `<a class="btn alt" href="${esc(i.mp3)}" download>Audio only (${i.mp3mb} MB)</a>` : ''}<details><summary>Chapters</summary>${i.chapters.map((c) => `${fmt(c.start)} ${esc(c.label)}`).join('<br>')}</details></div></div>`).join('')).join('')}
<footer>Every character is hand-drawn and every note is an original arrangement of a public-domain melody. Narration, where present, is a synthetic voice. Slow cuts, moderate volume — made for short, shared sessions. Questions: reply to your order email.</footer></main></body></html>`;
}
