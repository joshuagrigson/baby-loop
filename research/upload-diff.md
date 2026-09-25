# Upload diff log

Why this file exists: YouTube's 2026 enforcement treats templated / mass-produced made-for-kids
content as ineligible (PLAYBOOK §3, "inauthentic content", 15 Jul 2025 onward, tightened 2026).
What survives review is a small set of materially varied, visibly hand-crafted videos. So every
long-form upload gets one entry here *before* it goes up, stating in one paragraph what is new
versus every previous upload. If the paragraph is hard to write, the video is not ready.

YouTube and the short-form platforms are the free demo reel; the product is the shop
(`baby-loop.netlify.app/shop`: personalised episodes, the Calm Library download). Made-for-kids
videos strip clickable links, so the URL is plain text on the end card and in the description,
and spoken in clips.

## Template

Copy this block per upload. Keep it to facts you can point at in the spec.

```
### <id>  —  <YouTube title>
- Spec: specs/flagship/<file>.json · built: <date> · length: <mm:ss> · 1920×1080/30
- Concept: <one line — what the child does / sees>
- Age band: <from scene ageBand>
- Scene families: <list> · Palette(s): <list> · Tempo: <BPM range>
- Melody set: <list with PD source years> · Narration: <none | lesson cards | verse | prose>, voice <name>
- Structure: <chapters and their lengths>
- End card: "More at baby-loop.netlify.app/shop" / "Made just for your little one" (plain text, no link)
- Thumbnail text: <text> · heroes: <list>
- Diff vs every earlier upload: <one paragraph — copied from the spec's `diff` field, then
  extended with anything that changed since>
- Review checklist: [ ] no cut faster than 10 s  [ ] no strobing  [ ] title names the actual
  content  [ ] no third-party characters / "Dancing Fruit" phrasing  [ ] synthetic-voice + PD-music
  disclosure in description  [ ] made-for-kids set  [ ] chapters in description
- Upload: <date> · video id: <id> · playlist: <Sensory | Learn | Story & Sleep>
- 7-day read: AVD <m:ss>, % viewed <n>, impressions CTR <n>, traffic mix <n/n/n>
```

## Entries (launch set — six flagships)

Chapter lengths below are the spec's target minutes; the composer rounds each loop up to whole
loops (17–57 s each), so real lengths land a few seconds over. Verified builds: each spec was run
with `--preview` (640×360 @ 15 fps, one loop per segment) on 2026-09-25 and produced an MP4,
thumbnail and meta.json without errors.

### flagship-newborn-contrast-20min  —  High Contrast Baby Sensory – Spirals, Rings & Faces – Black, White & Red (0–3 Months)
- Spec: specs/flagship/newborn-contrast-20min.json · length: ~20:12
- Concept: newborn fixation on bold light/dark edges; five to six slow patterns held 15–30 s each
- Age band: 0–3 months
- Scene families: high-contrast only · Palette: black / white / one red · Tempo: 60–66 BPM
- Melody set: Brahms' Lullaby (1868), Twinkle (1761), Gymnopédie No. 1 (1888), Clair de lune (1905) — all lullaby-mode music box · Narration: none
- Structure: title 4 s → spirals & rings 5 min → bullseye & face 5 min → checkerboard & stripes 5 min → all six patterns 5 min → end card 8 s
- End card: "More at baby-loop.netlify.app/shop" / "Made just for your little one"
- Thumbnail text: "Black · White · Red | Newborn Sensory" · heroes: none (pattern frame)
- Diff vs every earlier upload: The only flagship for the 0–3 month band and the only one built from the high-contrast scene family: black, white and one red, no colour palette, no characters except the newborn face pattern. Its structure is four 5-minute chapters that each show a different subset of the six patterns (spirals+rings, bullseye+face, checkerboard+stripes, then a mixed reprise), each under a different lullaby at 60–66 BPM. Nothing here — scene, palette, tempo, melody set, age band or the pattern-subset chapter idea — appears in the other five flagships.
- Upload: — · playlist: Sensory (0–3 mo)

