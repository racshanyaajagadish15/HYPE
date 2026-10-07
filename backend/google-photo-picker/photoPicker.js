import { saveEnvVar } from "../env.js";

export async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // A revoked/expired refresh token can't recover — drop it so the app
    // shows the source as disconnected and the next Connect re-runs OAuth.
    if (body.includes("invalid_grant")) {
      saveEnvVar("GOOGLE_REFRESH_TOKEN", null);
      throw new Error("Your Google login expired. Press Connect to sign in again.");
    }
    throw new Error(`Refresh error ${res.status}: ${body}`);
  }
  return (await res.json()).access_token;
}

async function callPicker(path, options = {}) {
  const access_token = await getAccessToken();
  const res = await fetch(`https://photospicker.googleapis.com/v1${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${access_token}`, ...options.headers },
  });
  if (!res.ok) throw new Error(`Photo Picker API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const createSession = () => callPicker("/sessions", { method: "POST" });
export const getSession = (sessionId) => callPicker(`/sessions/${sessionId}`);

export async function listAllMediaItems(sessionId) {
  const items = [];
  let pageToken;
  do {
    const params = new URLSearchParams({ sessionId, pageSize: "100" });
    if (pageToken) params.set("pageToken", pageToken);
    const page = await callPicker(`/mediaItems?${params}`);
    items.push(...(page.mediaItems ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);
  return items;
}
