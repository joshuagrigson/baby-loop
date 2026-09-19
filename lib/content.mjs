// Loaders for the content library (content/*.json).
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './canvas.mjs';

export const CONTENT_DIR = path.join(ROOT, 'content');

export function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

export function listStories() {
  const dir = path.join(CONTENT_DIR, 'stories');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => loadJson(path.join(dir, f)));
}

export function loadStory(id) {
  const p = path.join(CONTENT_DIR, 'stories', `${id}.json`);
  if (!fs.existsSync(p)) throw new Error(`Story "${id}" not found. Known: ${listStories().map((s) => s.id).join(', ')}`);
  return loadJson(p);
}

export function listRhymes() {
  const p = path.join(CONTENT_DIR, 'rhymes', 'mother-goose.json');
  if (!fs.existsSync(p)) return [];
  const j = loadJson(p);
  return Array.isArray(j) ? j : j.rhymes || [];
}

export function loadRhyme(id) {
  const r = listRhymes().find((x) => x.id === id);
  if (!r) throw new Error(`Rhyme "${id}" not found. Known: ${listRhymes().map((x) => x.id).join(', ')}`);
  return r;
}

export function loadLessons() {
  const p = path.join(CONTENT_DIR, 'lessons.json');
  if (!fs.existsSync(p)) throw new Error('content/lessons.json missing');
  return loadJson(p);
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

// Turn a lesson set into flashcard items (+ what the narrator says for each)
export function lessonItems(lessonId, { limit = 0, hexes = [] } = {}) {
  const L = loadLessons();
  const set = L[lessonId];
  if (!set) throw new Error(`Lesson "${lessonId}" not found. Known: ${Object.keys(L).join(', ')}`);
  let items;
  switch (lessonId) {
    case 'colors':
      items = set.map((c) => ({ word: c.name, emoji: c.emoji, hex: c.hex, title: c.name, say: `${cap(c.name)}. A ${c.name} ${c.word}.` }));
      break;
    case 'shapes':
      items = set.map((s, i) => ({ word: s.name, shape: s.name, hex: hexes[i % (hexes.length || 1)] || '#ffffff', title: s.name, say: `A ${s.name}.` }));
      break;
    case 'numbers':
      items = set.map((n) => ({ word: n.word, count: n.n, emoji: n.emoji, title: `${n.n} ${n.word}`, say: `${cap(n.word)}.` }));
      break;
    case 'animals':
      items = set.map((a) => ({ word: a.name, emoji: a.emoji, title: a.name, say: `The ${a.name} says ${a.sound}!` }));
      break;
    default:
      items = set.map((w) => ({ word: w.word, emoji: w.emoji, title: w.word, say: `${cap(w.word)}. ${cap(w.word)}.` }));
  }
  return limit > 0 ? items.slice(0, limit) : items;
}
