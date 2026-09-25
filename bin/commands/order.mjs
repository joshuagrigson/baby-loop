// babyloop order <birthday|goodnight|story> --name Mila [--age 2] [--say Meela] [--preview] [--out-dir out/orders]
// babyloop order list
// babyloop order link <orderId> <url>
import path from 'node:path';
import { renderOrder, listProducts } from '../../lib/order.mjs';

export const HELP = `  babyloop order list                                     products, durations and prices
  babyloop order link <orderId> <url>                     write Download-<Name>.txt (the small file you attach on Etsy)
  babyloop order <product> --name Mila [--age 2] [--say Meela] [--preview] [--out-dir out/orders]
                                                          render a personalised video into out/orders/<product>-<name>/`;

export async function run(args = {}, pos = []) {
  const what = pos[0];
  if (!what || what === 'help') { console.log(HELP); return; }
  if (what === 'link') {
    // babyloop order link <orderId> <download-url>  → writes Download-<Name>.txt for the Etsy "complete order" attachment
    const [, id, url] = pos;
    if (!id || !url) throw new Error('usage: babyloop order link <orderId> <url>');
    const fs = await import('node:fs'); const path = await import('node:path');
    const dir = path.join(args['out-dir'] ? String(args['out-dir']) : 'out/orders', id);
    const o = JSON.parse(fs.readFileSync(path.join(dir, 'order.json'), 'utf8'));
    const txt = [`Your BabyLoop video for ${o.name}`, '', `Download (link stays live for 30 days, save it somewhere safe):`, url, '',
      `File: ${o.product} video · ${o.duration || ''} · ${o.mb || ''} MB · 1080p MP4 (plays on any phone, tablet, laptop or TV)`, '',
      'Yours to keep for your family (personal use). If a name is said wrong, reply with how to say it and we re-render for free.', '',
      'Hand-drawn characters · music-box arrangements of public-domain melodies · the narrator is a synthetic voice.', 'baby-loop.netlify.app/shop'].join('\n');
    const out = path.join(dir, `Download-${o.name}.txt`);
    fs.writeFileSync(out, txt);
    console.log(out);
    return;
  }
  if (what === 'list') {
    const products = listProducts();
    if (!products.length) { console.log('No products in specs/products/'); return; }
    for (const p of products) {
      const price = p.price != null ? (Number(p.price) === 0 ? "free" : `$${Number(p.price).toFixed(2)} ${p.currency}`) : "—";
      console.log(`${p.product.padEnd(10)} ${String(p.minutes + ' min').padEnd(8)} ${price.padEnd(9)} ${p.title}`);
      if (p.blurb) console.log(`${''.padEnd(10)} ${p.blurb}`);
    }
    return;
  }
  if (!args.name || args.name === true) throw new Error(`order ${what}: --name is required, e.g. --name Mila`);
  const r = await renderOrder({
    product: what, name: String(args.name), age: args.age !== undefined && args.age !== true ? args.age : undefined,
    say: args.say && args.say !== true ? String(args.say) : undefined, out: args['out-dir'] && args['out-dir'] !== true ? String(args['out-dir']) : undefined,
    preview: !!args.preview,
  });
  const mins = Math.floor(r.seconds / 60), secs = Math.round(r.seconds % 60);
  console.log(`\n✔ ${r.dir}`);
  console.log(`  ${path.basename(r.file)} · ${mins} min ${secs} s · ${(r.size / 1048576).toFixed(1)} MB · ${r.manifest.width}x${r.manifest.height}@${r.manifest.fps}${r.zip ? `\n  zip ${r.zip}` : r.zipNote ? `\n  (${r.zipNote})` : ''}`);
  console.log(`  ${r.product} for ${r.name}${r.age ? `, age ${r.age}` : ''} — ${r.order.spokenLines.length} spoken line(s), ${r.order.duration}${r.order.price != null ? `, $${r.order.price} ${r.order.currency}` : ''}`);
  return r;
}
