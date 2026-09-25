# Bandcamp — the lullaby catalogue

Bandcamp takes 15 % of digital sales (10 % once an artist passes US$5,000 in the trailing
12 months) plus the payment processor's fee. It gives buyers MP3, FLAC and every other
format from one upload, supports name-your-price, and ranks in Google for
"music box lullaby" searches. It is a small revenue line and a large trust signal: a real
catalogue with real track lengths.

Paste the artist or album URL into `LINKS.bandcamp` in `site/shop/index.html`.

Every track is rendered from the generator's lullaby mode. Everything is a public-domain
composition (sources in `lib/melodies.mjs`), and the render is our own recording, so there
is no third-party recording to license.

Render one track: `node bin/babyloop.mjs music --mode lullaby --melody brahms --bpm 66 --out brahms.wav`
gives one seamless loop; repeat it to 3–4 minutes with a 6 s fade-in and a 10 s fade-out
before upload (ffmpeg `-af afade=t=in:d=6,afade=t=out:st=<len-10>:d=10`). Master at
−16 LUFS, −1.5 dBTP, the same as the episodes. Upload WAV or FLAC; Bandcamp makes the rest.

---

## Artist page

- **Artist name:** BabyLoop
- **Genre:** Kids / Children's music. Secondary: ambient.
- **Location:** as Joshua prefers.
- **Bio (short):** Music-box lullabies and nursery songs arranged from public-domain melodies, made to be quiet. Every track is rendered by our own generator; every character on the covers is hand-drawn. Nothing here flashes, shouts or autoplays.
- **Links:** the shop page, the samples page.

## Album 1 — Sleepy Stars: Lullabies, Vol. 1

- **Price:** US$6, name-your-price on (minimum US$6). Individual tracks US$1.
- **Tags:** lullaby, music box, baby sleep, sleep music, kids, children's music, ambient, classical, public domain, calm
- **Cover:** the Sleepy Stars night palette, owl + sheep + bunny stickers, title in Fredoka (build with the thumbnail renderer at 1400×1400 or crop the 16:9 poster to a square).
- **About:** Ten slow music-box arrangements of the melodies babies have been sung for two hundred years, plus one of our own. Pads, music box, slow harp, long reverb, ~63–66 bpm. Rendered by the BabyLoop generator; all compositions are public domain (sources per track). Also included in the Calm Library.

| # | Track | Melody key | BPM | Target length | Source |
|---|---|---|---|---|---|
| 1 | Brahms' Lullaby | `brahms` | 66 | 4:00 | Brahms, Wiegenlied Op. 49 No. 4 (1868) |
| 2 | Twinkle, Twinkle, Little Star | `twinkle` | 63 | 3:30 | "Ah! vous dirai-je, maman" (1761) |
| 3 | Clair de lune | `clairdelune` | 60 | 4:00 | Debussy, Suite bergamasque (1905) |
| 4 | Gymnopédie No. 1 | `gymnopedie` | 60 | 3:45 | Satie (1888) |
| 5 | Greensleeves | `greensleeves` | 66 | 3:30 | English traditional (16th c.) |
| 6 | Largo (from the New World) | `largo` | 60 | 4:00 | Dvořák, Symphony No. 9 (1893) |
| 7 | Jesu, Joy of Man's Desiring | `jesu` | 66 | 3:45 | J. S. Bach, BWV 147 (1723) |
| 8 | Moonlight Sonata (first theme) | `moonlight` | 60 | 4:00 | Beethoven, Op. 27 No. 2 (1801) |
| 9 | Pachelbel's Canon | `canon` | 63 | 4:00 | Pachelbel, Canon in D (c. 1680), in C |
| 10 | Original Lullaby No. 1 | `generated`, seed 404 | 63 | 3:30 | BabyLoop, procedural pentatonic |

Total ≈ 38 minutes.

## Album 2 — Nursery Songs, Slowly, Vol. 2

- **Price:** US$6, name-your-price on. Tracks US$1.
- **Tags:** nursery rhymes, lullaby, music box, toddler, baby sleep, kids, children's music, bedtime, public domain, calm
- **Cover:** the Flower Garden palette at dusk, bee + butterfly + ladybug asleep.
- **About:** The daytime songs, played as if it were night. Same music-box instruments, half the tempo, no drums.

| # | Track | Melody key | BPM | Target length | Source |
|---|---|---|---|---|---|
| 1 | Mary Had a Little Lamb | `mary` | 66 | 3:00 | Hale 1830 / Lowell Mason |
| 2 | Row, Row, Row Your Boat | `row` | 63 | 3:00 | Traditional (1852) |
| 3 | Frère Jacques | `frere` | 66 | 3:00 | French traditional (18th c.) |
| 4 | London Bridge | `london` | 66 | 3:00 | Traditional (1744) |
| 5 | The Itsy Bitsy Spider | `itsy` | 63 | 3:00 | Traditional (1910) |
| 6 | Old MacDonald, Very Slowly | `oldmac` | 63 | 3:00 | Traditional (1706 ancestor) |
| 7 | Morning Mood (at bedtime) | `morning` | 60 | 3:45 | Grieg, Peer Gynt (1875) |
| 8 | Prelude in C | `prelude` | 63 | 3:30 | J. S. Bach, BWV 846 (1722) |
| 9 | Minuet in G | `minuet` | 66 | 3:00 | Petzold, Anna Magdalena Bach Notebook (1725) |
| 10 | Original Lullaby No. 2 | `generated`, seed 812 | 63 | 3:30 | BabyLoop, procedural pentatonic |

Total ≈ 32 minutes.

## Album 3 — A Quiet Christmas (seasonal, list in November)

- **Price:** US$4, name-your-price on. Tracks US$1.
- **Tags:** christmas, lullaby, music box, baby's first christmas, holiday, kids, children's music, sleep music, public domain, calm
- **Cover:** the Christmas theme's snow bubbles palette, fruit friends in Santa hats, eyes closed.

| # | Track | Melody key | BPM | Target length | Source |
|---|---|---|---|---|---|
| 1 | Silent Night | `silentnight` | 60 | 4:00 | Gruber (1818) |
| 2 | Deck the Halls, Slowly | `deckhalls` | 66 | 3:00 | Welsh traditional ("Nos Galan", 16th c.) |
| 3 | We Wish You a Merry Christmas | `wewish` | 66 | 3:00 | English traditional (16th c.) |
| 4 | Jingle Bells (music box) | `jingle` | 66 | 3:00 | Pierpont (1857) |
| 5 | Greensleeves (What Child Is This) | `greensleeves` | 63 | 3:30 | English traditional (16th c.) |
| 6 | Original Winter Lullaby | `generated`, seed 1225 | 60 | 3:30 | BabyLoop, procedural pentatonic |

Total ≈ 20 minutes.

## Notes

- Keep track titles descriptive and the composer credited in the per-track "about" field: Bandcamp's search and Google both reward it, and it is the provenance record if a Content ID style claim ever arrives elsewhere.
- Do not upload anything from the "not public domain" list in `PLAYBOOK.md` §6 (Wheels on the Bus, Baby Shark, You Are My Sunshine…).
- Bandcamp Friday (first Friday of most months) waives Bandcamp's share; time launch posts for it.
- Once the albums exist, the Calm Library on Payhip should include the same FLAC/MP3 files, and the album card on the shop page should link the artist page rather than a single album.
