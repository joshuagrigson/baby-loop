// Sellable lullaby albums (Bandcamp day one, DistroKid later).
//   renderAlbum(spec | specPath, { outDir }) →
//     NN - Title.wav  (44.1 kHz / 16-bit)     NN - Title.flac   NN - Title.mp3 (320k, ID3v2.3 + cover)
//     cover.png (3000×3000)  cover-1400.png   album.json   bandcamp.txt   distrokid.txt
//
// Why the tracks look the way they do: streaming platforms pay nothing on
// tracks under ~1,000 plays/yr, flag "functional noise", require ≥ 2 minutes,
// and suppress mass near-duplicate uploads. So every track is a real 3–5 min
// arrangement (intro / varied verses / bridge / ritardando ending — see
// renderTrack in music.mjs), each with its own seed, key and tempo, mastered
// to −14 LUFS / −1 dBTP (−16 LUFS with `sleep: true`).
//
// Every composition is public domain and every recording is ours, synthesised
// from scratch — the credit lines and the exact PD/original-recording wording
// a distributor needs are written into bandcamp.txt / distrokid.txt.
import fs from 'node:fs';
import path from 'node:path';
import { renderTrack, encodeWav } from './music.mjs';
import { MELODIES } from './melodies.mjs';
import { run as ffmpeg, probeDuration } from './ffmpeg.mjs';
import { makeCanvas } from './canvas.mjs';
import { label, circle, ellipse, star, sparkle, shaded, face, roundRect } from './draw.mjs';
import { softCloud } from './scenes/garden.mjs';
import { drawProp } from './critters/props.mjs';
import { withAlpha, mixHex, TAU } from './easing.mjs';
import { makeRng, hashString } from './rng.mjs';

export const ARTIST = 'BabyLoop';

