// Drawn animal cast. critter(ctx, kind, x, y, size, opts) — opts as fruit():
// { squash, tilt, blink, mouth, look, brow, wave, hat, flip, color }.
// Each group file exports named draw functions; the export name is the kind.
import * as farm from './farm.mjs';
import * as sea from './sea.mjs';
import * as bugs from './bugs.mjs';
import * as night from './night.mjs';

export const CRITTER_GROUPS = { farm: Object.keys(farm), sea: Object.keys(sea), bugs: Object.keys(bugs), night: Object.keys(night) };
export const CRITTERS = { ...farm, ...sea, ...bugs, ...night };
export const CRITTER_KINDS = Object.keys(CRITTERS);
export function critter(ctx, kind, x, y, size, o = {}) {
  const fn = CRITTERS[kind];
  if (!fn) throw new Error(`unknown critter "${kind}" (have: ${CRITTER_KINDS.join(', ')})`);
  fn(ctx, x, y, size, o);
}
