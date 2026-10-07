import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getTopArtists, getTopTracks } from "./spotify/spotify.js";
import { createSession, getSession, listAllMediaItems, getAccessToken as getGoogleToken } from "./google-photo-picker/photoPicker.js";
import { getActivities } from "./strava/strava.js";
import { readMonth, writeMonth, PHOTOS_DIR } from "./months.js";
import { authorizeUrl, cancelPending, connections } from "./oauth.js";

export const SOURCES = ["photos", "music", "strava"];
const PROVIDER_OF = { photos: "google", music: "spotify", strava: "strava" };

// In-flight work per month+source. A job is the "Connecting…" state in the
// builder: waiting on OAuth, waiting on the Photos picker, or syncing data.
// key → { phase: "auth" | "picker" | "sync" }
const jobs = new Map();
const errors = new Map();
const key = (month, source) => `${month}:${source}`;

function begin(month, source, phase) {
  const job = { phase };
  jobs.set(key(month, source), job);
  errors.delete(key(month, source));
  return job;
}
const isLive = (month, source, job) => jobs.get(key(month, source)) === job;

function finish(month, source, job, err) {
  if (!isLive(month, source, job)) return;
  jobs.delete(key(month, source));
  if (err) {
    console.error(`[${month}:${source}]`, err);
    errors.set(key(month, source), err.message);
  }
}

export function cancel(month, source) {
  jobs.delete(key(month, source));
  cancelPending(PROVIDER_OF[source], month);
}

export function sourceStatus(month) {
  const record = readMonth(month);
  const conn = connections();
  const done = {
    photos: record.photos.length > 0,
    music: !!record.music,
    strava: !!record.strava,
  };
  const detail = {
    photos: { count: record.photos.length },
    music: { count: record.music?.topTracks?.length ?? 0 },
    strava: { count: record.strava?.activities?.length ?? 0, kind: activityKind(record.strava?.activities ?? []) },
  };
  const out = {};
  for (const s of SOURCES) {
    const job = jobs.get(key(month, s));
    out[s] = {
      state: job ? "loading" : done[s] ? "done" : "idle",
      phase: job?.phase ?? null,
      progress: job?.progress ?? null,
      error: errors.get(key(month, s)) ?? null,
      authorized: conn[PROVIDER_OF[s]],
      ...detail[s],
    };
  }
  out.strava.configured = conn.stravaConfigured;
  return out;
}

export function activityKind(activities) {
  const types = new Set(activities.map((a) => a.sport_type ?? a.type));
  if (types.size === 1 && /Run$/.test([...types][0])) return "runs";
  if (types.size === 1 && /Ride$/.test([...types][0])) return "rides";
  return "activities";
}

// Starts connecting a source. Returns { redirect } when the browser popup
// has to go somewhere (provider login, Photos picker), else { started }.
export async function connect(month, source) {
  const conn = connections();
  if (source === "strava" && !conn.stravaConfigured) {
    throw new Error("Strava isn't set up yet — add STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET to backend/.env");
  }
  const authorized = conn[PROVIDER_OF[source]];

  if (source === "photos") {
    if (!authorized) {
      const job = begin(month, source, "auth");
      const redirect = authorizeUrl("google", {
        month,
        onConnected: async (err) => {
          if (err) return finish(month, source, job, err);
          if (!isLive(month, source, job)) return;
          return { redirect: await openPicker(month, job) };
        },
      });
      return { redirect };
    }
    const job = begin(month, source, "picker");
    return { redirect: await openPicker(month, job) };
  }

  const sync = source === "music" ? syncMusic : syncStrava;
  if (!authorized) {
    const job = begin(month, source, "auth");
    const redirect = authorizeUrl(PROVIDER_OF[source], {
      month,
      onConnected: (err) => {
        if (err) return finish(month, source, job, err);
        if (!isLive(month, source, job)) return;
        job.phase = "sync";
        sync(month).then(() => finish(month, source, job), (e) => finish(month, source, job, e));
      },
    });
    return { redirect };
  }
  const job = begin(month, source, "sync");
  sync(month).then(() => finish(month, source, job), (e) => finish(month, source, job, e));
  return { started: true };
}

// Creates a Photos picker session and watches it in the background; the
// popup is sent to the picker, which closes itself once the user is done
// ("/autoclose"). Picked photos are then downloaded into the month.
async function openPicker(month, job) {
  try {
    const session = await createSession();
    job.phase = "picker";
    watchPicker(month, job, session);
    return `${session.pickerUri}/autoclose`;
  } catch (err) {
    finish(month, "photos", job, err);
    throw err;
  }
}

