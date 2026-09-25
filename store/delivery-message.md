# Delivery message

Send this with the download link when you complete the order. On Etsy: Orders → the order →
**Complete order** → "Add a note to buyer" (or send it as an Etsy message; do both the first
time). On Payhip: reply to the order email. Keep the tone warm and short; the buyer is on a
phone, probably one-handed.

Replace everything in `{braces}`. Delete the lines that don't apply to the product.

---

## The message

```
Subject: {Child}'s video is ready 🎈

Hi {Buyer first name},

{Child}'s {birthday video / goodnight video / bedtime story} is ready. Here it is:

{DOWNLOAD LINK}

What's in the download
• {Child}-{product}.mp4 — 1080p, plays on phones, tablets, laptops and TVs
• {Child}-{product}.mp3 — the audio on its own (goodnight video)
• {Child}-title.png — the title card, in case you want to print it (birthday / story)

Please save a copy somewhere safe — the link stays live for 30 days.

To play it on the TV: AirPlay or Cast it from your phone, or put the file on a USB stick.
On an iPhone, tap the link, then the Share icon → Save Video, and it will be in Photos.

We listened to the name before sending — we said it "{pronunciation as you understood it}".
If that isn't quite right, or anything else is off, just reply and we'll re-render it for
free. That offer doesn't expire.

A reminder of the small print: this video is for {Child} and your family to enjoy at
home, at the party and with grandparents. It isn't for resale or for uploading to YouTube
or other platforms. The narrator is a synthetic voice we run on our own computer; every
character is hand-drawn and every note comes from a public-domain melody.

If {Child} likes it, a photo of them watching it is the best review we could get — and a
review on {Etsy / Payhip} helps other tired parents find us.

Happy {birthday / bedtime / story time},
Joshua
BabyLoop
```

---

## Variants

**Pronunciation unclear (send BEFORE rendering; stops the clock politely):**

```
Hi {Buyer first name} — quick check before I make {Child}'s video: is the name said
"{option A}" or "{option B}"? Reply with whichever is right (or spell it out, like
"MEE-la") and I'll have the video to you within a few hours of hearing back.
```

**Re-render:**

```
Sorry about that — here's the corrected version, with the name said "{new pronunciation}":
{NEW LINK}
The old link will keep working for a few days in case you'd already saved something from it.
```

**Calm Library (Payhip auto-sends the receipt; this goes in the product's delivery text):**

```
Thank you for buying the Calm Library. Your download links are in the attached README
and below. Files are large (about 6–8 GB in total); download over wifi, and feel free to
grab only what you need today — the links don't expire, and you can always come back to
this page from your Payhip receipt.

{LINKS}

When we add an episode, we'll update this download and email you. That's included for
twelve months; nothing renews and nothing is charged again.

Everything in here is for your household to enjoy. Not for resale or re-upload.
```

## Delivery hosting

Use a host that gives a direct link and doesn't require a login: a Cloudflare R2 bucket
with a public link, a Dropbox transfer, or Google Drive "anyone with the link". Name the
file with the child's name so it's obvious in a Downloads folder. Delete files from the
host after 60 days (30 days of promised availability plus a buffer); keep the render spec
and seed so an identical re-render is one command.