// Composition credits. `died` lets the distributor text state the PD basis
// (life + 70 everywhere; all US publications pre-1930 are PD regardless).
export const COMPOSERS = {
  twinkle: { composer: 'Traditional', work: 'French folk tune "Ah! vous dirai-je, maman"', year: 1761 },
  mary: { composer: 'Traditional', work: 'American nursery song (Lowell Mason)', year: 1830 },
  row: { composer: 'Traditional', work: 'American nursery round', year: 1852 },
  frere: { composer: 'Traditional', work: 'French nursery round', year: 1780 },
  london: { composer: 'Traditional', work: 'English nursery song', year: 1744 },
  oldmac: { composer: 'Traditional', work: 'American folk song', year: 1917 },
  itsy: { composer: 'Traditional', work: 'American nursery song', year: 1910 },
  brahms: { composer: 'Johannes Brahms', work: 'Wiegenlied, Op. 49 No. 4', year: 1868, died: 1897 },
  ode: { composer: 'Ludwig van Beethoven', work: 'Symphony No. 9, "Ode to Joy" theme', year: 1824, died: 1827 },
  minuet: { composer: 'Christian Petzold', work: 'Minuet in G major, BWV Anh. 114', year: 1725, died: 1733 },
  canon: { composer: 'Johann Pachelbel', work: 'Canon in D', year: 1680, died: 1706 },
  furelise: { composer: 'Ludwig van Beethoven', work: 'Bagatelle No. 25, "Für Elise"', year: 1810, died: 1827 },
  birthday: { composer: 'Mildred J. Hill & Patty S. Hill', work: '"Good Morning to All" (PD per Marya v. Warner/Chappell, 2016)', year: 1893, died: 1946 },
  jingle: { composer: 'James Lord Pierpont', work: 'Jingle Bells', year: 1857, died: 1893 },
  deckhalls: { composer: 'Traditional', work: 'Welsh carol "Nos Galan"', year: 1794 },
  silentnight: { composer: 'Franz Xaver Gruber', work: 'Stille Nacht', year: 1818, died: 1863 },
  wewish: { composer: 'Traditional', work: 'English carol (West Country)', year: 1800 },
  nachtmusik: { composer: 'Wolfgang Amadeus Mozart', work: 'Eine kleine Nachtmusik, K. 525', year: 1787, died: 1791 },
  turkish: { composer: 'Wolfgang Amadeus Mozart', work: 'Rondo alla Turca, K. 331', year: 1783, died: 1791 },
  jesu: { composer: 'Johann Sebastian Bach', work: 'Jesu, Joy of Man\'s Desiring, BWV 147', year: 1723, died: 1750 },
  prelude: { composer: 'Johann Sebastian Bach', work: 'Prelude in C major, BWV 846', year: 1722, died: 1750 },
  bridal: { composer: 'Richard Wagner', work: 'Bridal Chorus, from Lohengrin', year: 1850, died: 1883 },
  spring: { composer: 'Antonio Vivaldi', work: 'The Four Seasons, "Spring", Op. 8 No. 1', year: 1725, died: 1741 },
  swanlake: { composer: 'Pyotr Ilyich Tchaikovsky', work: 'Swan Lake, Op. 20 (theme)', year: 1876, died: 1893 },
  danube: { composer: 'Johann Strauss II', work: 'The Blue Danube, Op. 314', year: 1866, died: 1899 },
  morning: { composer: 'Edvard Grieg', work: 'Morning Mood, Peer Gynt Op. 46', year: 1875, died: 1907 },
  mountainking: { composer: 'Edvard Grieg', work: 'In the Hall of the Mountain King, Peer Gynt Op. 46', year: 1875, died: 1907 },
  surprise: { composer: 'Joseph Haydn', work: 'Symphony No. 94, "Surprise" (Andante)', year: 1791, died: 1809 },
  cancan: { composer: 'Jacques Offenbach', work: 'Galop infernal, from Orpheus in the Underworld', year: 1858, died: 1880 },
  williamtell: { composer: 'Gioachino Rossini', work: 'William Tell Overture (finale)', year: 1829, died: 1868 },
  largo: { composer: 'Antonín Dvořák', work: 'Symphony No. 9, "From the New World", Largo', year: 1893, died: 1904 },
  k545: { composer: 'Wolfgang Amadeus Mozart', work: 'Piano Sonata No. 16, K. 545', year: 1788, died: 1791 },
  clairdelune: { composer: 'Claude Debussy', work: 'Clair de lune, Suite bergamasque', year: 1905, died: 1918 },
  gymnopedie: { composer: 'Erik Satie', work: 'Gymnopédie No. 1', year: 1888, died: 1925 },
  moonlight: { composer: 'Ludwig van Beethoven', work: 'Piano Sonata No. 14, "Moonlight", Op. 27 No. 2', year: 1801, died: 1827 },
  bumblebee: { composer: 'Nikolai Rimsky-Korsakov', work: 'Flight of the Bumblebee', year: 1900, died: 1908 },
  greensleeves: { composer: 'Traditional', work: 'English folk song "Greensleeves"', year: 1580 },
};

export function credit(melodyId) {
  const c = COMPOSERS[melodyId] || { composer: 'Traditional', work: MELODIES[melodyId]?.name || melodyId, year: null };
  const short = c.composer === 'Traditional' ? 'Traditional' : c.composer.split(' ').map((w, i, a) => (i < a.length - 1 && !/^(van|von|de)$/i.test(w) && !w.includes('&') ? w[0] + '.' : w)).join(' ');
  return { ...c, line: `${short}, arr. ${ARTIST}`, full: `${c.composer}, arr. ${ARTIST}`, work: c.work + (c.year ? ` (${c.year})` : '') };
}

export const PD_STATEMENT = `All compositions on this release are in the public domain worldwide (composers deceased more than 70 years, and/or first published before 1930). Every recording is an original sound recording created, arranged, performed (synthesised) and produced by ${ARTIST}. No samples, loops, stock music or third-party recordings were used. These are NOT cover versions of any copyrighted work and require no mechanical licence. Master recordings © and ℗ ${ARTIST}. Please do not register these tracks as covers; they may be enrolled in Content ID as original masters owned by ${ARTIST}.`;

const slug = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

