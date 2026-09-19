// Upload metadata: title, chaptered description, tags — ready for upload/upload.py.
const fmt = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60; return h ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`; };

const DEFAULT_TAGS = ['baby sensory', 'baby video', 'infant visual stimulation', 'toddler learning', 'nursery rhymes', 'lullaby for babies', 'calm baby video', 'high contrast baby video', 'fruit dance party', 'baby music', 'sensory video for babies', 'bedtime video for babies', 'preschool learning'];

export function buildMetadata({ spec, segments, totalSeconds }) {
  const chapters = segments.map((s) => `${fmt(s.start)} ${s.label}`);
  const known = [...new Set(segments.map((s) => s.music?.name).filter((n) => n && !/^Original pentatonic/.test(n)))];
  const hasGenerated = segments.some((s) => /^Original pentatonic/.test(s.music?.name || ''));
  const melodies = hasGenerated ? [...known, 'original tunes written for this channel'] : known;
  const narrated = segments.some((s) => s.narrated);
  const ages = [...new Set(segments.map((s) => s.ageBand).filter(Boolean))];
  const mins = Math.max(1, Math.round(totalSeconds / 60));
  const hook = spec.hook || `${mins} minute${mins === 1 ? '' : 's'} of gentle, colourful animation with original music-box arrangements of classic nursery tunes — made to hold a little one's attention while you catch your breath.`;
  const description = [
    hook,
    '',
    '⏱ Chapters',
    ...chapters,
    '',
    ages.length ? `👶 Made for: ${ages.join(' · ')}` : null,
    `🎵 Music: original arrangements${melodies.length ? ' of ' + melodies.join(', ') : ''} (all public-domain melodies, synthesised for this channel — no samples, no stock).`,
    narrated ? '🗣 Narration: a synthetic voice (Piper, public-domain training data), read slowly with pauses so little ones can process each phrase.' : null,
    '',
    'For parents: babies learn most from you. We keep cuts slow and volumes low so this works as background while you co-view, cook, or take five. The AAP recommends no screens under 18 months except video-chat; use your judgement and keep sessions short.',
    '',
    spec.credits || 'Made with BabyLoop — an open canvas + ffmpeg pipeline. Every frame and every note is generated, nothing is reused from other channels.',
    '',
    (spec.hashtags || ['#babysensory', '#babyvideos', '#nurseryrhymes', '#toddlerlearning', '#lullaby']).join(' '),
  ].filter((l) => l !== null).join('\n');

  return {
    title: spec.title,
    description,
    tags: [...new Set([...(spec.tags || []), ...DEFAULT_TAGS])].slice(0, 30),
    categoryId: spec.categoryId || '27',
    defaultLanguage: 'en',
    madeForKids: true,
    chapters,
    durationSeconds: Math.round(totalSeconds),
  };
}
