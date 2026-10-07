import { randomBytes } from "node:crypto";
import { saveEnvVar } from "./env.js";
import { isConfigured as stravaConfigured } from "./strava/strava.js";

// Redirect URIs must match what's registered with each provider:
// - Spotify: the Next app root; next.config.ts rewrites /?code=…&state=… to
//   /api/auth/spotify/callback on this server.
// - Google: a loopback port this server also listens on (see server.js).
// - Strava: only checks the callback *domain* (127.0.0.1), so any path works.
export const GOOGLE_CALLBACK_PORT = 3002;
const REDIRECT = {
  spotify: "http://127.0.0.1:3000",
  google: `http://127.0.0.1:${GOOGLE_CALLBACK_PORT}`,
  strava: "http://127.0.0.1:3000/api/auth/strava/callback",
};

const PROVIDERS = {
  spotify: {
    authUrl: "https://accounts.spotify.com/authorize",
    tokenUrl: "https://accounts.spotify.com/api/token",
    scope: "user-top-read user-read-recently-played",
    clientId: () => process.env.SPOTIFY_CLIENT_ID,
    clientSecret: () => process.env.SPOTIFY_CLIENT_SECRET,
    refreshKey: "SPOTIFY_REFRESH_TOKEN",
    label: "Spotify",
  },
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
    extra: { access_type: "offline", prompt: "consent" },
    clientId: () => process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshKey: "GOOGLE_REFRESH_TOKEN",
    label: "Google Photos",
  },
  strava: {
    authUrl: "https://www.strava.com/oauth/authorize",
    tokenUrl: "https://www.strava.com/oauth/token",
    scope: "activity:read_all",
    extra: { approval_prompt: "auto" },
    clientId: () => process.env.STRAVA_CLIENT_ID,
    clientSecret: () => process.env.STRAVA_CLIENT_SECRET,
    refreshKey: "STRAVA_REFRESH_TOKEN",
    label: "Strava",
  },
};

export function connections() {
  return {
    spotify: !!process.env.SPOTIFY_REFRESH_TOKEN,
    google: !!process.env.GOOGLE_REFRESH_TOKEN,
    strava: !!process.env.STRAVA_REFRESH_TOKEN,
    stravaConfigured: stravaConfigured(),
  };
}

// state → { provider, month, onConnected, expires }
const pending = new Map();
const STATE_TTL_MS = 15 * 60 * 1000;

export function authorizeUrl(provider, { month, onConnected }) {
  const p = PROVIDERS[provider];
  if (!p.clientId()) throw new Error(`${p.label} isn't configured on the server`);
  const state = randomBytes(12).toString("hex");
  pending.set(state, { provider, month, onConnected, expires: Date.now() + STATE_TTL_MS });
  const url = new URL(p.authUrl);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: p.clientId(),
    scope: p.scope,
    redirect_uri: REDIRECT[provider],
    state,
    ...p.extra,
  }).toString();
  return url.toString();
}

export function cancelPending(provider, month) {
  for (const [state, entry] of pending) {
    if (entry.provider === provider && entry.month === month) pending.delete(state);
  }
}

// Exchanges the code, stores the refresh token, then runs the entry's
// onConnected hook. Returns either { redirect } (continue the popup somewhere,
// e.g. the Photos picker) or { message } for a closing page.
export async function handleCallback(provider, params) {
  const state = params.get("state");
  const entry = pending.get(state);
  pending.delete(state);
  if (!entry || entry.provider !== provider || entry.expires < Date.now()) {
    throw new Error("This login link expired. Close this tab and press Connect again.");
  }
  if (params.get("error")) {
    entry.onConnected?.(new Error(`${PROVIDERS[provider].label} access was denied`));
    return { message: "No worries — nothing was connected. You can close this tab." };
  }

  const p = PROVIDERS[provider];
  const tokenRes = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.get("code"),
      redirect_uri: REDIRECT[provider],
      client_id: p.clientId(),
      client_secret: p.clientSecret(),
    }),
  });
  const tokens = await tokenRes.json();
  if (!tokenRes.ok) {
    const err = new Error(`${p.label} token exchange failed: ${tokens.error_description ?? tokens.error ?? tokenRes.status}`);
    entry.onConnected?.(err);
    throw err;
  }
  if (tokens.refresh_token) saveEnvVar(p.refreshKey, tokens.refresh_token);
  if (!process.env[p.refreshKey]) {
    const err = new Error(`${p.label} didn't return a refresh token`);
    entry.onConnected?.(err);
    throw err;
  }

  const next = await entry.onConnected?.(null);
  return next ?? { message: `${p.label} connected. You can close this tab.` };
}

export function popupPage(text, { ok = true } = {}) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>HYPE</title>
<style>html,body{margin:0;height:100%;background:#07060B;color:#F5F3FF;font:16px/1.5 system-ui,sans-serif}
body{display:grid;place-items:center;padding:24px;box-sizing:border-box;text-align:center}
b{display:block;font-size:28px;letter-spacing:-.02em;margin-bottom:8px;color:${ok ? "#FF4FD8" : "#FF8A8A"}}</style></head>
<body><div><b>${ok ? "✶" : "Hmm."}</b>${text.replace(/</g, "&lt;")}</div>
<script>${ok ? "setTimeout(function(){window.close()},900)" : ""}</script></body></html>`;
}