export function loadSpec(specOrPath) {
  if (typeof specOrPath === 'string') return { ...JSON.parse(fs.readFileSync(specOrPath, 'utf8')), _path: specOrPath };
  return specOrPath;
}

export function trackTitle(spec, t) {
  if (t.title) return t.title;
  return (MELODIES[t.melody]?.name || t.melody).replace(/\s*\((child|music-box)[^)]*\)\s*/i, '').trim();
}

// ---- cover art ----------------------------------------------------------------
// A sleepy hero on moonlit hills, stars, a dozing moon and the title in the
// house label() style. Square; drawn at any size and downscaled for the 1400 copy.
export function drawCover(ctx, S, spec) {
  const c = { hero: 'sheep', friends: [], hat: null, snow: false, top: '#0a1230', bottom: '#2a3f7a', moon: '#ffe9a6', star: '#fff5c2', ...(spec.cover || {}) };
  const rng = makeRng(hashString(spec.id || spec.title || 'album'));
  // sky
  const sky = ctx.createLinearGradient(0, 0, 0, S);
  sky.addColorStop(0, c.top); sky.addColorStop(0.62, mixHex(c.top, c.bottom, 0.7)); sky.addColorStop(1, c.bottom);
  ctx.fillStyle = sky; ctx.fillRect(0, 0, S, S);
  const hz = ctx.createLinearGradient(0, S * 0.42, 0, S * 0.72);
  hz.addColorStop(0, withAlpha('#7a6fc4', 0)); hz.addColorStop(1, withAlpha('#7a6fc4', 0.3));
  ctx.fillStyle = hz; ctx.fillRect(0, S * 0.42, S, S * 0.3);
  // stars
  for (let i = 0; i < 170; i++) {
    const x = rng.range(0, 1) * S, y = rng.range(0, 0.66) * S, r = S * rng.range(0.0015, 0.0045), tw = rng.range(0.45, 1);
    if (rng.chance(0.1)) { circle(ctx, x, y, r * 6, withAlpha(c.star, 0.08)); star(ctx, x, y, r * 4.5, r * 1.5, 4, withAlpha(c.star, tw)); }
    else circle(ctx, x, y, r, withAlpha(c.star, tw));
  }
  for (let i = 0; i < 5; i++) sparkle(ctx, rng.range(0.05, 0.95) * S, rng.range(0.05, 0.6) * S, S * rng.range(0.012, 0.022), c.star, rng.range(0.5, 0.9));
  // moon (dozing), mid-right, its lower edge tucked behind a cloud
  const mx = S * 0.82, my = S * 0.50, mr = S * 0.09;
  const glow = ctx.createRadialGradient(mx, my, mr * 0.9, mx, my, mr * 3.2);
  glow.addColorStop(0, withAlpha(c.moon, 0.32)); glow.addColorStop(0.4, withAlpha(c.moon, 0.1)); glow.addColorStop(1, withAlpha(c.moon, 0));
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(mx, my, mr * 3.2, 0, TAU); ctx.fill();
  circle(ctx, mx, my, mr, shaded(ctx, c.moon, mr, mx, my, 0.7), withAlpha('#c9a860', 0.6), S * 0.003);
  for (const [cx, cy, cr] of [[-0.5, -0.45, 0.14], [0.55, -0.35, 0.1], [0.5, 0.5, 0.12], [-0.62, 0.3, 0.08]]) circle(ctx, mx + cx * mr, my + cy * mr, cr * mr, withAlpha('#d8b86a', 0.3));
  face(ctx, { x: mx, y: my, size: mr * 1.8, blink: 1, mouth: 0.05, cheeks: true, ink: '#6b5a2e', brows: false });
  // clouds
  softCloud(ctx, S * 0.15, S * 0.55, S * 0.26, { rim: '#aebcee', top: '#4d5f99', belly: '#2d3d72', rimW: 0.04 });
  softCloud(ctx, S * 0.93, S * 0.62, S * 0.24, { rim: '#aebcee', top: '#4d5f99', belly: '#2d3d72', rimW: 0.04, alpha: 0.95 });
  // hills
  const hill = (base, amp, f, off, c1, c2, rim) => {
    ctx.beginPath(); ctx.moveTo(0, S);
    const pts = [];
    for (let x = 0; x <= S + 20; x += 20) { const y = base + Math.sin((x / S) * TAU * f + off) * amp + Math.sin((x / S) * TAU * f * 2.2 + off) * amp * 0.3; pts.push([x, y]); ctx.lineTo(x, y); }
    ctx.lineTo(S, S); ctx.closePath();
    const g = ctx.createLinearGradient(0, base - amp, 0, S); g.addColorStop(0, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = withAlpha(rim, 0.35); ctx.lineWidth = S * 0.003; ctx.stroke();
  };
  hill(S * 0.70, S * 0.035, 1.1, 0.6, '#34498a', '#223466', '#9fb2f0');
  hill(S * 0.78, S * 0.03, 0.8, 2.1, '#26396f', '#18264f', '#8497da');
  hill(S * 0.88, S * 0.02, 0.6, 4.0, '#1b2a57', '#0d1735', '#7084c8');
  // snow (holiday covers)
  if (c.snow) for (let i = 0; i < 120; i++) circle(ctx, rng.range(0, 1) * S, rng.range(0, 1) * S, S * rng.range(0.002, 0.006), withAlpha('#ffffff', rng.range(0.35, 0.85)));
  // hero + friends, asleep on the middle hill
  const sleepy = { blink: 1, mouth: 0.05, brow: 0.2, hat: c.hat || undefined };
  const ground = S * 0.80;
  const friends = (c.friends || []).slice(0, 2);
  friends.forEach((kind, i) => {
    const fx = S * (i === 0 ? 0.2 : 0.8), fs = S * 0.2;
    ellipse(ctx, fx, ground + S * 0.005, fs * 0.36, fs * 0.06, withAlpha('#050a1f', 0.35));
    drawProp(ctx, `critter:${kind}`, fx, ground - fs * 0.5 - S * 0.01, fs, { ...sleepy, blink: 0.95, flip: i === 1, tilt: i === 0 ? -0.06 : 0.06 });
  });
  const hs = S * 0.36;
  ellipse(ctx, S * 0.5, ground + S * 0.012, hs * 0.38, hs * 0.06, withAlpha('#050a1f', 0.4));
  drawProp(ctx, `critter:${c.hero}`, S * 0.5, ground - hs * 0.5 - S * 0.012, hs, sleepy);
  for (let i = 0; i < 3; i++) label(ctx, 'z', S * (0.66 + i * 0.05), ground - hs * (1.02 + i * 0.14), { size: S * (0.035 + 0.014 * i), fill: c.star, stroke: null, alpha: 0.9 - i * 0.2 });
  // title
  const lines = c.titleLines || String(spec.title).replace(/,?\s*Vol\.?\s*\d+$/i, '').split(/\s*[|·]\s*/).slice(0, 3);
  const big = lines.length > 2 ? S * 0.105 : S * 0.135;
  const gradients = [['#ffffff', '#ffe9b0'], ['#fff1c2', '#ffc85c'], ['#ffffff', '#ffe9b0']];
  lines.forEach((l, i) => label(ctx, l.toUpperCase(), S * 0.5, S * 0.06 + i * big * 1.05, { size: big, align: 'center', baseline: 'top', stroke: '#0c1538', lw: big * 0.18, maxWidth: S * 0.9, shadow: big * 0.22, gradient: gradients[i % 3] }));
  // badge on the foreground hills (clear of tall heroes' ears and hats)
  const badge = c.badge || (/Vol\.?\s*(\d+)/i.exec(spec.title || '') ? `Vol. ${/Vol\.?\s*(\d+)/i.exec(spec.title)[1]}` : null);
  if (badge) {
    const bh = S * 0.058, by = S * 0.868;
    ctx.font = `700 ${bh * 0.58}px "Fredoka", "Baloo 2", "DejaVu Sans", sans-serif`;
    const bw = Math.max(S * 0.18, ctx.measureText(badge).width + bh * 1.2);
    roundRect(ctx, S * 0.5 - bw / 2, by, bw, bh, bh / 2, withAlpha('#0c1538', 0.6), withAlpha(c.star, 0.85), S * 0.004);
    label(ctx, badge, S * 0.5, by + bh / 2 + S * 0.002, { size: bh * 0.58, fill: c.star, stroke: null });
  }
  // artist
  label(ctx, ARTIST.toUpperCase().split('').join(' '), S * 0.5, S * 0.955, { size: S * 0.032, fill: withAlpha(c.star, 0.9), stroke: null, weight: 600 });
  // vignette
  const v = ctx.createRadialGradient(S / 2, S / 2, S * 0.5, S / 2, S / 2, S * 1.0);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(6,8,30,0.35)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, S, S);
}

