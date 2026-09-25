// Songs the narrator can SING (lib/sing.py). Each line is lyrics + the notes
// they sit on, in melodies.mjs note syntax. A {name} line is split out so the
// child's name gets its own notes (sing.py splits or holds notes to fit any
// syllable count). Every tune here is public domain.
export const SONGS = {
  'happy-birthday': {
    title: 'Happy Birthday to You',
    melody: 'birthday',          // accompaniment melody id in melodies.mjs (same notes, same 24 beats)
    beats: 24,
    lines: [
      { text: 'happy birthday to you', notes: 'G4:1/2 G4:1/2 A4:1 G4:1 C5:1 B4:2' },
      { text: 'happy birthday to you', notes: 'G4:1/2 G4:1/2 A4:1 G4:1 D5:1 C5:2' },
      { text: 'happy birthday dear', notes: 'G4:1/2 G4:1/2 G5:1 E5:1 C5:1' },
      { text: '{name}', notes: 'B4:1 A4:1' },
      { text: 'happy birthday to you', notes: 'F5:1/2 F5:1/2 E5:1 C5:1 D5:1 C5:2' },
    ],
    // without a name the third line is the traditional "dear friend"
    noName: 'friend',
  },
};
export const songIds = () => Object.keys(SONGS);