### flagship-fruit-colours-counting-12min  —  Fruit Friends – Colours & Counting 1 to 10 – Narrated Learning Video for Babies & Toddlers
- Spec: specs/flagship/fruit-colours-counting-12min.json · length: ~12:20
- Concept: call-and-response learning — narrated cards, a 3-second pause for the child's answer, a dance break between lessons
- Age band: 6–24 months (lessons 12–36 months, dance 3–18 months)
- Scene families: flashcards + dancing-fruits · Palette: primary · Tempo: 94 BPM lessons / 108–112 BPM dance
- Melody set: Mary Had a Little Lamb (1830/1868), Row Your Boat (1852), Frère Jacques (18th c.) under the lessons; Twinkle (1761), Old MacDonald (1917 print), London Bridge (1744) under the dances · Narration: lesson cards, voice kristin (Piper, public-domain LibriVox training data)
- Structure: title 4 s → colours (8 cards × 7.5 s) → dance 3.5 min (5 friends) → counting 1–10 (10 × 7.5 s) → dance 3 min (6 friends) → shapes (5 × 7.5 s) → dance 2.5 min (7 friends) → end card 8 s
- The 3-second answer pause: `perCard: 7.5` with ~2 s of speech and a 0.6 s lead leaves ≥3 s of music-only time after every card (compose.mjs enforces `perCard ≥ 0.6 + longest + 1.4`).
- End card: "More at baby-loop.netlify.app/shop" / "Made just for your little one"
- Thumbnail text: "Colours & Counting | with the Fruit Friends" · heroes: seeded fruit trio
- Diff vs every earlier upload: The only narrated LEARN flagship: three flashcard lessons read with a deliberate answer pause, alternating with three Fruit Friends dance loops that grow the cast from 5 to 7 characters. Its concept, scene mix, tempo and melody set are not used by any other flagship; the newborn, bubbles and lullaby episodes have no narration, and the rhyme and story episodes narrate verse and prose rather than lesson cards.
- Upload: — · playlist: Learn

### flagship-bubbles-tracking-20min  —  Bubbles! – Slow Visual Tracking for 3–6 Months – Calm Baby Sensory Video (20 Minutes)
- Spec: specs/flagship/bubbles-tracking-20min.json · length: ~20:15
- Concept: one reef, five densities — the eye follows bubbles and sea friends as the count and tempo fall from busy to sparse
- Age band: 3–6 months (scene 3–24 months)
- Scene families: bubbles only · Palettes: pastel, primary · Tempo: 96 → 84 → 90 → 60 → 66 BPM
- Melody set: Row Your Boat (1852), Pachelbel's Canon (c. 1680), an original seeded tune, Dvořák's Largo (1893), Twinkle in lullaby mode · Narration: none
- Structure: title 4 s → 22 bubbles 4 min → 14 bubbles 4 min → 30 bubbles 4 min → 12 slow bubbles 4 min → 18 drifting 4 min → end card 8 s
- End card: "More at baby-loop.netlify.app/shop" / "Made just for your little one"
- Thumbnail text: "Bubbles | Slow Visual Tracking" · heroes: fish, whale, turtle
- Diff vs every earlier upload: The only flagship in the bubbles scene family and the only one built around a single visual-tracking idea with a density arc (bubble count, palette and tempo change every four minutes). Its melody set and busy-to-sparse arc are unique; no other flagship uses bubbles or sea characters.
- Upload: — · playlist: Sensory (3–12 mo)

### flagship-mother-goose-five-rhymes-10min  —  Mother Goose – 5 Classic Nursery Rhymes – Humpty Dumpty, Hickory Dickory Dock, Jack and Jill & More
- Spec: specs/flagship/mother-goose-five-rhymes-10min.json · length: ~9:50
- Concept: spoken verse with the words on screen, a 90-second scene interlude after each rhyme
- Age band: 12–36 months
- Scene families: story pages (rhymes) + garden + train + rainbow-rain · Palettes: pastel, primary · Tempo: 84–104 BPM
- Melody set: generated beds under the rhymes; Vivaldi's Spring (1725), London Bridge (1744), Frère Jacques (18th c.), Grieg's Morning Mood (1875) under the interludes · Narration: verse, voice kristin
- Structure: title 4 s → Humpty Dumpty → garden 1.5 min → Hickory Dickory Dock → train 1.5 min → Jack and Jill → rainbow 1.5 min → Little Miss Muffet → garden 1.5 min → Little Bo-Peep → end card 8 s
- End card: "More at baby-loop.netlify.app/shop" / "Made just for your little one"
- Thumbnail text: "5 Nursery Rhymes | Mother Goose" · heroes: sheep, cow, duck
- Diff vs every earlier upload: The only verse flagship: five spoken Mother Goose rhymes (none of the sung ones used elsewhere), shown as picture-book pages, separated by garden, train and rainbow-rain loops that no other flagship uses. Its narration is rhythmic verse rather than lesson cards or story prose, its melody set is distinct, and it is the only episode that mixes four scene families.
- Upload: — · playlist: Story & Sleep

