// Tiny static server so the browser preview can import the scene modules
// (ES modules don't load from file://). `npm run preview` → http://localhost:8787/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 8787);
const MIME = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff2': 'font/woff2', '.png': 'image/png', '.css': 'text/css', '.wav': 'audio/wav', '.mp4': 'video/mp4' };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/' || p === '/preview') p = '/preview/index.html';
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(root, p);
  if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`BabyLoop preview → http://localhost:${port}/preview/`));