export function renderCover(spec, { out, size = 3000, small = 1400, smallOut = null } = {}) {
  const { canvas, ctx } = makeCanvas(size, size);
  drawCover(ctx, size, spec);
  fs.writeFileSync(out, canvas.toBuffer('image/png'));
  const result = { cover: out };
  if (small && smallOut) {
    const { canvas: c2, ctx: x2 } = makeCanvas(small, small);
    x2.imageSmoothingEnabled = true; x2.imageSmoothingQuality = 'high';
    x2.drawImage(canvas, 0, 0, small, small);
    fs.writeFileSync(smallOut, c2.toBuffer('image/png'));
    result.small = smallOut;
  }
  return result;
}

// ---- encoding ---------------------------------------------------------------------
function tagArgs(meta) {
  const out = [];
  for (const [k, v] of Object.entries(meta)) if (v !== undefined && v !== null && v !== '') out.push('-metadata', `${k}=${v}`);
  return out;
}
async function encode(wav, outFile, { codec, meta, cover }) {
  const base = ['-y', '-i', wav];
  const withCover = cover ? ['-i', cover, '-map', '0:a', '-map', '1:v', '-c:v', 'copy', '-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)', '-disposition:v', 'attached_pic'] : [];
  const codecArgs = codec === 'mp3' ? ['-c:a', 'libmp3lame', '-b:a', '320k', '-id3v2_version', '3', '-write_id3v1', '1'] : ['-c:a', 'flac', '-compression_level', '8'];
  try { await ffmpeg([...base, ...withCover, ...codecArgs, ...tagArgs(meta), outFile]); }
  catch (e) {
    if (!cover) throw e;
    await ffmpeg([...base, ...codecArgs, ...tagArgs(meta), outFile]); // cover embedding failed: ship without
  }
  return outFile;
}

