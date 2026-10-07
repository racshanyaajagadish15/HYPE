import { readFileSync } from "node:fs";
import Groq from "groq-sdk";
import "../env.js";
import { DESCRIBE_INSTRUCTIONS } from "./prompts.js";
import { withRetry, describeInBatches } from "./retry.js";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const TEXT_MODEL = process.env.GROQ_TEXT_MODEL ?? "llama-3.3-70b-versatile";
const VISION_MODEL = process.env.GROQ_VISION_MODEL ?? "qwen/qwen3.6-27b";

// Groq's vision model hard-caps requests at 3 images — confirmed live ("Too
// many images provided. This model supports up to 3 images"), so photos are
// described in chunks of 3.
const CHUNK_SIZE = 3;

export function describePhotos(photos) {
  return describeInBatches(photos, CHUNK_SIZE, 2, describeChunk, "groq:describe");
}

async function describeChunk(chunk) {
  const content = [];
  for (const photo of chunk) {
    const data = readFileSync(photo.absolutePath).toString("base64");
    content.push({ type: "text", text: `Photo id: ${photo.id}` });
    content.push({ type: "image_url", image_url: { url: `data:${photo.mimeType ?? "image/jpeg"};base64,${data}` } });
  }
  content.push({
    type: "text",
    text: `${DESCRIBE_INSTRUCTIONS}
Describe each of the ${chunk.length} photo(s) above.
Respond with strict JSON: {"photos": [{"id": "<id>", "setting": "...", "what": "...", "people": 0, "light": "...", "quality": 1, "focusX": 50, "focusY": 40}]}`,
  });
  const completion = await groq.chat.completions.create({
    model: VISION_MODEL,
    messages: [{ role: "user", content }],
    temperature: 0.4,
    response_format: { type: "json_object" },
  });
  return JSON.parse(completion.choices[0].message.content).photos ?? [];
}

export function writeJson(prompt, { temperature = 1 } = {}) {
  return withRetry(async () => {
    const completion = await groq.chat.completions.create({
      model: TEXT_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature,
      response_format: { type: "json_object" },
    });
    return JSON.parse(completion.choices[0].message.content);
  }, { label: "groq:write" });
}
