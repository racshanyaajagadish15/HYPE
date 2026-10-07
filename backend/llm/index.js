import "../env.js";
import { isServiceError, shortError } from "./retry.js";

// LLM_PROVIDER picks the primary; if it's down, overloaded or out of quota
// and the other provider has a key, the same call is retried there.
const PRIMARY = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase() === "groq" ? "groq" : "gemini";
const SECONDARY = PRIMARY === "groq" ? "gemini" : "groq";
const KEY = { gemini: "GEMINI_API_KEY", groq: "GROQ_API_KEY" };
const load = (name) => (name === "groq" ? import("./groq.js") : import("./gemini.js"));

const primary = await load(PRIMARY);
let secondary = null;
// After the primary fails, skip it for a while instead of re-paying its
// retries on every call of the same curation.
const COOLDOWN_MS = 5 * 60_000;
let primaryDownUntil = 0;

function withFallback(fn) {
  return async (...args) => {
    const canFallBack = !!process.env[KEY[SECONDARY]];
    if (canFallBack && Date.now() < primaryDownUntil) {
      secondary ??= await load(SECONDARY);
      return secondary[fn](...args);
    }
    try {
      return await primary[fn](...args);
    } catch (err) {
      if (!isServiceError(err) || !canFallBack) throw err;
      primaryDownUntil = Date.now() + COOLDOWN_MS;
      console.warn(`[llm] ${PRIMARY} unavailable (${shortError(err)}); using ${SECONDARY} for the next ${COOLDOWN_MS / 60_000} min`);
      secondary ??= await load(SECONDARY);
      return secondary[fn](...args);
    }
  };
}

// describePhotos(photos) → [{ id, setting, what, people, light, quality }]
export const describePhotos = withFallback("describePhotos");
// writeJson(prompt, { temperature }) → parsed JSON object
export const writeJson = withFallback("writeJson");
