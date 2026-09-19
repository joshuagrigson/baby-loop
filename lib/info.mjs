// Builds the `info` object every scene receives. Pure, so the browser preview
// and the headless renderer construct scenes identically.
import { makeRng, hashString } from './rng.mjs';

export function sceneInfo({ scene, width, height, fps = 30, seconds = 30, seed = 1, bpm = 112, options = {} }) {
  const rng = makeRng(((seed >>> 0) ^ hashString(scene.id)) >>> 0);
  return { W: width, H: height, fps, loopSeconds: seconds, seconds, bpm, seed, rng, options: options || {} };
}

export function frameInfo(info, t, frame = 0) {
  return { ...info, t, beat: (t * info.bpm) / 60, phase: t / info.seconds, frame };
}
