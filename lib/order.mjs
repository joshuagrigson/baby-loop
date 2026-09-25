// Made-to-order personalised videos (Etsy / Payhip digital downloads).
//
//   renderOrder({ product: 'birthday', name: 'Mila', age: 2 })
//
// loads specs/products/<product>.json, fills {name}/{ordinal} tokens (see
// personalize() in compose.mjs), renders the episode and lays out a delivery
// folder out/orders/<product>-<name>/ with the MP4, thumbnail, a README for the
// buyer and order.json — then zips it (if `zip` is on PATH).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { ROOT } from './canvas.mjs';
import { loadJson } from './content.mjs';
import { composeEpisode, ordinalDigits } from './compose.mjs';

export const PRODUCTS_DIR = path.join(ROOT, 'specs', 'products');
export const ORDERS_DIR = path.join(ROOT, 'out', 'orders');

export function listProducts() {
  if (!fs.existsSync(PRODUCTS_DIR)) return [];
  return fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json')).sort().map((f) => {
    const spec = loadJson(path.join(PRODUCTS_DIR, f));
    const product = spec.product || path.basename(f, '.json');
    const loopMinutes = spec.segments.filter((s) => (s.type || 'loop') === 'loop').reduce((a, s) => a + (s.minutes || 0), 0);
    return { product, price: spec.price ?? null, currency: spec.currency || 'USD', title: spec.title, minutes: spec.minutes ?? Math.round(loopMinutes), blurb: spec.blurb || spec.hook || '', file: path.join(PRODUCTS_DIR, f) };
  });
}

export function loadProduct(product) {
  const file = path.join(PRODUCTS_DIR, `${String(product).toLowerCase()}.json`);
  if (!/^[a-z0-9-]+$/i.test(String(product)) || !fs.existsSync(file)) {
    throw new Error(`Unknown product "${product}". Known: ${listProducts().map((p) => p.product).join(', ') || '(none)'}`);
  }
  const spec = loadJson(file);
  spec.product = spec.product || product;
  return spec;
}

// "Mila" → "mila", "Mary-Kate O'Neil" → "mary-kate-oneil"; falls back to "child".
export const slug = (s) => String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'child';
// Display form for file names: keep letters/digits/space/hyphen, title-case the first letter.
export const cleanName = (s) => String(s ?? '').replace(/[\p{C}]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40);

export async function renderOrder({ product, name, age, say, out, preview = false, log = console.log } = {}) {
  const spec = loadProduct(product);
  const childName = cleanName(name);
  if (!childName) throw new Error('order: --name is required (the child\'s first name as it should appear on screen)');
  const ageNum = age === undefined || age === null || age === '' ? null : Number(age);
  if (ageNum !== null && (!Number.isFinite(ageNum) || ageNum <= 0 || ageNum > 120)) throw new Error(`order: --age must be a positive number, got "${age}"`);
  spec.name = childName;
  if (ageNum !== null) spec.age = Math.round(ageNum);
  if (say) spec.sayName = cleanName(say);
  spec.id = `${spec.product}-${slug(childName)}`;
  spec.ttsCacheDir = path.join(ROOT, 'out', '.tts-cache'); // shared cache: story pages don't re-render per order

  const ordersDir = out ? path.resolve(out) : ORDERS_DIR;
  const dir = path.join(ordersDir, spec.id);
  const buildDir = path.join(dir, 'build');
  fs.mkdirSync(buildDir, { recursive: true });
  const t0 = Date.now();
  log(`Order: ${spec.product} for ${childName}${spec.age ? (spec.product === 'birthday' ? ` (${ordinalDigits(spec.age)} birthday)` : `, age ${spec.age}`) : ''}${spec.sayName ? ` — spoken as "${spec.sayName}"` : ''}${preview ? '  (preview)' : ''}`);
  const r = await composeEpisode(spec, { outDir: buildDir, preview, log });

  // ---- delivery folder
  const fileBase = `${childName.replace(/[^\p{L}\p{N} -]/gu, '').replace(/\s+/g, '-') || 'Your'}-${spec.product}${preview ? '-preview' : ''}`;
  const mp4 = path.join(dir, `${fileBase}.mp4`);
  fs.renameSync(r.final, mp4);
  const thumb = path.join(dir, 'thumbnail.png');
  fs.copyFileSync(r.thumb, thumb);
  const seconds = r.manifest.seconds;
  const size = fs.statSync(mp4).size;
  const order = {
    id: spec.id, product: spec.product, name: childName, age: spec.age ?? null, sayName: spec.sayName ?? null,
    title: spec.title, price: spec.price ?? null, currency: spec.currency || 'USD',
    file: path.basename(mp4), thumbnail: 'thumbnail.png', seconds: Math.round(seconds), duration: fmtTime(seconds),
    bytes: size, megabytes: +(size / 1048576).toFixed(1), width: r.manifest.width, height: r.manifest.height, fps: r.manifest.fps, preview,
    spokenLines: r.manifest.segments.flatMap((s) => (s.say || []).map((l) => ({ at: fmtTime(s.start + l.at), text: l.text }))),
    chapters: r.meta.chapters, created: new Date().toISOString(), buildSeconds: Math.round((Date.now() - t0) / 1000),
  };
  fs.writeFileSync(path.join(dir, 'order.json'), JSON.stringify(order, null, 2));
  fs.writeFileSync(path.join(dir, 'README-for-you.txt'), readme({ spec, order }));

  // ---- zip (delivery folder without the build/ scratch)
  let zip = null, zipNote = '';
  const zipPath = path.join(ordersDir, `${spec.id}.zip`);
  const hasZip = spawnSync('zip', ['-v'], { encoding: 'utf8' }).status === 0;
  if (hasZip) {
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    const z = spawnSync('zip', ['-r', '-q', '-X', zipPath, spec.id, '-x', `${spec.id}/build/*`], { cwd: ordersDir, encoding: 'utf8' });
    if (z.status === 0) zip = zipPath; else zipNote = `zip failed: ${(z.stderr || z.stdout || '').trim().slice(0, 200)}`;
  } else zipNote = '`zip` not found on PATH — delivery folder left unzipped';

  return { id: spec.id, product: spec.product, name: childName, age: spec.age ?? null, dir, file: mp4, thumbnail: thumb, zip, zipNote, seconds, size, order, spec, manifest: r.manifest };
}