### flagship-story-jack-beanstalk  —  Jack and the Beanstalk – Bedtime Story for Toddlers – Read Aloud with Pictures
- Spec: specs/flagship/story-jack-beanstalk-read-aloud.json · length: ~6:00
- Concept: a 17-page picture-book read-aloud with page turns and a pause after every page, then a garden wind-down
- Age band: 18 months–4 years
- Scene families: story + garden · Palette: storybook backdrops (meadow, cottage, castle, night) · Tempo: 72 BPM story / 84 BPM garden
- Melody set: Greensleeves (16th c.) under the story, Grieg's Morning Mood (1875) under the garden · Narration: prose, voice kristin
- Structure: title page 4 s → 17 pages (~7 s each, 1.8 s pause) → "The End" + moral 5 s → garden 3 min → end card 8 s
- End card: "More at baby-loop.netlify.app/shop" / "Made just for your little one"
- Thumbnail text: "Jack and the | Beanstalk" · heroes: cow, chick, sheep
- Diff vs every earlier upload: The only prose flagship and the only one built on the story scene: a narrated picture book with page turns, a title page and a moral, which no other flagship contains. It runs at 72 BPM under Greensleeves — a melody and tempo used nowhere else — and closes with a single flower-garden loop rather than a dance or sleep loop. Age band, narration length and the fairy-tale cast are unique to this episode.
- Upload: — · playlist: Story & Sleep

### flagship-sleepy-lullaby-60min  —  Sleepy Stars – 1 Hour Lullaby – Brahms, Clair de lune, Gymnopédie – Bedtime Video for Babies
- Spec: specs/flagship/sleepy-lullaby-60min.json · length: ~60:15
- Concept: leave-it-running sleep video; the picture gets calmer as the hour goes on
- Age band: 0–36 months
- Scene families: sleepy-stars + balloons (lullaby mode) + rainbow-rain (lullaby mode) · Palettes: sleepy, pastel · Tempo: 58–66 BPM
- Melody set: Brahms' Lullaby (1868), Clair de lune (1905), Gymnopédie No. 1 (1888), Dvořák's Largo (1893), Moonlight Sonata (1801), Jesu, Joy of Man's Desiring (1723) · Narration: none
- Structure: title 5 s → Brahms 12 min → balloons at dusk 8 min → Gymnopédie 12 min → night rain 8 min → Moonlight 10 min → Jesu 10 min → end card 8 s
- End card: "More at baby-loop.netlify.app/shop" / "Made just for your little one"
- Thumbnail text: "Sleepy Stars | 1 Hour Lullaby" · heroes: sheep, owl, bunny (dozy faces)
- Diff vs every earlier upload: The only sleep flagship and the only one an hour long: six classical lullabies at 58–66 BPM over a night-time scene set, with balloons and rainbow-rain rendered in lullaby mode, which appear at that tempo nowhere else. It has no narration, no dance loops, no lesson or story pages, and it is built to be left running with the screen dimmed, unlike the five daytime episodes.
- Upload: — · playlist: Story & Sleep (Sleep)

## Cross-check (no two flagships share a row)

| id | concept | scene families | narration | tempo | melody set |
|---|---|---|---|---|---|
| newborn-contrast-20min | pattern fixation | high-contrast | none | 60–66 | Brahms, Twinkle, Gymnopédie, Clair de lune |
| fruit-colours-counting-12min | call-and-response cards | flashcards, dancing-fruits | lesson cards | 94 / 108–112 | Mary, Row, Frère; Twinkle, Old MacDonald, London Bridge |
| bubbles-tracking-20min | density arc for tracking | bubbles | none | 96 → 60 | Row, Canon, generated, Largo, Twinkle |
| mother-goose-five-rhymes-10min | spoken verse + interludes | story pages, garden, train, rainbow-rain | verse | 84–104 | generated; Spring, London Bridge, Frère, Morning Mood |
| story-jack-beanstalk | picture-book read-aloud | story, garden | prose | 72 / 84 | Greensleeves, Morning Mood |
| sleepy-lullaby-60min | one-hour wind-down | sleepy-stars, balloons, rainbow-rain | none | 58–66 | Brahms, Clair de lune, Gymnopédie, Largo, Moonlight, Jesu |

Twinkle appears in three episodes but in three different roles (newborn lullaby bed, dance
loop, lullaby-mode bubbles); Morning Mood and Frère Jacques appear twice under different scenes.
Everything else is unique to one upload.

## Clips (demo reel) — logged separately

Vertical clips (`specs/clips/*.json`, `babyloop clip`) are 30–75 s parent-facing cuts for
TikTok / Reels / Shorts. They are not long-form uploads and do not need a diff paragraph, but the
three-per-week cadence in PLAYBOOK §4 still applies, and each clip should come from a different
scene × melody × hook than the previous two. Track them in `out/clips/<id>/post.json`.
