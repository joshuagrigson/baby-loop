import dancingFruits from './dancing-fruits.mjs';
import highContrast from './high-contrast.mjs';
import bubbles from './bubbles.mjs';
import sleepyStars from './sleepy-stars.mjs';
import garden from './garden.mjs';
import rainbowRain from './rainbow-rain.mjs';
import balloons from './balloons.mjs';
import train from './train.mjs';
import flashcards from './flashcards.mjs';
import story from './story.mjs';

export const SCENES = Object.fromEntries(
  [dancingFruits, highContrast, bubbles, sleepyStars, garden, rainbowRain, balloons, train, flashcards, story].map((s) => [s.id, s]),
);

export function getScene(id) {
  const s = SCENES[id];
  if (!s) throw new Error(`Unknown scene "${id}". Known: ${Object.keys(SCENES).join(', ')}`);
  return s;
}

export function listScenes() {
  return Object.values(SCENES).map(({ id, name, ageBand, kind, defaults }) => ({ id, name, ageBand, kind, defaults }));
}
