# Payhip products — paste-ready

Payhip is the direct mirror for the three personalised videos and the home of the Calm
Library download. It charges 5 % per sale on the free plan (plus the payment processor's
fee), lets us collect a name field at checkout, and handles EU/UK VAT on digital goods for
us, which Etsy also does but a plain Stripe checkout would not.

Paste the product URLs into `LINKS` in `site/shop/index.html`: `payhipLibrary` for the
Calm Library, and (if you want the personalised videos to sell direct as well) either point
`shopify` at the Payhip store front or add a `payhip*` key next to each `etsy*` key.

---

## How Payhip handles the name field

Payhip has no "personalization box" like Etsy. Use one of these two, in order of preference:

1. **Checkout questions** (Payhip → Settings → Checkout → *Customer questions*, or per product under
   *Advanced → Checkout fields*). Add three required text fields to each personalised product:
   `Child's name (as it should appear on screen)`, `How to say it (e.g. "Mila = MEE-la")`, `Age / chosen tale`.
   Answers appear in the order email and in Payhip → Orders. This is the cleanest option.
2. **Fallback**: if the plan you're on doesn't show checkout fields, set the product's *Delivery* to
   "Send a message instead of a file" and write, in the confirmation message, "Reply to this email with
   the name, how to say it, and the age. Your video arrives within 24 hours of your reply."

Set every personalised product to **"Deliver manually"** (Product → *Files* → no file attached; delivery
happens by email with a link). Payhip still sends the order receipt automatically. Set the Calm Library
to normal file delivery (or a "Digital download via link" if the bundle is too large for Payhip's
per-file cap; a 5–8 GB library is: host it on a file host and put the link in the delivery text).

Turn on: *Collect email marketing consent at checkout* (feeds the launch list), *Pay what you want* **off**
for the videos and **on** for the album mirror if you list it here too.

---

## Product 1 — Happy Birthday video (personalised)

- **Name:** Happy Birthday video with your child's name (personalised, 4–5 min, 1080p)
- **Price:** US$15
- **Type:** Digital product, delivered manually within 24 h
- **Checkout fields:** name · how to say it · age turning · (optional) favourite character or song wish
- **Cover image:** `site/shop/birthday-poster.png` (or the lead's `site/samples/birthday-sample.png`)
- **Short description (Payhip shows it in the store grid):**
  A 4–5 minute party video with your child's name and age in the title card and in the song. Hand-drawn fruit friends in party hats, balloons dancing to a music-box "Happy Birthday to You". Delivered as a 1080p MP4 within 24 hours.
- **Full description:** reuse Listing 1 from `store/etsy-listings.md` in full, replacing "by Etsy message" with "by email" and dropping the Etsy buyer-protection sentence.

## Product 2 — Goodnight video (personalised)

- **Name:** Goodnight video with your child's name (personalised, 20 min lullaby video, 1080p + MP3)
- **Price:** US$19
- **Checkout fields:** name · how to say it · (optional) sleepy friend / lullaby wish
- **Cover image:** `site/shop/goodnight-poster.png`
- **Short description:** Twenty slow minutes of Sleepy Stars and drifting bubbles, opened by a soft goodnight to your child by name. Brahms, Twinkle and an original music-box tune; fades out on its own. 1080p MP4 plus MP3, within 24 hours.
- **Full description:** Listing 2 from `store/etsy-listings.md`, same substitutions.

## Product 3 — Bedtime story (personalised)

- **Name:** Personalised bedtime story video, your child as the hero (6 tales, 6–8 min, 1080p)
- **Price:** US$15
- **Checkout fields:** name · how to say it · tale (Beanstalk / Goldilocks / Gingerbread Man / Little Red Hen / Tortoise & Hare / Three Little Pigs) · (optional) favourite animal
- **Cover image:** `site/shop/story-poster.png`
- **Short description:** A classic tale retold for toddlers with your child in the lead role. Sixteen illustrated pages, one calm sentence per page, captions to read along, a lullaby under the ending. 1080p MP4 within 24 hours.
- **Full description:** Listing 3 from `store/etsy-listings.md`, same substitutions.

## Product 4 — The Calm Library (download pass)

- **Name:** The Calm Library — every BabyLoop episode and album, ad-free, yours to keep
- **Price:** US$24 launch price (list US$39; use Payhip's *compare-at* price so the strike-through shows). Not personalised.
- **Type:** Digital product, automatic delivery. If the bundle exceeds Payhip's per-file limit, deliver a `README.txt` with the download links plus a small "start here" MP4, and host the big files on a file host with direct links.
- **Cover image:** a 2×2 grid of `site/samples/*.png` posters
- **Checkout fields:** none
- **Updates:** Payhip lets you *Update file and notify buyers*; that is how "new episodes added for 12 months" is honoured. Re-upload the README with new links; buyers get an email.
- **Short description:** About ten hours of calm 1080p video and every lullaby as audio, in files you own. For flights, road trips and no-wifi houses. No ads, no autoplay, no subscription.
- **Full description:**

```
About ten hours of BabyLoop as files you own, watch offline on any device, and never
have to worry about what plays next.

WHAT'S IN THE LIBRARY
Video (1080p MP4, H.264 + AAC):
• Fruit Friends Dance & Bubbles — baby sensory, 30 min
• Sleepy Stars Lullaby — 60 min
• Classical Favourites for Babies — 60 min
• Classical Lullabies — 60 min
• Learn Colours & Shapes — narrated learning episode
• Jack and the Beanstalk — narrated story (the un-personalised original)
• A Very Fruity Christmas — 30 min holiday special
• Halloween Friends — 30 min
• Birthday Party — 20 min (generic; personalised versions are sold separately)
• Every individual loop scene as its own short clip, so you can build your own playlist
Audio:
• Sleepy Stars: Lullabies, Vol. 1 (MP3 + FLAC)
• Nursery Songs, Slowly, Vol. 2 (MP3 + FLAC)
• A Quiet Christmas (MP3 + FLAC)

NEW EPISODES FOR A YEAR
When we add an episode, we add it to your download and email you. Twelve months of
additions are included; nothing renews and nothing is charged again.

HOW TO USE IT
Download to a phone or tablet before a flight. Drop the folder on a USB stick for the TV.
Add it to Plex or Jellyfin and it shows up with posters. The MP3s go on any speaker.

THE FINE PRINT
• Personal-use licence for your household. Not for resale, upload to YouTube or other
  platforms, or use in a daycare or business.
• Narration in the story and learning episodes is a synthetic voice (AI text-to-speech)
  we run on our own computer; every word is written and checked by us.
• All characters are original hand-drawn vector art; all music is procedurally arranged
  from public-domain melodies.
• About 6–8 GB in total. Download links are sent instantly and remain live; you can
  re-download from your Payhip receipt any time.
• Refund within 14 days if it doesn't play on your device and we can't fix it.
```

---

## Store-front settings

- Store name: BabyLoop. Tagline: "Calm videos for small people."
- Colours: background `#f4efe6`, accent `#ffd400`, text `#1f1c26` (the studio tokens), Fredoka for headings if Payhip's theme allows a Google font.
- Footer text: the trust line from the shop page. Link back to the shop page and to the FAQ.
- Turn on Payhip's *Affiliate* feature later, not at launch.
- VAT: leave *Payhip handles EU/UK VAT* on. It is why Payhip rather than a bare Stripe link.
