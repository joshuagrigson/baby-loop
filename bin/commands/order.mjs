// babyloop order <birthday|goodnight|story> --name Mila [--age 2] [--say Meela] [--preview] [--out-dir out/orders]
// babyloop order list
import path from 'node:path';
import { renderOrder, listProducts } from '../../lib/order.mjs';

export const HELP = `  babyloop order list                                     products, durations and prices
  babyloop order <product> --name Mila [--age 2] [--say Meela] [--preview] [--out-dir out/orders]
                                                          render a personalised video into out/orders/<product>-<name>/`;

export async function run(args = {}, pos = []) {
  const what = pos[0];
  if (!what || what === 'help') { console.log(HELP); return; }
  if (what === 'list') {
    const products = listProducts();
    if (!products.length) { console.log('No products in specs/products/'); return; }
    for (const p of products) {
      const price = p.price != null ? `$${Number(p.price).toFixed(0)} ${p.currency}` : '—';
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
