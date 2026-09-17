import { createServer } from "node:http";
import { exec } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

const ENV_PATH = new URL("../.env", import.meta.url);
process.loadEnvFile(ENV_PATH);

const REDIRECT_URI = "http://127.0.0.1:3000";
const SCOPE = "user-top-read user-read-recently-played";
const state = randomBytes(8).toString("hex");

const authUrl = new URL("https://accounts.spotify.com/authorize");
authUrl.search = new URLSearchParams({
  response_type: "code",
  client_id: process.env.SPOTIFY_CLIENT_ID,
  scope: SCOPE,
  redirect_uri: REDIRECT_URI,
  state,
}).toString();

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

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    res.end("Token exchange failed. Check the terminal.");
    console.error(tokens);
    server.close();
    return;
  }

  const env = readFileSync(ENV_PATH, "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("SPOTIFY_ACCESS_TOKEN=") && !line.startsWith("SPOTIFY_REFRESH_TOKEN="));
  env.push(`SPOTIFY_ACCESS_TOKEN=${tokens.access_token}`);
  env.push(`SPOTIFY_REFRESH_TOKEN=${tokens.refresh_token}`);
  writeFileSync(ENV_PATH, env.join("\n") + "\n");

  res.end("Logged in. You can close this tab.");
  console.log("Saved SPOTIFY_ACCESS_TOKEN and SPOTIFY_REFRESH_TOKEN to .env");
  server.close();
});

server.listen(3000, () => {
  console.log("Opening browser for Spotify login...");
  exec(`start "" "${authUrl}"`);
});