async function watchPicker(month, job, session) {
  const pollMs = Math.max(1000, parseFloat(session.pollingConfig?.pollInterval ?? "3") * 1000);
  const deadline = Date.now() + Math.min(30 * 60_000, parseFloat(session.pollingConfig?.timeoutIn ?? "1800") * 1000);
  try {
    let current = session;
    while (!current.mediaItemsSet) {
      if (!isLive(month, "photos", job)) return;
      if (Date.now() > deadline) throw new Error("The photo picker timed out. Press Connect to try again.");
      await new Promise((r) => setTimeout(r, pollMs));
      current = await getSession(session.id);
    }
    if (!isLive(month, "photos", job)) return;
    job.phase = "sync";
    const { failed, total } = await finalizeMonthPhotos(month, session.id, (i, n) => (job.progress = { done: i, total: n }));
    finish(month, "photos", job);
    if (failed) errors.set(key(month, "photos"), `Imported ${total - failed} of ${total} photos — Google rate-limited the rest. Press Connected ✓ to pick again.`);
  } catch (err) {
    finish(month, "photos", job, err);
  }
}

function extFromMimeType(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

// Google rate-limits media downloads (HTTP 429), so each photo is retried with
// backoff — honouring Retry-After when sent — and downloads are paced.
const DOWNLOAD_TRIES = 6;
const DOWNLOAD_GAP_MS = 150;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadPhoto(item, token) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${item.mediaFile.baseUrl}=w1080`, { headers: { Authorization: `Bearer ${token()}` } });
    if (res.ok) return res;
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= DOWNLOAD_TRIES) throw new Error(`HTTP ${res.status}`);
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Math.min(60_000, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 1000 * 2 ** attempt);
    console.warn(`[photos] ${res.status} on ${item.mediaFile.filename ?? item.id}; retry ${attempt}/${DOWNLOAD_TRIES - 1} in ${Math.round(wait / 1000)}s`);
    await sleep(wait);
  }
}

export async function finalizeMonthPhotos(month, sessionId, onProgress = () => {}) {
  const items = await listAllMediaItems(sessionId);
  let accessToken = await getGoogleToken();
  const monthDir = path.join(PHOTOS_DIR, month);
  mkdirSync(monthDir, { recursive: true });

  const photos = [];
  const failed = [];
  for (const [i, item] of items.entries()) {
    onProgress(i, items.length);
    try {
      let res;
      try {
        res = await downloadPhoto(item, () => accessToken);
      } catch (err) {
        // A long import can outlive the hour-long access token; refresh once.
        if (!/HTTP 401/.test(err.message)) throw err;
        accessToken = await getGoogleToken();
        res = await downloadPhoto(item, () => accessToken);
      }
      const mimeType = res.headers.get("content-type") ?? "image/jpeg";
      const absolutePath = path.join(monthDir, `${item.id}.${extFromMimeType(mimeType)}`);
      writeFileSync(absolutePath, Buffer.from(await res.arrayBuffer()));
      photos.push({ id: item.id, filename: item.mediaFile.filename, absolutePath, mimeType, createTime: item.createTime });
    } catch (err) {
      console.error(`[photos] giving up on ${item.mediaFile.filename ?? item.id}: ${err.message}`);
      failed.push(item);
    }
    await sleep(DOWNLOAD_GAP_MS);
  }

  if (photos.length === 0) {
    throw new Error(`Google Photos wouldn't send any of the ${items.length} photos (rate limited). Wait a minute and press Connect again.`);
  }
  // New photos invalidate the previous curation (its moments point at old ids).
  const record = writeMonth(month, { photos, story: null, narrative: null, coverPhotoId: null, moments: [], photoNotes: [] });
  return { record, failed: failed.length, total: items.length };
}

export async function syncMusic(month) {
  const [topTracks, topArtists] = await Promise.all([getTopTracks(), getTopArtists()]);
  return writeMonth(month, { music: { topTracks: topTracks.items, topArtists: topArtists.items } });
}

export async function syncStrava(month) {
  const [y, m] = month.split("-").map(Number);
  const after = Math.floor(new Date(y, m - 1, 1).getTime() / 1000);
  const before = Math.floor(new Date(y, m, 1).getTime() / 1000);
  const activities = (await getActivities(after, before)).map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    sport_type: a.sport_type,
    distance: a.distance,
    moving_time: a.moving_time,
    start_date_local: a.start_date_local,
    polyline: a.map?.summary_polyline ?? null,
  }));
  return writeMonth(month, { strava: { activities, fetchedAt: new Date().toISOString() } });
}
