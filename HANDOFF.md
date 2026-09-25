# BabyLoop — Handoff

**For:** whoever produces the actual background videos (a developer, an editor, or another Claude session).
**Repo:** `joshuagrigson/baby-loop`, branch `main` (files at the repo root). Also mirrored under `babyloop/` on paper-plate branch `claude/magical-gauss-mtxsrl`.
**State:** background-video pipeline built and verified end to end at 1920×1080/30 fps with muxed AAC audio. Narration pipeline (stories, rhymes, lessons) built, content library complete (6 stories, 12 rhymes, 5 lesson sets), smoke test green.

---

## 1. What this is, in one paragraph

A Node + ffmpeg factory for faceless baby/toddler YouTube videos. Scenes are plain Canvas 2D modules (fruit characters with faces that hop on the beat, newborn black/white/red patterns, bubbles, a sleepy moon). Music is synthesised in JavaScript from public-domain nursery melodies (music box, marimba, pad, soft kick) so there is no sample, stock or licence to clear. A spec file lists segments; the composer renders each loop **once**, repeats it losslessly for N minutes, cuts to the next scene, and muxes one continuous audio track. Optional narration (offline Piper TTS, public-domain voice) drives picture-book stories, Mother Goose rhymes and flashcard lessons. Output: `episode.mp4` + `thumbnail.png` + `meta.json` (title, chaptered description, tags, `madeForKids: true`) ready for `upload/upload.py`.

Nothing is taken from Hey Bear or anyone else. Competitor research is metadata only (`research/`).

## 2. Produce the background video (the actual deliverable)

```bash
git clone https://github.com/joshuagrigson/baby-loop && cd baby-loop
npm install                                   # @napi-rs/canvas, prebuilt
pip install imageio-ffmpeg                    # skip if `ffmpeg -encoders` shows libx264 + aac
node bin/babyloop.mjs doctor                  # ffmpeg ✔ display font ✔ emoji font ✔ (piper only needed for narration)

node bin/babyloop.mjs episode specs/background-sample-3min.json   # 3-min proof, ~1 min to build
node bin/babyloop.mjs episode specs/sensory-30min.json            # the 30-minute background video, ~5 min to build
node bin/babyloop.mjs episode specs/sleepy-60min.json             # 1-hour sleep video
```

Outputs land in `out/<id>/`: `<id>.mp4`, `thumbnail.png`, `meta.json`, `episode.json` (segment map with timestamps).

To change the video, edit the spec — no code:

| Knob | Where | Effect |
|---|---|---|
| length | `segments[].minutes` | rounded up to whole loops (17–57 s each) |
| scene order / cut rhythm | order of `segments` | Hey Bear changes scene every 4–5 min; we default 3–5 |
| look | `seed`, `palette` (`primary`, `pastel`, `newborn`), `options.count` (fruits on screen) | different seed = different cast, colours, dot pattern |
| tempo / mood | `bpm` + `music` (`dance`, `learn`, `lullaby`) | bpm is snapped to the frame grid automatically |
| tune | `melody`: nursery `twinkle` `mary` `row` `frere` `london` `oldmac` `itsy` · classical `brahms` `ode` `minuet` `canon` `furelise` · holiday `jingle` `deckhalls` `silentnight` `wewish` · `generated` | `generated` = seeded original pentatonic tune |
| holiday | `theme`: `halloween` `christmas` `winter` `valentines` `easter` `spring` `summer` `thanksgiving` `birthday` | recolours, confetti, hats on every character, themed title card |
| cast size | `options.count` (default 6–8, two rows), `options.hat` | all characters smile; grin opens on the beat |
| quality | top-level `crf` (18 default, 20 smaller), `preset` | x264 settings |
| quick check | `--preview` flag | 640×360 @ 15 fps, one loop per segment, ~1 min |

Live iteration: `npm run preview` → http://localhost:8787/preview/ shows any scene animating in the browser with seed/bpm/palette controls. It runs the identical scene code the renderer uses.


