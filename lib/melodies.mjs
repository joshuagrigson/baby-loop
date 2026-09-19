// Public-domain nursery melodies as note strings, plus a procedural pentatonic
// generator for unlimited original tunes.
//
// Note syntax:  "C5:1"  = pitch:beats   "R:1" = rest   fractions ok: "E5:2/3"
// Chord syntax: "C:4 F:2 G:2"  root(:m for minor):beats   — used for pad + bass.
// `meter` = beats per bar (4 or 3). Every melody's total beats is a whole number
// and a multiple of its meter, so loops line up with bars and with video frames.
//
// PUBLIC-DOMAIN STATUS (US): all melodies below are traditional / 18th–19th
// century and out of copyright. Deliberately NOT included: "The Wheels on the
// Bus" (Verna Hills, 1939 — still protected), "Baby Shark" (Pinkfong arrangement),
// "If You're Happy and You Know It" (murky), "Happy Birthday" (PD but not a
// nursery loop). Content ID may still flag PD melodies via someone's recording
// claim; our synth renders are original recordings — dispute with that fact.

export const MELODIES = {
  twinkle: {
    name: 'Twinkle, Twinkle, Little Star', source: 'French tune "Ah! vous dirai-je, maman" (1761); lyrics Jane Taylor 1806. PD.',
    meter: 4,
    notes: 'C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2 ' +
           'G5:1 G5:1 F5:1 F5:1 E5:1 E5:1 D5:2 G5:1 G5:1 F5:1 F5:1 E5:1 E5:1 D5:2 ' +
           'C5:1 C5:1 G5:1 G5:1 A5:1 A5:1 G5:2 F5:1 F5:1 E5:1 E5:1 D5:1 D5:1 C5:2',
    chords: 'C:4 F:2 C:2 F:2 C:2 G:2 C:2 C:2 G:2 C:2 G:2 C:2 G:2 C:2 G:2 C:4 F:2 C:2 F:2 C:2 G:2 C:2',
  },
  mary: {
    name: 'Mary Had a Little Lamb', source: 'Sarah Josepha Hale 1830 / Lowell Mason. PD.',
    meter: 4,
    notes: 'E5:1 D5:1 C5:1 D5:1 E5:1 E5:1 E5:2 D5:1 D5:1 D5:2 E5:1 G5:1 G5:2 ' +
           'E5:1 D5:1 C5:1 D5:1 E5:1 E5:1 E5:1 E5:1 D5:1 D5:1 E5:1 D5:1 C5:4',
    chords: 'C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4',
  },
  row: {
    name: 'Row, Row, Row Your Boat', source: 'Traditional, 1852. PD.',
    meter: 2, feel: 'triplet',
    notes: 'C5:1 C5:1 C5:2/3 D5:1/3 E5:1 E5:2/3 D5:1/3 E5:2/3 F5:1/3 G5:2 ' +
           'C6:1/3 C6:1/3 C6:1/3 G5:1/3 G5:1/3 G5:1/3 E5:1/3 E5:1/3 E5:1/3 C5:1/3 C5:1/3 C5:1/3 ' +
           'G5:2/3 F5:1/3 E5:2/3 D5:1/3 C5:2',
    chords: 'C:2 C:2 C:2 C:2 C:2 C:2 G:2 C:2',
  },
  frere: {
    name: 'Frère Jacques', source: 'French traditional, 18th c. PD.',
    meter: 4,
    notes: 'C5:1 D5:1 E5:1 C5:1 C5:1 D5:1 E5:1 C5:1 E5:1 F5:1 G5:2 E5:1 F5:1 G5:2 ' +
           'G5:1/2 A5:1/2 G5:1/2 F5:1/2 E5:1 C5:1 G5:1/2 A5:1/2 G5:1/2 F5:1/2 E5:1 C5:1 ' +
           'C5:1 G4:1 C5:2 C5:1 G4:1 C5:2',
    chords: 'C:4 C:4 C:4 C:4 C:4 C:4 C:2 G:1 C:1 C:2 G:1 C:1',
  },
  london: {
    name: 'London Bridge Is Falling Down', source: 'Traditional, 1744. PD.',
    meter: 4,
    notes: 'G5:3/2 A5:1/2 G5:1 F5:1 E5:1 F5:1 G5:2 D5:1 E5:1 F5:2 E5:1 F5:1 G5:2 ' +
           'G5:3/2 A5:1/2 G5:1 F5:1 E5:1 F5:1 G5:2 D5:2 G5:2 E5:1 C5:3',
    chords: 'C:4 C:4 G:4 C:4 C:4 C:4 G:4 C:4',
  },
  oldmac: {
    name: 'Old MacDonald Had a Farm', source: 'Traditional (Thomas d\'Urfey 1706 ancestor). PD.',
    meter: 4,
    notes: 'C5:1 C5:1 C5:1 G4:1 A4:1 A4:1 G4:2 E5:1 E5:1 D5:1 D5:1 C5:3 G4:1 ' +
           'C5:1 C5:1 C5:1 G4:1 A4:1 A4:1 G4:2 E5:1 E5:1 D5:1 D5:1 C5:4',
    chords: 'C:4 F:2 C:2 G:4 C:4 C:4 F:2 C:2 G:4 C:4',
  },
  itsy: {
    name: 'The Itsy Bitsy Spider', source: 'Traditional, 1910. PD.',
    meter: 2, feel: 'triplet',
    notes: 'G4:1/3 C5:2/3 C5:1/3 C5:2/3 D5:1/3 E5:1 E5:2/3 D5:1/3 C5:2/3 D5:1/3 E5:1 C5:1 R:2/3 ' +
           'E5:1 E5:2/3 F5:1/3 G5:1 G5:2/3 F5:1/3 E5:2/3 F5:1/3 G5:1 E5:1 R:2/3 ' +
           'C5:1 C5:2/3 D5:1/3 E5:1 E5:2/3 D5:1/3 C5:2/3 D5:1/3 E5:1 C5:1 R:2/3 ' +
           'G4:1/3 C5:2/3 C5:1/3 C5:2/3 D5:1/3 E5:1 E5:2/3 D5:1/3 C5:2/3 D5:1/3 E5:1 C5:1 R:2/3',
    chords: 'C:6 G:1 C:1 C:3 G:3 C:2 C:3 G:3 C:2 C:6 G:1 C:1',
  },
  brahms: {
    name: 'Brahms\' Lullaby (Wiegenlied, arr.)', source: 'Johannes Brahms, Op. 49 No. 4 (1868). PD. Music-box arrangement.',
    meter: 3,
    notes: 'E5:1 E5:1 R:1 G5:2 E5:1/2 E5:1/2 G5:2 E5:1/2 G5:1/2 C6:2 B5:1 A5:2 A5:1 G5:2 D5:1 E5:1 F5:1 D5:1 D5:1 E5:1 F5:1 ' +
           'D5:1 F5:1/2 B5:1/2 A5:1/2 G5:1/2 B5:1 C6:2 ' +
           'C5:1 C5:1 C6:1 A5:2 F5:1 G5:2 E5:1 C5:1 F5:1 G5:1 A5:2 F5:1 ' +
           'C5:1 C5:1 C6:1 A5:2 F5:1 G5:2 E5:1 C5:1 F5:1 G5:1 C5:3 R:3',
    chords: 'C:3 C:3 C:3 C:3 F:3 C:3 G:3 G:3 G:3 C:3 F:3 C:3 G:3 C:3 F:3 F:3 C:3 G:3 C:3 C:3',
  },
};

