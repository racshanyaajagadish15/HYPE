import { saveEnvVar } from "../env.js";

async function getAccessToken() {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
      client_id: process.env.SPOTIFY_CLIENT_ID,
      client_secret: process.env.SPOTIFY_CLIENT_SECRET,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    // A revoked/expired refresh token can't recover — drop it so the app
    // shows the source as disconnected and the next Connect re-runs OAuth.
    if (body.includes("invalid_grant")) {
      saveEnvVar("SPOTIFY_REFRESH_TOKEN", null);
      throw new Error("Your Spotify login expired. Press Connect to sign in again.");
    }
    throw new Error(`Refresh error ${res.status}: ${body}`);
  }
  return (await res.json()).access_token;
}

async function callSpotify(path) {
  const access_token = await getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error(`Spotify API error ${res.status}: ${await res.text()}`);
  return res.json();
}

export const getRecentlyPlayed = () => callSpotify("/me/player/recently-played");
export const getTopArtists = () => callSpotify("/me/top/artists");
export const getTopTracks = (timeRange = "short_term") => callSpotify(`/me/top/tracks?time_range=${timeRange}`);