// ---- album ----------------------------------------------------------------------------
export async function renderAlbum(specOrPath, { outDir = null, mp3Only = false, only = null, sleep = null, onProgress = null } = {}) {
  const spec = loadSpec(specOrPath);
  if (!spec.tracks?.length) throw new Error('album spec needs a non-empty "tracks" array');
  for (const t of spec.tracks) if (!MELODIES[t.melody]) throw new Error(`album: unknown melody "${t.melody}"`);
  const id = spec.id || slug(spec.title);
  outDir = outDir || path.join('out', 'albums', id);
  fs.mkdirSync(outDir, { recursive: true });
  const year = spec.year || new Date().getFullYear();
  const artist = spec.artist || ARTIST, genre = spec.genre || "Children's Music";
  const isSleep = sleep ?? !!spec.sleep;

  const cover = renderCover(spec, { out: path.join(outDir, 'cover.png'), smallOut: path.join(outDir, 'cover-1400.png') });
  const tracks = [];
  const total = spec.tracks.length;
  for (let i = 0; i < total; i++) {
    const t = spec.tracks[i], n = i + 1;
    if (only && !only.includes(n)) continue;
    const title = trackTitle(spec, t);
    const cr = credit(t.melody);
    const base = path.join(outDir, `${String(n).padStart(2, '0')} - ${slug(title)}`);
    const t0 = Date.now();
    const r = renderTrack({ melody: t.melody, mode: t.mode || spec.mode || 'lullaby', bpm: t.bpm, seed: t.seed ?? hashString(`${id}:${n}`), minutes: t.minutes ?? spec.minutes ?? 3.5, key: t.key ?? 0, lead: t.lead || null, sleep: isSleep, lufs: t.lufs ?? spec.lufs ?? null });
    const wav = base + '.wav';
    fs.writeFileSync(wav, encodeWav(r.L, r.R));
    const meta = {
      title, artist, album_artist: artist, album: spec.title, track: `${n}/${total}`, date: String(year), genre,
      composer: cr.composer === 'Traditional' ? 'Traditional' : cr.composer, publisher: artist, copyright: `℗ ${year} ${artist}`,
      comment: `${cr.full}. ${cr.work}. Public-domain composition; original recording by ${artist}.`,
    };
    const files = { wav };
    files.mp3 = await encode(wav, base + '.mp3', { codec: 'mp3', meta, cover: cover.small });
    if (!mp3Only) files.flac = await encode(wav, base + '.flac', { codec: 'flac', meta, cover: cover.small });
    const info = {
      n, title, melody: t.melody, melodyName: r.melody.name, composer: cr.composer, work: cr.work, composed: cr.year, credit: cr.line, creditFull: cr.full,
      bpm: r.bpm, key: r.key, seed: r.seed, seconds: +r.seconds.toFixed(2), duration: fmt(r.seconds), structure: r.structure.map((s) => s.kind).join(' '), sections: r.structure,
      loudness: { targetLufs: r.loudness.targetLufs, lufs: +r.loudness.lufs.toFixed(2), truePeakDb: +r.loudness.truePeakDb.toFixed(2) },
      isrc: t.isrc || null, isrcNote: 'leave blank — the distributor assigns ISRCs; paste them back here after delivery',
      files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, path.basename(v)])),
      renderSeconds: +((Date.now() - t0) / 1000).toFixed(1),
    };
    tracks.push(info);
    if (onProgress) onProgress(info, n, total);
  }
  const albumSeconds = tracks.reduce((a, t) => a + t.seconds, 0);
  const album = {
    id, title: spec.title, artist, year, genre, label: spec.label || artist, upc: spec.upc || null, upcNote: 'leave blank — DistroKid/Bandcamp assign a UPC',
    sleepVariant: isSleep, loudnessTarget: isSleep ? '-16 LUFS / -1 dBTP' : '-14 LUFS / -1 dBTP',
    description: spec.description || '', tags: spec.tags || [], cover: 'cover.png', cover1400: 'cover-1400.png',
    seconds: +albumSeconds.toFixed(1), duration: fmt(albumSeconds), tracks, pdStatement: PD_STATEMENT, renderedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(outDir, 'album.json'), JSON.stringify(album, null, 2));
  fs.writeFileSync(path.join(outDir, 'bandcamp.txt'), bandcampText(album));
  fs.writeFileSync(path.join(outDir, 'distrokid.txt'), distrokidText(album));
  return { outDir, album, cover };
}

