# BabyLoop

A faceless baby & toddler video factory. Beat-synced animated loops (dancing
fruit with faces, newborn high-contrast patterns, bubbles, sleepy stars),
procedurally generated nursery music from public-domain melodies, offline
narration of public-domain stories and Mother Goose rhymes, assembled into
30/60-minute YouTube episodes with a thumbnail and upload metadata.

Nothing is scraped or re-used from other channels. Competitor research
(`research/`) is metadata-only; every frame and every note here is generated.

```
node bin/babyloop.mjs episode specs/sensory-30min.json
# → out/sensory-30min/sensory-30min.mp4 + thumbnail.png + meta.json
```

## How it works

```
spec.json ──► compose.mjs
               ├─ loop segment  : scene.draw(t) → canvas → ffmpeg (one 17–57 s loop, x264)
               │                  music.mjs → seamless WAV loop, same length to the frame
               │                  concat demuxer repeats both N times (stream copy, no re-encode)
               ├─ story / rhyme : Piper TTS per page → page timings → story scene → lullaby bed ducked under voice
               ├─ lesson        : flashcards scene + narrated cues
               └─ concat video (copy) + concat audio (wav) → mux once → episode.mp4
```

* **Loops are exactly periodic.** Every motion is a function of `beat = t·bpm/60`
  or `phase = t/loopSeconds`, and the composer snaps BPM so one beat is a whole
  number of frames (112 → 112.5 at 30 fps). A 25.6 s loop repeated 70× has zero
  audio/video drift, and only 25.6 s were ever encoded.
* **Music is seamless.** The arrangement is rendered twice back-to-back and the
  second pass is kept, so the reverb/delay tail of the loop end already sits
  under the loop start.
* **One codebase, two runtimes.** Scenes are plain Canvas 2D modules with no
  Node imports; `preview/index.html` runs the same files live in a browser.

## Setup

```bash
cd babyloop
npm install                       # @napi-rs/canvas (prebuilt, no compiler needed)
pip install piper-tts             # offline neural TTS for narration (optional for pure loop videos)
pip install imageio-ffmpeg        # only if you don't have ffmpeg with libx264+aac on PATH
node bin/babyloop.mjs doctor      # checks ffmpeg, fonts, emoji font, piper voice
```

Fonts: `assets/fonts/Fredoka-Variable.ttf` (OFL) is the display face. Story
tableaux use a colour emoji font — on Debian/Ubuntu `apt install fonts-noto-color-emoji`;
macOS and Windows already have one. Piper voices (60–110 MB each) auto-download
into `assets/voices/` on first use. Only voices trained from scratch on public-domain
speech are offered (`kristin` default, `ljspeech`, `cori`, `norman`, `bryce`): a monetized
channel is commercial use and `lessac` + its fine-tunes (`amy`, `hfc_female`, `jenny`…) carry
a non-commercial licence — see PLAYBOOK.md §6. Set `BABYLOOP_TTS=openai` + `OPENAI_API_KEY` to use
OpenAI TTS instead.

## Commands

| Command | What it does |
|---|---|
| `babyloop scenes` | list scenes with age band, default bpm and music mode |
| `babyloop melodies` | list public-domain melodies + `generated` |
| `babyloop still <scene> --t 1.2 --seed 3` | one PNG frame |
| `babyloop render <scene> --seconds 20 --bpm 112` | one video loop |
| `babyloop music --mode dance --melody twinkle --bpm 112` | one music loop (WAV) |
| `babyloop say "Once upon a time"` | one narration WAV |
| `babyloop episode <spec> [--preview]` | full episode; `--preview` = 640×360@15, one loop each, ~1 min |
| `babyloop content` | list stories / rhymes / lessons |
| `npm run preview` | live browser preview at http://localhost:8787/preview/ |
| `npm test` | smoke test: scenes, melodies, wav, 1 s video, spec validation |

(`babyloop` = `node bin/babyloop.mjs`.)

## Spec format

