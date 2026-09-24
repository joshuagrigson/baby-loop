// drawProp(): the one call story pages, flashcards and title cards use for a
// "prop". If the emoji has a hand-drawn equivalent in the cast (animals, fruit)
// the drawn character is used, so content written with emoji automatically
// gets the lit house style; anything else falls back to an emoji sticker.
import { fruit, emoji } from '../draw.mjs';
import { CRITTERS, critter } from './index.mjs';

const TO_CRITTER = {
  '🐄': 'cow', '🐮': 'cow', '🐑': 'sheep', '🐏': 'sheep', '🐰': 'bunny', '🐇': 'bunny', '🐻': 'bear', '🐷': 'pig', '🐖': 'pig',
  '🦆': 'duck', '🐥': 'chick', '🐤': 'chick', '🐣': 'chick', '🐱': 'cat', '🐈': 'cat', '🐶': 'dog', '🐕': 'dog', '🦊': 'fox',
  '🐘': 'elephant', '🐒': 'monkey', '🐵': 'monkey', '🐸': 'frog', '🦁': 'lion', '🐼': 'panda', '🐨': 'koala',
  '🐟': 'fish', '🐠': 'fish', '🐬': 'dolphin', '🐙': 'octopus', '🦀': 'crab', '🐢': 'turtle', '🐳': 'whale', '🐋': 'whale',
  '🪼': 'jellyfish', '🐡': 'pufferfish', '⭐️': null, '🐝': 'bee', '🦋': 'butterfly', '🐞': 'ladybug', '🐌': 'snail', '🐛': 'caterpillar',
  '🦉': 'owl', '🦔': 'hedgehog', '🐭': 'mouse', '🐁': 'mouse', '🦝': 'raccoon',
};
const TO_FRUIT = { '🍓': 'strawberry', '🍊': 'orange', '🫐': 'blueberry', '🍐': 'pear', '🍋': 'lemon', '🍉': 'watermelon', '🍎': 'apple', '🍇': 'grape', '🍒': 'cherry', '🍑': 'peach', '🥝': 'kiwi', '🍍': 'pineapple' };

const strip = (c) => String(c).replace(/️/g, '');
export function propKind(char) {
  const c = strip(char);
  if (c.startsWith('critter:')) return { type: 'critter', kind: c.slice(8) };
  if (c.startsWith('fruit:')) return { type: 'fruit', kind: c.slice(6) };
  const k = TO_CRITTER[c] || TO_CRITTER[char];
  if (k && CRITTERS[k]) return { type: 'critter', kind: k };
  const f = TO_FRUIT[c];
  if (f) return { type: 'fruit', kind: f };
  return { type: 'emoji', kind: char };
}

// size ≈ the prop's height, centred at (x, y). o = character options
// (blink, mouth, wave, squash, tilt, hat, flip) — ignored for emoji.
export function drawProp(ctx, char, x, y, size, o = {}) {
  const p = propKind(char);
  if (p.type === 'critter') critter(ctx, p.kind, x, y, size * 0.92, o);
  else if (p.type === 'fruit') fruit(ctx, p.kind, x, y, size * 0.82, { arms: o.arms, ...o });
  else emoji(ctx, char, x, y, size, { sticker: true, ...(o.emoji || {}) });
  return p.type;
}
