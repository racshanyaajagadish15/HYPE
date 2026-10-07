import { readFileSync } from "node:fs";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import "../env.js";
import { DESCRIBE_INSTRUCTIONS } from "./prompts.js";
import { withRetry, describeInBatches } from "./retry.js";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

// photos: [{ id, absolutePath, mimeType }] — read from local disk since the
// Photo Picker's baseUrl (60min TTL) is long expired by the time this runs.
// One huge request with every photo runs long enough for the connection to
// get reset, so photos go in small batches, a few at a time.
// Free-tier keys allow ~5 requests/minute, so fewer, larger batches.
const BATCH = 10;
const CONCURRENCY = 2;

export function describePhotos(photos) {
  return describeInBatches(photos, BATCH, CONCURRENCY, describeBatch, "gemini:describe");
}

async function describeBatch(photos) {
  const parts = [];
  for (const photo of photos) {
    parts.push({ text: `Photo id: ${photo.id}` });
    parts.push({ inlineData: { data: readFileSync(photo.absolutePath).toString("base64"), mimeType: photo.mimeType ?? "image/jpeg" } });
  }
  parts.push({ text: `${DESCRIBE_INSTRUCTIONS}\nDescribe every photo above.` });

  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts }],
    config: {
      temperature: 0.4,
      // Describing what's in a photo doesn't need deep reasoning; keeps batches fast.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          photos: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                setting: { type: Type.STRING },
                what: { type: Type.STRING },
                people: { type: Type.INTEGER },
                light: { type: Type.STRING },
                quality: { type: Type.INTEGER },
                focusX: { type: Type.INTEGER },
                focusY: { type: Type.INTEGER },
              },
              required: ["id", "setting", "what", "people", "light", "quality", "focusX", "focusY"],
            },
          },
        },
        required: ["photos"],
      },
    },
  });
  return JSON.parse(response.text).photos;
}

export function writeJson(prompt, { temperature = 1 } = {}) {
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { temperature, responseMimeType: "application/json" },
    });
    return JSON.parse(response.text);
  }, { label: "gemini:write" });
}