// ---- paste-ready listing text -------------------------------------------------
const DEFAULT_TAGS = ['lullaby', 'lullabies', 'baby sleep', 'music box', 'children\'s music', 'bedtime', 'sleep music', 'nursery', 'classical for babies', 'calm', 'instrumental', 'ambient'];

export function bandcampText(a) {
  const tags = [...new Set([...(a.tags || []), ...DEFAULT_TAGS])].slice(0, 20);
  const list = a.tracks.map((t) => `${String(t.n).padStart(2, '0')}. ${t.title} (${t.duration}) — ${t.credit}`).join('\n');
  return [
    `=== BANDCAMP — ALBUM ===`,
    `Album title:   ${a.title}`,
    `Artist:        ${a.artist}`,
    `Release date:  (today)         Price: $7 USD, name-your-price, minimum $5 (or free with email)`,
    `Genre:         Kids / Soundtrack → choose "Kids"; secondary: Classical`,
    `Tags:          ${tags.join(', ')}`,
    `Album art:     cover.png (3000×3000, also fine for Bandcamp's 1400 minimum)`,
    `Formats:       upload the .flac files (Bandcamp derives MP3/AAC/etc.); ${a.duration} total`,
    ``,
    `--- Album description (paste) ---`,
    a.description,
    ``,
    `Tracklist`,
    list,
    ``,
    `About the music`,
    `Real arrangements, not loops: each track has its own intro, varied verses, a soft bridge and a gentle slowing-down ending, so it plays like a little song rather than a noise machine. Music box, bells and harp over soft pads, mastered quietly (${a.loudnessTarget}) for bedtime. No voices, no sudden sounds.`,
    ``,
    `Credits`,
    `Arranged, performed and produced by ${a.artist}. Cover art by ${a.artist}.`,
    `℗ & © ${a.year} ${a.artist}. ${PD_STATEMENT}`,
    ``,
    `=== BANDCAMP — PER TRACK ("about this track") ===`,
    ...a.tracks.map((t) => `${String(t.n).padStart(2, '0')}. ${t.title}\n    ${t.work}. ${t.creditFull}. Original recording ℗ ${a.year} ${a.artist}. Public-domain composition.`),
    ``,
  ].join('\n');
}

