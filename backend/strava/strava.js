import { saveEnvVar } from "../env.js";

export const isConfigured = () => !!(process.env.STRAVA_CLIENT_ID && process.env.STRAVA_CLIENT_SECRET);

// Strava access tokens last 6h and the refresh token can rotate on every
// refresh, so the newest one is written back to .env each time.
async function getAccessToken() {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.STRAVA_REFRESH_TOKEN,
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    if (res.status === 400 || res.status === 401) saveEnvVar("STRAVA_REFRESH_TOKEN", null);
    throw new Error(`Strava refresh error ${res.status}: ${body}`);
  }
  const tokens = JSON.parse(body);
  if (tokens.refresh_token && tokens.refresh_token !== process.env.STRAVA_REFRESH_TOKEN) {
    saveEnvVar("STRAVA_REFRESH_TOKEN", tokens.refresh_token);
  }
  return tokens.access_token;
}

// All activities that started inside [after, before) — both unix seconds.
export async function getActivities(after, before) {
  const access_token = await getAccessToken();
  const activities = [];
  for (let page = 1; ; page++) {
    const params = new URLSearchParams({ after: String(after), before: String(before), per_page: "100", page: String(page) });
    const res = await fetch(`https://www.strava.com/api/v3/athlete/activities?${params}`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!res.ok) throw new Error(`Strava API error ${res.status}: ${await res.text()}`);
    const batch = await res.json();
    activities.push(...batch);
    if (batch.length < 100) return activities;
  }
}
