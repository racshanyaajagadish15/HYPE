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
export async function pickCoverPhoto({ photos }) {
  if (photos.length === 0) return null;
  if (photos.length === 1) return photos[0].id;

  const parts = [];
  for (const photo of photos) {
    const data = readFileSync(photo.absolutePath).toString("base64");
    parts.push({ text: `Photo id: ${photo.id}` });
    parts.push({ inlineData: { data, mimeType: photo.mimeType ?? "image/jpeg" } });
  }
  parts.push({ text: "Pick the single best cover/highlight photo from the above for a 'Wrapped'-style video title card. Respond with its id." });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseMimeType: "application/json",
      responseSchema: { type: Type.OBJECT, properties: { coverPhotoId: { type: Type.STRING } }, required: ["coverPhotoId"] },
    },
  });

  return JSON.parse(response.text).coverPhotoId;
}
