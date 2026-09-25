# BabyLoop commercial licence

Plain-language terms for using the BabyLoop generator (the code in this repository, the drawn
character cast, the scene modules, the music arrangement engine, the content JSON and the
studio) to make videos or audio for a channel, a brand or a business.

## Where things stand today

This repository is not open source. It has no LICENSE file, and `package.json` marks it
`"private": true` with no `license` field, which under copyright law means **all rights
reserved** by default. Nothing here changes that default except as granted below.

**Personal use is free.** You may clone the repository, run it, change it and render videos
for your own family and friends, and share those renders privately, at no cost. You may not
sell the output, put it on a monetised or public channel, or offer the generator as a service
without one of the licences below. That personal grant stays in place regardless of anything
else in this document.

Third-party components keep their own licences and are your responsibility to comply with:
`@napi-rs/canvas` and `esbuild` (MIT), ffmpeg (LGPL/GPL depending on build), the Piper
text-to-speech engine (MIT for the archived `rhasspy/piper`; GPL-3.0 for the maintained
`OHF-Voice/piper1-gpl`, which governs the engine, not the audio it produces), Piper voice
models (each has its own model card; BabyLoop only offers voices trained on public-domain
speech, and refuses the non-commercial `lessac` family), the Fredoka and Noto fonts (OFL).
The melodies are public-domain compositions; the renders are original recordings.

## Tiers

| | Creator — US$249 once | Studio — US$999 once | White-label — quote |
|---|---|---|---|
| Who | One person or company, one channel or brand | One company, unlimited channels and brands | Agencies, platforms, resellers |
| Seats | 1 | Up to 10 people | Negotiated |
| Output | Unlimited videos and audio, sell them or monetise them anywhere | Same | Same |
| Rebrand | Keep "BabyLoop" out of your public branding (you may credit it) | You may rename the studio and remove BabyLoop branding | Full white-label, your name on everything |
| Modify the code | Yes, for your own use | Yes | Yes |
| Resell or redistribute the generator | No | No | By agreement |
| Offer it as a service to others (SaaS, "made-to-order video" shops using our pipeline) | No — that is what Studio is for | Yes, under your own brand | Yes |
| Updates | 12 months of repository updates | 12 months, plus one onboarding call | Per agreement |
| Support | Email, best effort | Email, 2 business days | Per agreement |
| Term | Perpetual for the version you have; updates for 12 months | Same | Per agreement |

Prices are in US dollars, exclusive of any tax you owe locally. Pay once; there is no revenue
share and nothing renews automatically.

## What every tier allows

- Render videos, stills, thumbnails and music with the generator and use them commercially:
  YouTube and other platforms, personalised videos sold to parents, streaming, broadcast,
  physical media, apps.
- Use the drawn cast and the scenes in that output.
- Modify scenes, add characters, add melodies and stories for your own output.

## What no tier allows

- Selling, sublicensing, publishing or giving away the generator itself, in whole or in
  part, including as a template pack, a plugin, or a "course" download. Your output is yours;
  the tool is not.
- Passing off the cast or the output as endorsed by BabyLoop or its author, or using the
  BabyLoop name or logo as your brand (Creator tier) beyond a credit.
- Removing the synthetic-voice disclosure from output that contains narration where a
  platform, a marketplace or a law requires it. Etsy, YouTube's altered-content label and
  the EU AI Act all currently do in some form; that is your compliance, not ours.
- Using the generator to make content that is unsafe for children, deceptive, or that
  breaches the platform policies summarised in `PLAYBOOK.md`.
- Training machine-learning models on the drawn cast or the code.

## No earnings claims, no guarantees

We make no representation that content made with BabyLoop will earn money, be approved for
any monetisation programme, or stay compliant with platform policies, which change often
(YouTube's made-for-kids rules and its July 2025 "inauthentic content" policy are described
in `PLAYBOOK.md` §3 as of the date written). The software is provided as is, without warranty
of any kind. Our total liability under this licence is limited to the fee you paid. You are
responsible for the content you publish and for the licences of the third-party components
listed above.

## Practicalities

- A licence is issued to the name and email on the receipt. Keep the receipt; it is the
  licence certificate.
- Upgrading from Creator to Studio within 12 months costs the difference.
- If you breach these terms and don't fix it within 30 days of being told, the licence
  ends; your existing published output may stay up, but you stop using the generator.
- Questions, edge cases and white-label quotes: use the contact link on the shop page.
  If in doubt, ask first; the answer is usually yes.

Version 1, 2026-09-25. This licence covers the repository at the commit you received it
with and updates delivered during your update period. It supersedes nothing about the
personal-use grant above, which remains free.