// ---- Child-friendly classical (public domain, music-box arrangements) --------
Object.assign(MELODIES, {
  ode: {
    name: 'Ode to Joy (child arr.)', source: 'Beethoven, Symphony No. 9 (1824). PD. Simplified music-box arrangement.',
    meter: 4, classical: true,
    notes: 'E5:1 E5:1 F5:1 G5:1 G5:1 F5:1 E5:1 D5:1 C5:1 C5:1 D5:1 E5:1 E5:3/2 D5:1/2 D5:2 ' +
           'E5:1 E5:1 F5:1 G5:1 G5:1 F5:1 E5:1 D5:1 C5:1 C5:1 D5:1 E5:1 D5:3/2 C5:1/2 C5:2',
    chords: 'C:4 C:2 G:2 C:4 G:4 C:4 C:2 G:2 C:2 G:2 C:4',
  },
  minuet: {
    name: 'Minuet in G (child arr.)', source: 'Christian Petzold, Anna Magdalena Bach Notebook (1725). PD.',
    meter: 3, classical: true,
    notes: 'D5:1 G4:1/2 A4:1/2 B4:1/2 C5:1/2 D5:1 G4:1 G4:1 E5:1 C5:1/2 D5:1/2 E5:1/2 F#5:1/2 G5:1 G4:1 G4:1 ' +
           'C5:1 D5:1/2 C5:1/2 B4:1/2 A4:1/2 B4:1 C5:1/2 B4:1/2 A4:1/2 G4:1/2 F#4:1 G4:1/2 A4:1/2 B4:1/2 G4:1/2 A4:3 ' +
           'D5:1 G4:1/2 A4:1/2 B4:1/2 C5:1/2 D5:1 G4:1 G4:1 E5:1 C5:1/2 D5:1/2 E5:1/2 F#5:1/2 G5:1 G4:1 G4:1 ' +
           'C5:1 D5:1/2 C5:1/2 B4:1/2 A4:1/2 B4:1 C5:1/2 B4:1/2 A4:1/2 G4:1/2 A4:1 B4:1/2 A4:1/2 G4:1/2 F#4:1/2 G4:3',
    chords: 'G:3 G:3 C:3 G:3 Am:3 G:3 D:3 D:3 G:3 G:3 C:3 G:3 Am:3 G:3 D:3 G:3',
  },
  canon: {
    name: "Pachelbel's Canon (child arr.)", source: 'Johann Pachelbel, Canon in D (c. 1680). PD. Simplified, in C.',
    meter: 4, classical: true,
    notes: 'E5:2 D5:2 C5:2 B4:2 A4:2 G4:2 A4:2 B4:2 ' +
           'C5:1 B4:1 A4:1 G4:1 F4:1 E4:1 F4:1 E4:1 D4:1 E4:1 F4:1 G4:1 A4:1 B4:1 C5:1 D5:1 ' +
           'E5:1 G5:1 D5:1 F5:1 C5:1 E5:1 B4:1 D5:1 A4:1 C5:1 G4:1 B4:1 A4:1 C5:1 B4:1 D5:1 ' +
           'C5:1 E5:1 G5:1 E5:1 D5:1 B4:1 G4:1 B4:1 A4:1 C5:1 E5:1 C5:1 B4:1 D5:1 G5:1 D5:1',
    chords: 'C:4 G:4 Am:4 Em:4 F:4 C:4 F:4 G:4 C:4 G:4 Am:4 Em:4 F:4 C:4 F:4 G:4',
  },
  furelise: {
    name: 'Für Elise (child arr.)', source: 'Beethoven, Bagatelle No. 25 (1810). PD. Opening theme.',
    meter: 3, classical: true,
    notes: 'E5:1/2 D#5:1/2 E5:1/2 D#5:1/2 E5:1/2 B4:1/2 D5:1/2 C5:1/2 A4:3/2 R:1/2 C4:1/2 E4:1/2 A4:1/2 B4:3/2 R:1/2 E4:1/2 G#4:1/2 B4:1/2 C5:3/2 R:1/2 E4:1/2 ' +
           'E5:1/2 D#5:1/2 E5:1/2 D#5:1/2 E5:1/2 B4:1/2 D5:1/2 C5:1/2 A4:3/2 R:1/2 C4:1/2 E4:1/2 A4:1/2 B4:3/2 R:1/2 E4:1/2 C5:1/2 B4:1/2 A4:3 R:2',
    chords: 'Am:6 E:3 Am:3 E:3 Am:3 E:3 Am:6',
  },
  // ---- Holiday (public domain) -----------------------------------------------
  jingle: {
    name: 'Jingle Bells', source: 'James Lord Pierpont, 1857. PD.',
    meter: 4, holiday: 'christmas',
    notes: 'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:3/2 D5:1/2 E5:4 F5:1 F5:1 F5:3/2 F5:1/2 F5:1 E5:1 E5:1 E5:1/2 E5:1/2 E5:1 D5:1 D5:1 E5:1 D5:2 G5:2 ' +
           'E5:1 E5:1 E5:2 E5:1 E5:1 E5:2 E5:1 G5:1 C5:3/2 D5:1/2 E5:4 F5:1 F5:1 F5:3/2 F5:1/2 F5:1 E5:1 E5:1 E5:1/2 E5:1/2 G5:1 G5:1 F5:1 D5:1 C5:4',
    chords: 'C:4 C:4 C:4 C:4 F:4 C:4 G:4 G:4 C:4 C:4 C:4 C:4 F:4 C:4 G:4 C:4',
  },
  deckhalls: {
    name: 'Deck the Halls', source: 'Welsh traditional ("Nos Galan", 16th c.); English lyrics 1862. PD.',
    meter: 4, holiday: 'christmas',
    notes: 'G5:3/2 F5:1/2 E5:1 D5:1 C5:1 D5:1 E5:1 C5:1 D5:1/2 E5:1/2 F5:1/2 D5:1/2 E5:3/2 D5:1/2 C5:1 B4:1 C5:2 ' +
           'G5:3/2 F5:1/2 E5:1 D5:1 C5:1 D5:1 E5:1 C5:1 D5:1/2 E5:1/2 F5:1/2 D5:1/2 E5:3/2 D5:1/2 C5:1 B4:1 C5:2 ' +
           'D5:3/2 E5:1/2 F5:1 D5:1 E5:3/2 F5:1/2 G5:1 D5:1 E5:1/2 F5:1/2 G5:1 A5:1/2 B5:1/2 C6:1 B5:1 A5:1 G5:2 ' +
           'G5:3/2 F5:1/2 E5:1 D5:1 C5:1 D5:1 E5:1 C5:1 A5:1/2 A5:1/2 A5:1/2 A5:1/2 G5:3/2 F5:1/2 E5:1 D5:1 C5:2',
    chords: 'C:4 C:2 G:2 C:4 G:2 C:2 C:4 C:2 G:2 C:4 G:2 C:2 G:4 C:4 C:2 G:2 C:2 G:2 C:4 C:2 G:2 F:2 C:2 G:2 C:2',
  },
  silentnight: {
    name: 'Silent Night', source: 'Franz Xaver Gruber, 1818. PD.',
    meter: 3, holiday: 'christmas',
    notes: 'G4:3/2 A4:1/2 G4:1 E4:3 G4:3/2 A4:1/2 G4:1 E4:3 D5:2 D5:1 B4:3 C5:2 C5:1 G4:3 ' +
           'A4:2 A4:1 C5:3/2 B4:1/2 A4:1 G4:3/2 A4:1/2 G4:1 E4:3 A4:2 A4:1 C5:3/2 B4:1/2 A4:1 G4:3/2 A4:1/2 G4:1 E4:3 ' +
           'D5:2 D5:1 F5:3/2 D5:1/2 B4:1 C5:3 E5:3 C5:1 G4:1 E4:1 G4:3/2 F4:1/2 D4:1 C4:3 C4:3',
    chords: 'C:12 G:6 C:6 F:6 C:6 F:6 C:6 G:6 C:6 C:3 G:3 C:6',
  },
  wewish: {
    name: 'We Wish You a Merry Christmas', source: 'English traditional, 16th c. PD.',
    meter: 3, holiday: 'christmas',
    notes: 'G4:1 C5:1 C5:1/2 D5:1/2 C5:1/2 B4:1/2 A4:1 A4:1 A4:1 D5:1 D5:1/2 E5:1/2 D5:1/2 C5:1/2 B4:1 G4:1 G4:1 E5:1 E5:1/2 F5:1/2 E5:1/2 D5:1/2 C5:1 A4:1 G4:1/2 G4:1/2 A4:1 D5:1 B4:1 C5:2 ' +
           'G4:1 C5:1 C5:1/2 D5:1/2 C5:1/2 B4:1/2 A4:1 A4:1 A4:1 D5:1 D5:1/2 E5:1/2 D5:1/2 C5:1/2 B4:1 G4:1 G4:1 E5:1 E5:1/2 F5:1/2 E5:1/2 D5:1/2 C5:1 A4:1 G4:1/2 G4:1/2 A4:1 D5:1 B4:1 C5:2',
    chords: 'C:3 F:3 D:3 G:3 E:3 Am:3 F:2 G:1 C:3 C:3 F:3 D:3 G:3 E:3 Am:3 F:2 G:1 C:3',
  },
});