export function distrokidText(a) {
  const rows = a.tracks.map((t) => {
    const pd = COMPOSERS[t.melody]?.died ? `composer died ${COMPOSERS[t.melody].died}` : `traditional, first published ${t.composed || 'before 1900'}`;
    return [
      `Track ${t.n}: ${t.title}`,
      `  Songwriter(s):      ${t.composer === 'Traditional' ? `Traditional (public domain) — arranger: ${a.artist}` : `${t.composer} (public domain, ${pd}) — arranger: ${a.artist}`}`,
      `  Cover song?         NO — public-domain composition, original master recording (not a cover; no licence required)`,
      `  Instrumental:       YES (no lyrics, language: none)`,
      `  Explicit:           NO`,
      `  Previously released: NO        ISRC: leave blank (assigned)        Duration: ${t.duration}`,
      `  Version/subtitle:   (none)     Preview start: 0:20`,
      `  Files:              ${t.files.wav} (16-bit/44.1k WAV) — or ${t.files.flac || 'n/a'}`,
    ].join('\n');
  }).join('\n\n');
  return [
    `=== DISTROKID — RELEASE ===`,
    `Release title:     ${a.title}`,
    `Artist:            ${a.artist}            Record label: ${a.label}`,
    `Release type:      Album (${a.tracks.length} tracks, ${a.duration})`,
    `Primary genre:     Children's Music        Secondary genre: Classical (Apple subgenre: Lullabies)`,
    `Language:          Instrumental            Explicit: No`,
    `UPC:               leave blank (DistroKid assigns)`,
    `℗ line:            ${a.year} ${a.artist}    © line: ${a.year} ${a.artist}`,
    `Artwork:           cover.png (3000×3000 RGB PNG, no URLs/prices/social handles on the art)`,
    `Loudness:          ${a.loudnessTarget} integrated (streaming-normalised; do NOT "enhance"/re-master on upload)`,
    `Content ID / YouTube: enrol as ORIGINAL MASTERS owned by ${a.artist}. Do NOT mark as covers. If asked for a licence, answer: public-domain composition, no licence required.`,
    ``,
    `--- Rights statement (paste wherever a distributor asks about samples/covers/ownership) ---`,
    PD_STATEMENT,
    ``,
    `--- Store description (Apple/Spotify pull from Bandcamp/marketing copy; paste where allowed) ---`,
    a.description,
    ``,
    `=== TRACKS ===`,
    rows,
    ``,
    `=== SPOTIFY FOR ARTISTS / MARKETING ===`,
    `Pitch (Spotify editorial, ≤ 500 chars): Gentle music-box lullaby arrangements of public-domain melodies, written as real 3–5 minute songs with intros, varied verses and slow endings — not loops. Mastered quietly for bedtime. Instrumental, no vocals, no sudden sounds.`,
    `Mood/genre tags: lullaby, sleep, children's music, music box, instrumental, calm, classical`,
    ``,
  ].join('\n');
}