## 2b. Where the money is (decided 2026-09-25, verified by a research tournament)

An automated made-for-kids YouTube channel earns ~$0 for months under 2026 enforcement and risks termination. So the asset sells **directly to parents**; YouTube and vertical clips are only the free demo reel.

| Rank | Product | Price | Command | Status |
|---|---|---|---|---|
| 1 | Personalised videos (Birthday 4–5 min, Goodnight 20 min, Bedtime Story) on Etsy (made-to-order digital) + Payhip mirror | $4.99 / $6.99 / $4.99 | `node bin/babyloop.mjs order birthday --name Mila --age 2 [--say Meela]` → `out/orders/<id>/` + zip; `order link <id> <url>` writes the small download note you attach on Etsy | built, sample: `out/orders/birthday-ava` |
| 2 | Calm Library one-time download (~10 h video + audio) on Payhip, upsold in every delivery message | $19 launch / $29 | `node bin/babyloop.mjs library --audio` → `out/library/` + delivery page | command built; render in progress |
| 3 | Generator licence (Creator $249 / Studio $999), `LICENSE-COMMERCIAL.md` | — | zip the repo minus research/out/node_modules | text done |
| 4 | Lullaby albums on Bandcamp (DistroKid later) | $6 NYP | `node bin/babyloop.mjs album specs/albums/music-box-lullabies-vol1.json` → WAV/FLAC/MP3 + cover + paste text | vol1 rendered |
| demo | 9:16 clips for TikTok/Reels/Shorts (parent-facing), six flagship YouTube episodes with end cards | free | `node bin/babyloop.mjs clip specs/clips`, `episode specs/flagship/*.json` | 3 clips rendered, 6 specs validated |

Shop page: https://baby-loop.netlify.app/shop (buy buttons read `LINKS` at the top of `site/shop/index.html`; empty → "Notify me" email capture via Netlify Forms). Listing copy: `store/etsy-listings.md`, `store/payhip-products.md`, `store/bandcamp.md`, `store/delivery-message.md`, `store/pricing.md`.

Delivery: Etsy does not accept MP4 as a digital file and the videos are 100–300 MB, so deliver a link. Cheapest reliable path: upload the order zip to Cloudflare R2 (public bucket, 60-day lifecycle) or Google Drive, then `order link` and attach the .txt in Etsy's Complete Order dialog. Never put a child's name in a public URL.

Kill switch: if the three Etsy listings total under 100 views in 21 days or under 1% conversion after 500 views, stop spending hours; leave the buttons up and treat the repo as a portfolio piece / licence product.

## 3. Breakdown — what each file does