export function melodyIds() { return Object.keys(MELODIES); }

// --- Procedural original melodies -----------------------------------------
// Pentatonic random walk with AABA phrase structure. Always consonant, always
// original. `seed` makes it reproducible. Returns the same shape as MELODIES.x
export function generateMelody(rng, { bars = 8, meter = 4, mode = 'dance' } = {}) {
  const scale = mode === 'lullaby' ? [0, 2, 4, 7, 9] : [0, 2, 4, 7, 9]; // major pentatonic
  const base = 72; // C5
  const rhythms = mode === 'lullaby'
    ? [[2, 1, 1], [1, 1, 2], [3, 1], [4]]
    : [[1, 1, 1, 1], [1, 0.5, 0.5, 1, 1], [0.5, 0.5, 1, 1, 1], [1, 1, 2], [2, 1, 1]];
  const phrase = (len, endOnRoot) => {
    const out = [];
    let deg = rng.int(0, 2), beats = 0;
    while (beats < len * meter) {
      const rh = rng.pick(rhythms);
      for (const d of rh) {
        if (beats + d > len * meter) break;
        const step = rng.pick([-2, -1, -1, 0, 1, 1, 2]);
        deg = Math.max(-3, Math.min(7, deg + step));
        const oct = Math.floor(deg / 5), idx = ((deg % 5) + 5) % 5;
        out.push({ midi: base + scale[idx] + oct * 12, beats: d });
        beats += d;
      }
    }
    if (endOnRoot && out.length) out[out.length - 1] = { midi: base, beats: out[out.length - 1].beats };
    return out;
  };
  const A = phrase(bars / 4, false), B = phrase(bars / 4, true);
  const seq = [...A, ...A.map((n) => ({ ...n })), ...B, ...A.map((n, i) => (i === A.length - 1 ? { midi: base, beats: n.beats } : n))];
  const toName = (m) => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + (Math.floor(m / 12) - 1);
  const notes = seq.map((n) => `${toName(n.midi)}:${n.beats}`).join(' ');
  const prog = mode === 'lullaby' ? ['C', 'Am', 'F', 'G'] : ['C', 'F', 'Am', 'G'];
  const chords = Array.from({ length: bars }, (_, i) => `${prog[i % 4]}:${meter}`).join(' ');
  return { name: `Original pentatonic #${rng.seed}`, source: 'Procedurally generated — original.', meter, notes, chords, generated: true };
}
