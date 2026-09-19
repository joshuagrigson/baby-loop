// Colour systems tuned for infant vision.
//  - newborn (0-3 m): black / white / one red. Contrast is everything; colour vision is still developing.
//  - primary (3-12 m): fully saturated primaries + secondaries on a flat, bright field.
//  - pastel / sleepy: low-arousal palettes for wind-down content.
// Story backgrounds are simple two-stop vertical gradients plus a ground colour.

export const PALETTES = {
  newborn: { bg: '#000000', fg: '#ffffff', accent: '#e10600', name: 'Newborn high contrast' },
  primary: {
    name: 'Primary brights',
    bgs: ['#ffd400', '#00a3e0', '#ff5a36', '#3dbb57', '#a44bd1', '#ff7ab6'],
    inks: ['#1b1b1b'],
    pops: ['#ffffff', '#ff2e63', '#08d9d6', '#ffb400', '#6a4cff'],
  },
  pastel: {
    name: 'Pastel play',
    bgs: ['#ffe9f2', '#e6f6ff', '#fff6d9', '#e9fbe7', '#f1e8ff'],
    inks: ['#3c3c50'],
    pops: ['#ff8fb1', '#7cc7ff', '#ffd166', '#8ee6a4', '#c5a3ff'],
  },
  sleepy: {
    name: 'Sleepy stars',
    top: '#0a1230', bottom: '#1c2e5c', star: '#fff5c2', moon: '#ffe9a6', cloud: '#2a3e73',
  },
};

// Story / rhyme tableaux backgrounds
export const BACKDROPS = {
  meadow:  { top: '#8fd9ff', bottom: '#dff7ff', ground: '#6dc36b', ground2: '#4ea64f', sun: true },
  forest:  { top: '#bfe6c8', bottom: '#eaf7ea', ground: '#3f8f4d', ground2: '#2f6f3c', trees: true },
  cottage: { top: '#ffe0b5', bottom: '#fff4e0', ground: '#c9a56b', ground2: '#a5834f' },
  night:   { top: '#0d1a3f', bottom: '#2a3f7a', ground: '#1d2f5a', ground2: '#132146', stars: true },
  sunny:   { top: '#ffd76a', bottom: '#fff1bf', ground: '#7fd17f', ground2: '#5fb45f', sun: true },
  ocean:   { top: '#8fe3ff', bottom: '#e0fbff', ground: '#2a9df4', ground2: '#1b7fd1', waves: true },
  sky:     { top: '#7fc8ff', bottom: '#eaf7ff', ground: null, clouds: true },
  castle:  { top: '#cfe6ff', bottom: '#f3f9ff', ground: '#9bb3c8', ground2: '#7c95ab', castle: true },
};

export function backdrop(name) {
  return BACKDROPS[name] || BACKDROPS.meadow;
}

// Holiday / seasonal themes. A theme overrides the field colours, sprinkles
// falling confetti emoji, and puts a hat on every character.
export const THEMES = {
  halloween:    { name: 'Halloween',    bgs: ['#ff7a00', '#5b2a86', '#23203a'], pops: ['#ffb000', '#b14cff', '#56ff7a', '#ffffff'], confetti: ['🎃', '👻', '🦇', '🍬'], hat: 'witch', title: 'Happy Halloween!' },
  christmas:    { name: 'Christmas',    bgs: ['#c8102e', '#0f7b3d', '#1a4a8a'], pops: ['#ffd700', '#ffffff', '#7fd1ff', '#ff8fa3'], confetti: ['❄️', '🎄', '⭐', '🎁'], hat: 'santa', title: 'Merry Christmas!' },
  winter:       { name: 'Winter',       bgs: ['#7fc8ff', '#2b4c7e', '#dbeeff'], pops: ['#ffffff', '#ffd166', '#a8e6ff', '#ff8fb1'], confetti: ['❄️', '⛄', '🧣', '❄️'], hat: 'santa', title: 'Winter Wonderland' },
  valentines:   { name: "Valentine's",  bgs: ['#ff6fae', '#ff3b5c', '#ffd1e3'], pops: ['#ffffff', '#ffd166', '#b5179e', '#ff8fb1'], confetti: ['❤️', '💗', '💖', '🌹'], hat: 'hearts', title: "Happy Valentine's Day!" },
  easter:       { name: 'Easter',       bgs: ['#bfe9ff', '#fff3b0', '#d8ffd0', '#ffd6f5'], pops: ['#ff8fb1', '#7cc7ff', '#ffd166', '#8ee6a4'], confetti: ['🥚', '🐣', '🐰', '🌷'], hat: 'bunny', title: 'Happy Easter!' },
  spring:       { name: 'Spring',       bgs: ['#d8ffd0', '#bfe9ff', '#fff3b0'], pops: ['#ff8fb1', '#ffd166', '#c5a3ff', '#8ee6a4'], confetti: ['🌷', '🐝', '🦋', '🌼'], hat: 'flower', title: 'Hello Spring!' },
  summer:       { name: 'Summer',       bgs: ['#ffd400', '#00c2e0', '#ff8c1a'], pops: ['#ffffff', '#ff2e63', '#08d9d6', '#6a4cff'], confetti: ['☀️', '🌴', '🍉', '🐚'], hat: 'flower', title: 'Summer Celebration!' },
  thanksgiving: { name: 'Thanksgiving', bgs: ['#d97706', '#b45309', '#7c2d12'], pops: ['#fde68a', '#fca5a5', '#86efac', '#ffffff'], confetti: ['🍂', '🦃', '🍁', '🌽'], hat: 'leaf', title: 'Happy Thanksgiving!' },
  birthday:     { name: 'Birthday',     bgs: ['#00a3e0', '#ff5a36', '#ffd400', '#a44bd1'], pops: ['#ffffff', '#ff2e63', '#08d9d6', '#ffb400'], confetti: ['🎈', '🎉', '🎂', '🎁'], hat: 'party', title: 'Happy Birthday!' },
};

export function getTheme(name) {
  return name && THEMES[name] ? { id: name, ...THEMES[name] } : null;
}

// Deterministic palette pick helper. A theme wins over the palette family.
export function pickPalette(rng, family = 'primary', theme = null) {
  const th = typeof theme === 'string' ? getTheme(theme) : theme;
  const base = PALETTES[family] || PALETTES.primary;
  const p = th ? { ...base, bgs: th.bgs, pops: th.pops, inks: base.inks || ['#1b1b1b'] } : base;
  if (!p.bgs) return { ...p, theme: th };
  const bg = rng.pick(p.bgs);
  const pops = rng.shuffle(p.pops.filter((c) => c !== bg));
  return { ...p, bg, ink: p.inks[0], pops, theme: th };
}
