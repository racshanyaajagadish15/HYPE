import { createServer } from "node:http";
import { exec } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = new URL("../.env", import.meta.url);
process.loadEnvFile(ENV_PATH);

const PORT = 3002;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";
const state = randomBytes(8).toString("hex");

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
  scope: SCOPE,
  redirect_uri: REDIRECT_URI,
  access_type: "offline",
  prompt: "consent",
  state,
}).toString();

function saveEnvVar(key, value) {
  const lines = readFileSync(ENV_PATH, "utf8").split("\n").filter(Boolean);
  const idx = lines.findIndex((l) => l.startsWith(`${key}=`));
  if (idx >= 0) lines[idx] = `${key}=${value}`;
  else lines.push(`${key}=${value}`);
  writeFileSync(ENV_PATH, lines.join("\n") + "\n");
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT_URI);
  if (url.pathname !== "/") return res.end();

  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (!code || returnedState !== state) {
    res.end("Auth failed: missing code or state mismatch. Check the terminal.");
    server.close();
    return;
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    res.end("Token exchange failed. Check the terminal.");
    console.error(tokens);
    server.close();
    return;
  }

  saveEnvVar("GOOGLE_ACCESS_TOKEN", tokens.access_token);
  if (tokens.refresh_token) saveEnvVar("GOOGLE_REFRESH_TOKEN", tokens.refresh_token);

  res.end("Logged in. You can close this tab.");
  console.log("Saved GOOGLE_ACCESS_TOKEN" + (tokens.refresh_token ? " and GOOGLE_REFRESH_TOKEN" : "") + " to .env");
  server.close();
});

server.listen(PORT, () => {
  console.log("Opening browser for Google login...");
  exec(`start "" "${authUrl}"`);
});