```jsonc
{
  "id": "sensory-30min",
  "title": "Fruit Friends Dance & Bubbles | Baby Sensory | 30 Minutes",
  "thumbnailText": "Fruit Friends | Baby Sensory",   // '|' splits lines
  "hook": "first line of the description",
  "seed": 21, "voice": "kristin", "speechRate": 1.12,     // >1 = slower narration
  "segments": [
    { "type": "title",  "text": "Fruit Friends", "caption": "Baby Sensory", "seconds": 4, "props": ["🍓","🍊"] },
    { "type": "loop",   "scene": "dancing-fruits", "minutes": 4, "bpm": 112, "melody": "twinkle", "music": "dance", "seed": 101, "options": { "count": 4 } },
    { "type": "loop",   "scene": "high-contrast",  "minutes": 3, "bpm": 72,  "melody": "mary",    "music": "lullaby" },
    { "type": "lesson", "lesson": "colors", "perCard": 6, "limit": 8 },       // colors | shapes | numbers | animals | firstWords
    { "type": "story",  "story": "jack-and-the-beanstalk", "melody": "brahms" },
    { "type": "rhyme",  "rhyme": "humpty-dumpty" },
    { "type": "loop",   "scene": "sleepy-stars", "minutes": 5, "bpm": 66, "melody": "brahms", "music": "lullaby" }
  ]
}
```

`music`: `dance` (kick, shaker, bass, marimba + music box), `learn` (no kick),
`lullaby` (pad, music box, slow harp, long reverb). `melody`: nursery `twinkle`,
`mary`, `row`, `frere`, `london`, `oldmac`, `itsy`; child-friendly classical `brahms`,
`ode`, `minuet`, `canon`, `furelise`; holiday `jingle`, `deckhalls`, `silentnight`,
`wewish`; or `generated` (seeded pentatonic original). Loop length = melody length
at that BPM; `minutes` is rounded up to whole loops.

`theme` (top level or per segment): `halloween`, `christmas`, `winter`, `valentines`,
`easter`, `spring`, `summer`, `thanksgiving`, `birthday`. A theme recolours the field,
drops matching confetti (🎃 👻 · ❄️ 🎁 · ❤️ · 🥚 🐣 · 🎈 …), puts a hat on every
character (witch, santa, bunny, party, hearts, flowers, leaves) and titles the
intro card. `options.count` sets how many fruit friends dance (default 6–8, two
rows); `options.hat` overrides the hat (`"mixed"` = a party mix). Every character
always smiles: closed smile at rest, big open grin on the beat.

## Adding a scene

Create `lib/scenes/my-scene.mjs`:

```js
export default {
  id: 'my-scene', name: 'My Scene', ageBand: '3–12 months', kind: 'loop',
  defaults: { bpm: 100, music: 'dance', palette: 'primary' },
  init({ W, H, rng, loopSeconds, options }) { return { /* precomputed state */ }; },
  draw(ctx, t, state, { W, H, beat, phase, loopSeconds }) {
    // MUST be periodic: use Math.sin(TAU * phase * k) for drift, `beat` for hits
  },
};
```

Register it in `lib/scenes/index.mjs`. Import only from `../easing.mjs`,
`../palette.mjs`, `../draw.mjs` so it also runs in the browser preview. If the
scene wants narration, put `cues: [{ t, text }]` on its state (see flashcards).

## Adding a melody

`lib/melodies.mjs` — one entry: `notes: "C5:1 D5:1/2 R:1 …"` (pitch:beats,
fractions allowed, `R` = rest), `chords: "C:4 F:2 G:2"`, `meter: 4|3|2`. Total
beats must fill whole bars. Keep to public-domain tunes; the file header lists
the ones deliberately left out.

## Content

`content/stories/*.json` — original toddler retellings of public-domain tales,
12–18 pages each, one narration beat per page, emoji tableau + caption.
`content/rhymes/mother-goose.json` — 12 traditional rhymes.
`content/lessons.json` — colors, shapes, numbers, animals, first words.

## Research & upload

* `research/scrape_channel.py @HeyBear --deep` — metadata-only competitor scrape
  (titles, lengths, views, dates, tags). Never downloads media.
* `research/analyze.py research/data/heybear.json` — cadence, length-vs-views,
  title patterns, tag frequency, "what to copy structurally".
* `upload/upload.py out/x/x.mp4 --meta out/x/meta.json --thumbnail out/x/thumbnail.png`
  — YouTube Data API v3 resumable upload, `madeForKids: true` always. See the
  docstring for the 5-step OAuth setup. `--dry-run` validates without Google.

Read `PLAYBOOK.md` before publishing anything: made-for-kids rules, the
"inauthentic content" policy, cadence, titles, and the 30-day launch plan.

## Render budget

1080p30 renders at ~25 fps on a modest box. A 30-minute sensory episode has
~8 unique loops (~4 min of unique frames) → about 5 minutes to build. Story and
lesson segments render every frame (no repetition), so a 6-minute story costs
~6 minutes. Use `--preview` while iterating.
