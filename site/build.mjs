// Build the public preview site: bundle the scene modules with esbuild and inline
// them into site/template.html → site/index.html. Deploy the site/ folder to Netlify.
//   npm run site          (then: npx netlify deploy --dir=site --prod, or the Netlify MCP)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.join(here, 'entry.mjs');
fs.writeFileSync(entry, `import { SCENES } from '../lib/scenes/index.mjs';\nimport { sceneInfo, frameInfo } from '../lib/info.mjs';\nwindow.BabyLoop = { SCENES, sceneInfo, frameInfo };\n`);
const r = await build({ entryPoints: [entry], bundle: true, format: 'iife', minify: true, write: false });
const js = r.outputFiles[0].text;
const tpl = fs.readFileSync(path.join(here, 'template.html'), 'utf8');
if (!tpl.includes('/*__BUNDLE__*/')) throw new Error('template marker missing');
fs.writeFileSync(path.join(here, 'index.html'), tpl.replace('/*__BUNDLE__*/', () => js));
fs.unlinkSync(entry);
console.log(`site/index.html written (${(js.length / 1024).toFixed(0)} KB bundle). Samples go in site/samples/ (mp4s are gitignored).`);