```
babyloop/
├── bin/babyloop.mjs          CLI: scenes | melodies | still | render | music | say | episode | thumbnail | content | doctor
├── lib/
│   ├── compose.mjs           THE ORCHESTRATOR. spec → segments → concat → mux → thumbnail + meta. Builders for
│   │                         loop / title / story / rhyme / lesson; bed music tiling + narration ducking.
│   ├── render.mjs            canvas frames → raw RGBA pipe → ffmpeg libx264 yuv420p. ~25 fps at 1080p.
│   ├── music.mjs             pure-JS synth: parse notes/chords, voices (musicbox, marimba, pluck, pad, bass, kick,
│   │                         shaker), mixer, delay, Schroeder reverb, master; renders a SEAMLESS loop; WAV I/O.
│   ├── melodies.mjs          36 public-domain melodies (7 nursery · 24 child classical · 4 holiday · generated) + pentatonic generator.
│   ├── tts.mjs               Piper wrapper (voice auto-download, cache) + OpenAI TTS option. PD voices only.
│   ├── thumbnail.mjs         1280×720 frame from the first scene + 2-line title + duration badge.
│   ├── metadata.mjs          title / chaptered description / tags / madeForKids for upload.py.
│   ├── content.mjs           loaders for content/*.json; lesson → flashcard items + narration text.
│   ├── draw.mjs              drawing vocabulary: 8 fruit characters, faces (blink, sing, look), backdrops,
│   │                         caption pills, outlined text, emoji. Browser-safe.
│   ├── palette.mjs           infant-vision palettes (newborn / primary / pastel / sleepy) + story backdrops.
│   ├── easing.mjs            beat helpers (bounce, pulse, blink schedule), colour math. Browser-safe.
│   ├── rng.mjs               seeded PRNG so (scene, seed) is reproducible everywhere.
│   ├── info.mjs              builds the per-frame info object identically for renderer and preview.
│   ├── canvas.mjs            node canvas factory + font registration (assets/fonts, Noto Color Emoji).
│   ├── ffmpeg.mjs            finds ffmpeg (PATH → imageio-ffmpeg), run(), probeDuration().
│   └── scenes/
│       ├── dancing-fruits.mjs  "Fruit Friends Dance" — 6–8 smiling fruit characters in two rows, hats + confetti by theme (3–18 m)
│       ├── high-contrast.mjs   6 slow black/white/red patterns with cross-fades (0–3 m)
│       ├── bubbles.mjs         pastel bubbles, fish, light rays; integer rises per loop (3–24 m)
│       ├── sleepy-stars.mjs    twinkle, dozing moon, Zs, shooting stars, sheep over a fence (0–36 m)
│       ├── garden.mjs          smiling flowers bloom on the beat, bees + butterflies (3–36 m)
│       ├── rainbow-rain.mjs    smiling clouds, beat-timed rain, breathing rainbow (3–24 m)
│       ├── balloons.mjs        8–11 smiling balloons rising, confetti (3–24 m)
│       ├── train.mjs           engine with a face pulls animal passengers past scrolling hills (6–36 m)
│       ├── flashcards.mjs      LEARN cards (emoji / drawn shape / count grid) with narration cues
│       ├── story.mjs           picture-book pages: backdrop + emoji tableau + caption, cross-fades
│       └── index.mjs           registry
├── specs/                    sensory-30min · sleepy-60min · learn-colors-shapes · story-jack-and-the-beanstalk
│                             · demo-3min · background-sample-3min · classical-lullabies-60min
│                             · holiday-halloween-30min · holiday-christmas-30min · holiday-birthday-20min
│                             · classical-favorites-60min (20 famous pieces, each paired with a scene)
├── preview/                  index.html (live scene preview) + serve.mjs (static server)
├── content/                  stories/*.json (6), rhymes/mother-goose.json (12), lessons.json (5 sets), index.json
├── research/                 scrape_channel.py (yt-dlp, metadata only), analyze.py, heybear-notes.md,
│                             data/heybear.json (+report.md), data/msrachel.json
├── upload/                   upload.py (YouTube Data API v3, OAuth, resumable, madeForKids) + requirements.txt
├── assets/fonts/             Fredoka-Variable.ttf (OFL) · assets/voices/ (Piper models, auto-download, gitignored)
├── test/smoke.mjs            npm test
├── PLAYBOOK.md               channel strategy, policy checklist, titles/SEO, music rights, 30-day launch plan
└── README.md                 full usage
```

Sizes: ~2,300 lines of JS across lib/ + scenes/; ~1,100 lines of Python in research/ + upload/.

## 4. Decisions that matter (don't undo these casually)

