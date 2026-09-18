process.loadEnvFile(new URL("../.env", import.meta.url));

const PROVIDER = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
const impl = PROVIDER === "groq" ? await import("./groq.js") : await import("./gemini.js");

export const generateNarrative = impl.generateNarrative;
export const pickHighlights = impl.pickHighlights;
export const generateMoods = impl.generateMoods;
