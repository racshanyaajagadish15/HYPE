export const DESCRIBE_INSTRUCTIONS = `For each photo, describe only what is actually visible — never invent names, places or events.
- setting: 1-3 words naming the scene/place type (e.g. "Rooftop bar", "Beach", "Kitchen", "Concert"). Only use a real place name if signage makes it unmistakable.
- what: one short sentence on what's happening.
- people: how many people are clearly visible (0 if none).
- light: one of "golden hour", "daylight", "night", "indoor".
- quality: 1-10 for how good a "best of the month" pick it is (sharp, interesting, emotional = high; screenshots, receipts, documents, blurry duplicates = 1-3).
- focusX, focusY: where the main subject is, as percentages of the image width and height (0-100, 0,0 = top-left). If there are people, use the centre of their faces/group so a crop keeps them in frame.
Use the exact photo id given before each image.`;

const VOICE = `Voice: HYPE — a hype friend narrating your month. Punchy, specific, warm, a little unhinged; Gen-Z Instagram-caption energy, never corporate or generic.
Hard rules: only reference things that are actually in the material below (photo descriptions, dates, songs, activities). No names of people, no hashtags, no emojis, no quotation marks.`;

const photoLine = (p) =>
  `${p.id} | ${p.when} | setting: ${p.setting} | ${p.what} | people: ${p.people} | light: ${p.light} | quality: ${p.quality}`;

export function planPrompt({ monthLabel, photos, tracks }) {
  return `You are laying out "${monthLabel}" as a short story of slides. Pick which photos go where.

PHOTOS (chronological):
${photos.map(photoLine).join("\n")}

TOP TRACKS (Spotify, ranked):
${tracks.map((t, i) => `${t.id} | #${i + 1} ${t.title} — ${t.artist}`).join("\n") || "(none)"}

Choose:
- hero: the single most memorable photo of the month, plus the track (trackId) that best fits it — default to the #1 track unless another clearly fits better.
- booth: exactly 3 distinct photos with people in them (ideally the same day or night) for a photo-booth strip. Not the hero. Use [] if fewer than 3 photos have people.
- golden: the best warm-light / sunset / end-of-month photo for a "golden hour" polaroid. Not the hero and not in booth. null if nothing fits.
- moments: 5-9 best photos in chronological order (include the hero and golden), each with the trackId that fits its vibe. Skip screenshots, receipts and low-quality shots.

Respond with strict JSON:
{"hero": {"id": "...", "trackId": "..."}, "booth": ["...", "...", "..."], "golden": "...", "moments": [{"id": "...", "trackId": "..."}]}`;
}

export function copyPrompt({ monthLabel, hero, booth, golden, moments, tracks, strava }) {
  const top = tracks[0];
  return `${VOICE}

You are writing every line of text for "${monthLabel}", a story-format recap. Here is the month:

HERO PHOTO: ${photoLine(hero)}${hero.track ? ` | soundtrack: ${hero.track}` : ""}
${booth.length ? `PHOTO-BOOTH STRIP (3 photos):\n${booth.map(photoLine).join("\n")}` : "PHOTO-BOOTH STRIP: none"}
${golden ? `GOLDEN-HOUR POLAROID: ${photoLine(golden)}` : "GOLDEN-HOUR POLAROID: none"}
ALL MOMENTS (chronological):
${moments.map(photoLine).join("\n")}
SONG OF THE MONTH: ${top ? `${top.title} — ${top.artist}` : "none"}
OTHER TOP TRACKS: ${tracks.slice(1, 5).map((t) => `${t.title} — ${t.artist}`).join("; ") || "none"}
STRAVA: ${strava ? `${strava.count} ${strava.kind}, ${strava.km} km total, longest ${strava.longestKm} km` : "none"}

Write (respect the length limits — they're rendered huge on a phone screen):
- heroSetting: 1-3 words, where the hero photo happens (from its setting).
- heroCaption: 2-4 words, max 22 characters. The headline for the hero photo.
- moments: for EVERY moment id above, a caption of 3-7 words.
- boothHeadline: 3-5 words ending in a period, about who/what is in the booth strip (e.g. "The crew showed up."). "" if no booth strip.
- boothSticker: 1-2 words ending in a period — a cheeky sticker reacting to the strip (e.g. "A lot."). "" if no booth strip.
- goldenSetting: 1-3 words for the golden polaroid's setting. "" if none.
- goldenCaption: 2-4 words, max 20 characters, closing-the-month energy. "" if none.
- songNote: 1-3 words for a pill next to the song of the month (e.g. "the anthem", "zero skips").
- stravaLead + stravaWord: a 2-word headline like "You" + "moved" or "You" + "ran it" that fits the activities. "" if no Strava.
- story: exactly 2 sentences, 30-45 words total, retelling the month in order — how it opened, the highlights in between, and naming the song of the month. Wrap 2-4 key phrases in highlight marks: {pink:phrase}, {gold:phrase}, {cyan:phrase} (use {cyan:...} for the song title).
- signoff: 2-3 words ending in a period, the final verdict (e.g. "Certified unforgettable.").
- ticketTagline: 2-4 words for the ticket stub (e.g. "One night only").
- archiveBlurb: one sentence of 12-22 words summing up the month for its card in the archive — a quick list of the real highlights plus the song (e.g. "Rooftops, a very loud concert, a 10k with the crew, and one song you couldn't stop playing.").

Respond with strict JSON:
{"heroSetting": "", "heroCaption": "", "moments": [{"id": "", "caption": ""}], "boothHeadline": "", "boothSticker": "", "goldenSetting": "", "goldenCaption": "", "songNote": "", "stravaLead": "", "stravaWord": "", "story": ["", ""], "signoff": "", "ticketTagline": "", "archiveBlurb": ""}`;
}
