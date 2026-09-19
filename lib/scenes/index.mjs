import dancingFruits from './dancing-fruits.mjs';
import highContrast from './high-contrast.mjs';
import bubbles from './bubbles.mjs';
import sleepyStars from './sleepy-stars.mjs';
import flashcards from './flashcards.mjs';
import story from './story.mjs';

export const SCENES = Object.fromEntries(
  [dancingFruits, highContrast, bubbles, sleepyStars, flashcards, story].map((s) => [s.id, s]),
);

export function getScene(id) {
  const s = SCENES[id];
  if (!s) throw new Error(`Unknown scene "${id}". Known: ${Object.keys(SCENES).join(', ')}`);
  return s;
}

export function listScenes() {
  return Object.values(SCENES).map(({ id, name, ageBand, kind, defaults }) => ({ id, name, ageBand, kind, defaults }));
}