const fmtTime = (s) => { s = Math.round(s); const m = Math.floor(s / 60), r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; };

function readme({ spec, order }) {
  const who = order.name;
  const what = { birthday: `a birthday video made just for ${who}`, goodnight: `a goodnight video made just for ${who}`, story: `a bedtime story told just for ${who}` }[spec.product] || `a video made just for ${who}`;
  return [
    `${spec.title}`,
    '='.repeat(Math.min(72, spec.title.length)),
    '',
    `Thank you! Inside this folder is ${what}:`,
    '',
    `  ${order.file}   (${order.duration} · ${order.width}x${order.height} · ${order.megabytes} MB)`,
    `  thumbnail.png   (a cover picture for your phone or TV screen)`,
    '',
    'HOW TO PLAY',
    '  Phone / tablet: open the .mp4 in Photos, Files or any video player.',
    '  TV: AirPlay or Cast it from your phone, or copy it to a USB stick.',
    '  Computer: double-click the .mp4 (VLC, QuickTime, Windows Media Player all work).',
    '  It plays without internet, so it works in the car, on a plane, or at grandma\'s.',
    '',
    'IT IS YOURS TO KEEP',
    `  This file was rendered for ${who} and belongs to you. Keep a copy somewhere safe`,
    '  (cloud photo library, external drive) and play it as often as you like.',
    '  Licence: personal, family use. Please do not resell it or re-upload it as your own.',
    '',
    'HOW IT WAS MADE',
    '  Made with love by hand-drawn characters and music-box arrangements of',
    '  public-domain tunes. The narrator is a synthetic voice (Piper, trained on',
    '  public-domain recordings), read slowly so little ones can take in each word.',
    '  Every frame and every note is generated for this video — no stock footage, no samples.',
    '',
    order.spokenLines.length ? 'WHAT THE NARRATOR SAYS' : null,
    ...order.spokenLines.map((l) => `  ${l.at}  "${l.text}"`),
    order.spokenLines.length ? '' : null,
    'CHAPTERS',
    ...order.chapters.map((c) => `  ${c}`),
    '',
    'A NOTE FOR GROWN-UPS',
    '  Babies learn most from you. Volumes are kept low and cuts slow; the AAP suggests',
    '  no screens under 18 months except video chat, so co-view and keep sessions short.',
    '',
    `Order ${order.id} · made ${order.created.slice(0, 10)}`,
    '',
  ].filter((l) => l !== null).join('\n');
}