1. **Loops are frame-exact.** BPM is snapped so one beat = whole frames (`snapBpm`: 112 → 112.5 at 30 fps; 96 → 94.7; 66 → 66.7). Loop length = melody beats × beat. Video frames and audio samples both come out integers, so repeating a loop 70× produces zero drift. If you change fps, keep it a divisor of 44100 (30 or 25 or 60).
2. **Music loops are seamless** because the arrangement is rendered twice and the second pass is kept (the first pass's reverb tail sits under the loop start). Don't "optimise" that away.
3. **Repeats are stream copies.** Each unique loop is x264-encoded once; the concat demuxer repeats it. All segments share codec params so the final concat is also a copy. Only the audio is encoded at mux (AAC 192k, 4 s fade-out).
4. **Public-domain everything.** Melodies listed in `melodies.mjs` are PD; The Wheels on the Bus, Baby Shark, Happy-and-You-Know-It are deliberately excluded. Piper voices are limited to ones trained from scratch on PD speech (`kristin` default); `lessac` and its fine-tunes (`amy`, `hfc_female`, `jenny`) carry a non-commercial licence and are refused with a warning.
5. **Distance from Hey Bear.** Original vector fruit characters; no avocado, no bear mascot (a generic bear exists in the cast for stories like Goldilocks, but it is kept out of default line-ups, train riders and thumbnail heroes), no "Dancing Fruit" phrasing in public labels/tags (they claim Hey Bear Sensory® and Mindful Moon® as marks). Scene id stays `dancing-fruits` internally; the public name is "Fruit Friends Dance".
6. **Made for kids is always on** in `meta.json` and `upload.py`. It disables comments, personalised ads, end screens; RPM planning figure $0.30–1.00 (PLAYBOOK §3).
7. **Finish quality.** Shaded characters (radial studio light), glossy eyes, beat-lifted brows, swinging arms on the fruit friends, atmosphere (lit field + bokeh + vignette) behind every scene, 0.8 s white-blink transitions with music fade between segments, loudnorm to −16 LUFS at mux, x264 tune animation / preset slow / crf 17. Thumbnails: zoomed frame, gradient title with shadow, duration badge.
8. **A drawn cast, not emoji.** 49 hand-drawn characters in one house style (bold outline, studio-lit shading, glossy happy faces): 12 fruit (`lib/draw.mjs`), 16 farm & forest, 10 sea, 6 garden bugs, 5 night-time (`lib/critters/*.mjs`, one named export per kind, style rules at the top of `core.mjs`). `critter(ctx, kind, x, y, size, opts)` takes the same opts as `fruit()` (squash, tilt, blink, mouth, look, brow, wave, hat, flip). Story pages, flashcards and title cards call `drawProp()` (`lib/critters/props.mjs`), which swaps any animal/fruit emoji in content JSON for its drawn character and shows everything else as a die-cut sticker. Holiday hats sit on each head via `hat: [x, headTop, size]`.
9. **Every loop closes for any beat count.** Two- and four-beat motions pick a period that divides the loop's beat count, so 3/4 tunes and odd bar counts don't jump at the seam. Checked: frame at t=0 equals t=loop for 12, 16 and 18-beat loops on every loop scene.
10. **Thumbnails are built, not grabbed.** Blurred scene backdrop, two or three die-cut hero characters with white rims, heavy centred title, round duration stamp top-right (YouTube's own timestamp covers bottom-right). Override heroes per spec with `"thumbnailHeroes": ["critter:owl", "fruit:apple"]`.
11. **Calm positioning.** No cut faster than the loop change, slow drifts, moderate loudness (≈ −18 dBFS RMS). This is deliberate: the overstimulation critique of the genre is real (PLAYBOOK §2) and YouTube's July-2025 "inauthentic content" policy targets mass-produced templated uploads (PLAYBOOK §3). Two distinct long-form uploads a week, not a firehose.

## 4b. Studio (https://baby-loop.netlify.app)

- **Watch** (W): plays the playlist full-screen with music, chapter cards and the same white-blink chapter changes the renderer uses; with an empty playlist it tours every scene for 30 s each. Space pause, ←/→ chapter, F full screen, Esc close.
- **Cast** (C): every character alive in a filterable gallery, drawn in the browser from the same code the renderer uses.
- Gallery, inspector, transport with music, Save PNG, Record clip, playlist → spec JSON as before.

## 5. What was verified here (2026-09-19, sandbox)

- `node test/smoke.mjs`: 6 scenes render non-blank; 9 melodies render finite, frame-aligned loops; WAV round-trip; 1 s video encodes; specs validate (content checks pending the library).
- Melody pitch check: Twinkle's first note measures 522.5 Hz (C5), beat 4 = 880 Hz (A5). Loop seam discontinuity 0.002.
- Mini episode (title + fruit loop ×3 + sleepy loop): 1 min 57 s, 1920×1080, h264 High, AAC 44.1k stereo, built in 29 s; mean loudness −21 dB before the master gain bump, peaks −4.6 dB.
- Preview page renders all scenes in headless Chromium with Fredoka + colour emoji.
- 1080p render speed: 25 fps (dancing-fruits, 5 s test). Music render: 1–4 s per loop.
- Live scrape of @HeyBear (90 videos, deep) and @msrachel (126, flat) succeeded; report in `research/data/heybear-report.md`.

## 6. Research headline (from the real scrape, not estimates)

- Hey Bear: 90 videos, 3.22 B views, median 10.8 M views/video. **10–30-minute videos are 30 % of uploads but 79 % of all views (median 46 M)**; Shorts are 41 % of uploads and 7 % of views. Top-quartile videos median 18 min. Cadence 1.7 uploads/month over the last 12 months, median gap 29 days. Titles: `Hey Bear Sensory - {Theme}! - {descriptor}`, 76 chars, no emoji, "sensory" in 97 %. ~42 tags per video (soothing, sensory, tracking, visual development…). 0 % use chapter timestamps — an easy differentiator for us.
- Ms Rachel: 126 videos, 17.3 B views, median length 45 min.
- Full numbers, top-15 table, tag list: `research/data/heybear-report.md`; raw: `heybear.json`.

## 7. HANDS NEEDED (pre-approved, paste don't review)

1. **Own repo — DONE.** Lives at github.com/joshuagrigson/baby-loop, branch `main` (default). Optional: make it private under Settings → Danger Zone until the channel launches.
2. **YouTube upload credentials.** console.cloud.google.com → new project → enable "YouTube Data API v3" → OAuth consent screen (External, add your Gmail as test user) → Credentials → OAuth client ID (Desktop app) → download JSON → save as `babyloop/upload/client_secret.json`. Then `pip install -r upload/requirements.txt` and `python upload/upload.py out/sensory-30min/sensory-30min.mp4 --meta out/sensory-30min/meta.json --thumbnail out/sensory-30min/thumbnail.png --privacy private`.
3. **Channel name.** PLAYBOOK §7 lists eight candidates (Bloomloop, Hushpetal, Pip & Pear, Tinyorbit, Dozydot, Moonpebble, Littlelumen, Slowstar) — check handle + .com + USPTO the same day. Put the chosen name in each spec's `title`/`thumbnailText`.
4. **Windows only:** install a colour emoji font is not needed (Segoe UI Emoji ships), but confirm `node bin/babyloop.mjs doctor` shows an emoji family; on Linux `apt install fonts-noto-color-emoji`.

## 8. Open items / next steps

- **Content library** (`content/`): done — six story retellings (16–17 pages each), 12 Mother Goose rhymes, lessons.json. Add more stories by copying any file's shape; add rhymes to `mother-goose.json`.
- **Shorts:** add a 9:16 render path (`width: 1080, height: 1920`) — scenes are resolution-independent, only the thumbnail/title layout assumes 16:9.
- **More scenes** for variety across weeks: farm animals parade, vehicles, rainbow rain, shapes garden. Each is a ~120-line module; see README "Adding a scene".
- **Voice A/B:** `ljspeech` (high) vs `kristin` (medium); or OpenAI TTS via `BABYLOOP_TTS=openai` if a warmer voice is worth the cost.
- **Loudness:** target ≈ −16 LUFS integrated; currently ≈ −18 to −19 dBFS RMS. Check one upload in YouTube's "Stats for nerds" (content loudness) and adjust `master()` targets in `music.mjs`.
