import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = new URL("./.env", import.meta.url);
process.loadEnvFile(ENV_PATH);

// Tokens obtained through the in-app OAuth flows are persisted to .env (same
// place the CLI login scripts write them) and applied to process.env so the
// running server picks them up without a restart.
export function saveEnvVar(key, value) {
  const lines = readFileSync(ENV_PATH, "utf8").split("\n").filter(Boolean);
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (value == null) {
    if (idx >= 0) lines.splice(idx, 1);
    delete process.env[key];
  } else {
    if (idx >= 0) lines[idx] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
    process.env[key] = value;
  }
  writeFileSync(ENV_PATH, lines.join("\n") + "\n");
}
