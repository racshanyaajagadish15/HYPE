import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import "./env.js";
import { getRecentlyPlayed, getTopArtists } from "./spotify/spotify.js";
import { createSession, getSession, listAllMediaItems, getAccessToken } from "./google-photo-picker/photoPicker.js";
import { readMonth, listMonths } from "./months.js";
import { connections, handleCallback, popupPage, GOOGLE_CALLBACK_PORT } from "./oauth.js";
import { SOURCES, sourceStatus, connect, cancel, finalizeMonthPhotos, syncMusic } from "./sources.js";
import { curateStatus, startCurate } from "./curate.js";

const PORT = Number(process.env.PORT ?? 3001);
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendHtml(res, status, html) {
  res.writeHead(status, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

async function oauthCallback(res, provider, params) {
  try {
    const result = await handleCallback(provider, params);
    if (result.redirect) return redirect(res, result.redirect);
    return sendHtml(res, 200, popupPage(result.message));
  } catch (err) {
    return sendHtml(res, 400, popupPage(err.message, { ok: false }));
  }
}

createServer(async (req, res) => {
  // A client disconnecting mid-request (proxy timeout, closed tab, aborted
  // curl) fires an 'error' on the socket; unhandled, that's an uncaught
  // exception that kills the whole process, not just this request.
  req.on("error", () => {});
  res.on("error", () => {});

  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (url.pathname === "/api/recently-played") {
      return sendJson(res, 200, await getRecentlyPlayed());
    }
    if (url.pathname === "/api/top-artists") {
      return sendJson(res, 200, await getTopArtists());
    }
    if (url.pathname === "/api/connections") {
      return sendJson(res, 200, connections());
    }

    // OAuth callbacks (Spotify arrives here via the Next rewrite of /?code=…)
    if (url.pathname === "/api/auth/spotify/callback") return oauthCallback(res, "spotify", url.searchParams);
    if (url.pathname === "/api/auth/strava/callback") return oauthCallback(res, "strava", url.searchParams);

    if (url.pathname === "/api/photos/session" && req.method === "POST") {
      return sendJson(res, 200, await createSession());
    }
    if (url.pathname.startsWith("/api/photos/session/")) {
      const sessionId = url.pathname.split("/").pop();
      return sendJson(res, 200, await getSession(sessionId));
    }
    if (url.pathname.startsWith("/api/photos/items/")) {
      const sessionId = url.pathname.split("/").pop();
      return sendJson(res, 200, { items: await listAllMediaItems(sessionId) });
    }
    if (url.pathname === "/api/photos/image") {
      const baseUrl = url.searchParams.get("url");
      const width = url.searchParams.get("w") ?? "400";
      const access_token = await getAccessToken();
      const imageRes = await fetch(`${baseUrl}=w${width}`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!imageRes.ok) return sendJson(res, imageRes.status, { error: await imageRes.text() });
      res.writeHead(200, { "Content-Type": imageRes.headers.get("content-type") ?? "image/jpeg" });
      return res.end(Buffer.from(await imageRes.arrayBuffer()));
    }

    // /api/months[...]
    if (parts[0] === "api" && parts[1] === "months") {
      const month = parts[2];

      if (parts.length === 2 && req.method === "GET") {
        return sendJson(res, 200, { months: listMonths() });
      }
      if (!MONTH_RE.test(month)) return sendJson(res, 400, { error: "month must look like YYYY-MM" });

      if (parts.length === 3 && req.method === "GET") {
        return sendJson(res, 200, readMonth(month));
      }

      // Builder: source connections
      if (parts[3] === "sources") {
        if (parts.length === 4 && req.method === "GET") return sendJson(res, 200, sourceStatus(month));
        const source = parts[4];
        if (!SOURCES.includes(source)) return sendJson(res, 404, { error: "unknown source" });
        if (parts[5] === "connect") {
          // GET is opened in a popup (follows redirects to login / picker);
          // POST is used when no popup is needed (already authorized).
          if (req.method === "GET") {
            try {
              const result = await connect(month, source);
              if (result.redirect) return redirect(res, result.redirect);
              return sendHtml(res, 200, popupPage("Connected. You can close this tab."));
            } catch (err) {
              return sendHtml(res, 400, popupPage(err.message, { ok: false }));
            }
          }
          if (req.method === "POST") return sendJson(res, 200, await connect(month, source));
        }
        if (parts[5] === "cancel" && req.method === "POST") {
          cancel(month, source);
          return sendJson(res, 200, sourceStatus(month));
        }
      }

      // Builder: AI curation
      if (parts.length === 4 && parts[3] === "curate") {
        if (req.method === "GET") return sendJson(res, 200, curateStatus(month));
        if (req.method === "POST") return sendJson(res, 200, startCurate(month));
      }

      if (parts.length === 5 && parts[3] === "photos" && parts[4] === "finalize" && req.method === "POST") {
        const { sessionId } = await readJsonBody(req);
        return sendJson(res, 200, (await finalizeMonthPhotos(month, sessionId)).record);
      }
      if (parts.length === 5 && parts[3] === "photos" && req.method === "GET") {
        const record = readMonth(month);
        const photo = record.photos.find((p) => p.id === parts[4]);
        if (!photo) return sendJson(res, 404, { error: "photo not found" });
        res.writeHead(200, { "Content-Type": photo.mimeType ?? "image/jpeg", "Cache-Control": "private, max-age=86400" });
        return createReadStream(photo.absolutePath).pipe(res);
      }
      if (parts.length === 5 && parts[3] === "music" && parts[4] === "snapshot" && req.method === "POST") {
        return sendJson(res, 200, await syncMusic(month));
      }
    }

    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));

// Google's registered OAuth redirect is this loopback port, so it gets its
// own tiny listener that only handles the callback.
createServer(async (req, res) => {
  req.on("error", () => {});
  res.on("error", () => {});
  const url = new URL(req.url, "http://localhost");
  if (url.pathname !== "/" || !url.searchParams.get("state")) return sendJson(res, 404, { error: "not found" });
  return oauthCallback(res, "google", url.searchParams);
})
  .on("error", (err) => console.error(`Google OAuth callback listener failed on :${GOOGLE_CALLBACK_PORT}:`, err.message))
  .listen(GOOGLE_CALLBACK_PORT, "127.0.0.1");
