import { readFileSync } from "node:fs";
import Groq from "groq-sdk";

process.loadEnvFile(new URL("../.env", import.meta.url));

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL ?? "llama-3.3-70b-versatile";
const VISION_MODEL = process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.6-27b";

export async function generateNarrative({ month, topTracks, topArtists, photoCount }) {
  const trackList = topTracks.map((t) => `${t.name} by ${t.artists.map((a) => a.name).join(", ")}`).join("; ");
  const genres = [...new Set(topArtists.flatMap((a) => a.genres ?? []))].slice(0, 6).join(", ");

  const prompt = `Write a short, upbeat "Wrapped"-style recap paragraph (60-80 words) for ${month}.
Top tracks: ${trackList || "none captured"}.
Top genres: ${genres || "unknown"}.
The user also captured ${photoCount} photo(s) this month.
Tone: energetic, personal, like Spotify Wrapped copy. Plain text only, no markdown, no headings.`;

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content.trim();
}

// photos: [{ id, absolutePath, mimeType }] — read from local disk since the
// Photo Picker's baseUrl (60min TTL) is long expired by the time this runs.
// Returns { coverPhotoId, moments: [{ id, caption }] }.
//
// Unlike Gemini, Groq's vision model (qwen/qwen3.6-27b) hard-caps requests at
// 3 images — confirmed live ("Too many images provided. This model supports
// up to 3 images"). So this runs in chunks of 3, asking each chunk for its
// own standout photo(s), then picks the first chunk's pick as the cover.
const CHUNK_SIZE = 3;
const MAX_MOMENTS = 6;

export async function pickHighlights({ photos }) {
  if (photos.length === 0) return { coverPhotoId: null, moments: [] };
  if (photos.length === 1) return { coverPhotoId: photos[0].id, moments: [{ id: photos[0].id, caption: "" }] };

  const moments = [];
  for (let i = 0; i < photos.length && moments.length < MAX_MOMENTS; i += CHUNK_SIZE) {
    const chunk = photos.slice(i, i + CHUNK_SIZE);
    const content = [
      {
        type: "text",
        text: `From the following ${chunk.length} photo(s), pick up to 2 standout "top moments", each with a caption.

Captions must be genuinely funny/punchy viral-Instagram-caption energy — think a witty friend roasting or hyping the photo, NOT a flat description. Bad (never do this): "Cubicle smiles, full energy", "City nights with the crew". Good: specific, vivid, a little unhinged, maybe a callback to something visible in the photo. 3-8 words. No hashtags, no quotation marks. If none stand out, return an empty list.
Respond with strict JSON: {"moments": [{"id": "<id>", "caption": "<text>"}]}.`,
      },
    ];
    for (const photo of chunk) {
      const data = readFileSync(photo.absolutePath).toString("base64");
      content.push({ type: "text", text: `Photo id: ${photo.id}` });
      content.push({ type: "image_url", image_url: { url: `data:${photo.mimeType ?? "image/jpeg"};base64,${data}` } });
    }

    const completion = await groq.chat.completions.create({
      model: VISION_MODEL,
      messages: [{ role: "user", content }],
      temperature: 1.1,
      response_format: { type: "json_object" },
    });
    const { moments: chunkMoments } = JSON.parse(completion.choices[0].message.content);
    moments.push(...(chunkMoments ?? []));
  }

  return { coverPhotoId: moments[0]?.id ?? photos[0].id, moments: moments.slice(0, MAX_MOMENTS) };
}

// Short "you were feeling these moods" style words/phrases derived from the
// month's top genres/tracks — e.g. ["Main Character Energy", "Late Night Feels"].
export async function generateMoods({ topTracks, topArtists }) {
  const trackList = topTracks.map((t) => `${t.name} by ${t.artists.map((a) => a.name).join(", ")}`).join("; ");
  const genres = [...new Set(topArtists.flatMap((a) => a.genres ?? []))].slice(0, 8).join(", ");

  const prompt = `Based on these top tracks: ${trackList || "none"}
And genres: ${genres || "unknown"}
Come up with 4 short "mood" phrases (2-4 words each) describing the vibe, like a Gen-Z Spotify Wrapped slide — think "Main Character Energy", "Late Night Feels", "Certified Bops", "Golden Hour Vibes". Punchy, specific to the actual music, not generic.
Respond with strict JSON: {"moods": ["<phrase>", ...]}.`;

  const completion = await groq.chat.completions.create({
    model: TEXT_MODEL,
    messages: [{ role: "user", content: prompt }],
    temperature: 1.1,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices[0].message.content).moods;
}
