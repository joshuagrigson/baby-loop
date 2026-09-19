// Node-side canvas factory. Registers any .ttf/.otf dropped into assets/fonts
// (Fredoka / Baloo 2 are the intended display faces; both are OFL) and makes sure
// an emoji font is available for the tableaux.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..');
export const FONT_DIR = path.join(ROOT, 'assets', 'fonts');

let registered = false;
export function registerFonts() {
  if (registered) return;
  registered = true;
  if (fs.existsSync(FONT_DIR)) {
    for (const f of fs.readdirSync(FONT_DIR)) {
      if (/\.(ttf|otf|woff2?)$/i.test(f)) {
        try { GlobalFonts.registerFromPath(path.join(FONT_DIR, f)); } catch (e) { console.warn(`font ${f}: ${e.message}`); }
      }
    }
  }
  const fams = new Set(GlobalFonts.families.map((f) => f.family));
  if (![...fams].some((f) => /emoji/i.test(f))) {
    // Debian/Ubuntu: apt install fonts-noto-color-emoji ; macOS/Windows ship their own.
    console.warn('No colour emoji font found — story tableaux will render as boxes. Install Noto Color Emoji or drop a .ttf into assets/fonts.');
  }
}

export function makeCanvas(width, height) {
  registerFonts();
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  return { canvas, ctx };
}

export function fontFamilies() {
  registerFonts();
  return GlobalFonts.families.map((f) => f.family);
}
