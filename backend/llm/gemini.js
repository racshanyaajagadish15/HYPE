import { readFileSync } from "node:fs";
import { GoogleGenAI, Type } from "@google/genai";

process.loadEnvFile(new URL("../.env", import.meta.url));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export async function generateNarrative({ month, topTracks, topArtists, photoCount }) {
  const trackList = topTracks.map((t) => `${t.name} by ${t.artists.map((a) => a.name).join(", ")}`).join("; ");
  const genres = [...new Set(topArtists.flatMap((a) => a.genres ?? []))].slice(0, 6).join(", ");

  const prompt = `Write a short, upbeat "Wrapped"-style recap paragraph (60-80 words) for ${month}.
Top tracks: ${trackList || "none captured"}.
Top genres: ${genres || "unknown"}.
The user also captured ${photoCount} photo(s) this month.
Tone: energetic, personal, like Spotify Wrapped copy. Plain text only, no markdown, no headings.`;

  const response = await ai.models.generateContent({ model: MODEL, contents: prompt });
  return response.text.trim();
}

// photos: [{ id, absolutePath, mimeType }] — read from local disk since the
// Photo Picker's baseUrl (60min TTL) is long expired by the time this runs.
// Returns { coverPhotoId, moments: [{ id, caption }] } — one combined vision
// call instead of two separate ones (cheaper, and keeps captions consistent
// with the chosen cover).
export async function pickHighlights({ photos }) {
  if (photos.length === 0) return { coverPhotoId: null, moments: [] };
  if (photos.length === 1) return { coverPhotoId: photos[0].id, moments: [{ id: photos[0].id, caption: "" }] };

  const parts = [];
  for (const photo of photos) {
    const data = readFileSync(photo.absolutePath).toString("base64");
    parts.push({ text: `Photo id: ${photo.id}` });
    parts.push({ inlineData: { data, mimeType: photo.mimeType ?? "image/jpeg" } });
  }
  parts.push({
    text: `From the photos above:
1. Pick the single best cover photo for a "Wrapped"-style video title card.
2. Pick up to ${Math.min(6, photos.length)} standout "top moments" (may include the cover photo), each with a caption.

Captions must be genuinely funny/punchy viral-Instagram-caption energy — think a witty friend roasting or hyping the photo, NOT a flat description. Bad (never do this): "Cubicle smiles, full energy", "City nights with the crew". Good: specific, vivid, a little unhinged, maybe a callback to something visible in the photo. 3-8 words. No hashtags, no quotation marks.
Respond as JSON.`,
  });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 1.3,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          coverPhotoId: { type: Type.STRING },
          moments: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { id: { type: Type.STRING }, caption: { type: Type.STRING } },
              required: ["id", "caption"],
            },
          },
        },
        required: ["coverPhotoId", "moments"],
      },
    },
  });

  return JSON.parse(response.text);
}

// Short "you were feeling these moods" style words/phrases derived from the
// month's top genres/tracks — e.g. ["Main Character Energy", "Late Night Feels"].
export async function generateMoods({ topTracks, topArtists }) {
  const trackList = topTracks.map((t) => `${t.name} by ${t.artists.map((a) => a.name).join(", ")}`).join("; ");
  const genres = [...new Set(topArtists.flatMap((a) => a.genres ?? []))].slice(0, 8).join(", ");

  const prompt = `Based on these top tracks: ${trackList || "none"}
And genres: ${genres || "unknown"}
Come up with 4 short "mood" phrases (2-4 words each) describing the vibe, like a Gen-Z Spotify Wrapped slide — think "Main Character Energy", "Late Night Feels", "Certified Bops", "Golden Hour Vibes". Punchy, specific to the actual music, not generic. Respond as JSON.`;

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: {
      temperature: 1.2,
      responseMimeType: "application/json",
      responseSchema: { type: Type.OBJECT, properties: { moods: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["moods"] },
    },
  });

  return JSON.parse(response.text).moods;
}
