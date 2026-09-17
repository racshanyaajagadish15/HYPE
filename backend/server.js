import { createServer } from "node:http";
import { createReadStream, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getRecentlyPlayed, getTopArtists, getTopTracks } from "./spotify/spotify.js";
import { createSession, getSession, listAllMediaItems, getAccessToken } from "./google-photo-picker/photoPicker.js";
import { readMonth, writeMonth, listMonths, PHOTOS_DIR } from "./months.js";
import { generateNarrative, pickCoverPhoto } from "./gemini/gemini.js";
import { buildMontage } from "./montage/buildMontage.js";

const PORT = 3001;

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body ? JSON.parse(body) : {}));
    req.on("error", reject);
  });
}

function extFromMimeType(mimeType) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

async function finalizeMonthPhotos(month, sessionId) {
  const items = await listAllMediaItems(sessionId);
  const access_token = await getAccessToken();
  const monthDir = path.join(PHOTOS_DIR, month);
  mkdirSync(monthDir, { recursive: true });

  const photos = [];
  for (const item of items) {
    const imageRes = await fetch(`${item.mediaFile.baseUrl}=w1080`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!imageRes.ok) throw new Error(`Failed to download photo ${item.id}: ${imageRes.status}`);
    const mimeType = imageRes.headers.get("content-type") ?? "image/jpeg";
    const absolutePath = path.join(monthDir, `${item.id}.${extFromMimeType(mimeType)}`);
    writeFileSync(absolutePath, Buffer.from(await imageRes.arrayBuffer()));
    photos.push({ id: item.id, filename: item.mediaFile.filename, absolutePath, mimeType, createTime: item.createTime });
  }

  return writeMonth(month, { photos });
}

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const parts = url.pathname.split("/").filter(Boolean);

  try {
    if (url.pathname === "/api/recently-played") {
      return sendJson(res, 200, await getRecentlyPlayed());
    }
    if (url.pathname === "/api/top-artists") {
      return sendJson(res, 200, await getTopArtists());
    }

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
      if (parts.length === 3 && req.method === "GET") {
        return sendJson(res, 200, readMonth(month));
      }
      if (parts.length === 5 && parts[3] === "photos" && parts[4] === "finalize" && req.method === "POST") {
        const { sessionId } = await readJsonBody(req);
        return sendJson(res, 200, await finalizeMonthPhotos(month, sessionId));
      }
      if (parts.length === 5 && parts[3] === "photos" && req.method === "GET") {
        const record = readMonth(month);
        const photo = record.photos.find((p) => p.id === parts[4]);
        if (!photo) return sendJson(res, 404, { error: "photo not found" });
        res.writeHead(200, { "Content-Type": photo.mimeType ?? "image/jpeg" });
        return createReadStream(photo.absolutePath).pipe(res);
      }
      if (parts.length === 5 && parts[3] === "music" && parts[4] === "snapshot" && req.method === "POST") {
        const [topTracks, topArtists] = await Promise.all([getTopTracks(), getTopArtists()]);
        return sendJson(res, 200, writeMonth(month, { music: { topTracks: topTracks.items, topArtists: topArtists.items } }));
      }
      if (parts.length === 4 && parts[3] === "narrative" && req.method === "POST") {
        const record = readMonth(month);
        const narrative = await generateNarrative({
          month,
          topTracks: record.music?.topTracks ?? [],
          topArtists: record.music?.topArtists ?? [],
          photoCount: record.photos.length,
        });
        const coverPhotoId = await pickCoverPhoto({ photos: record.photos });
        return sendJson(res, 200, writeMonth(month, { narrative, coverPhotoId }));
      }
      if (parts.length === 4 && parts[3] === "montage") {
        if (req.method === "POST") {
          const record = readMonth(month);
          if (record.photos.length === 0) return sendJson(res, 400, { error: "No photos selected for this month yet" });
          const montagePath = await buildMontage(record);
          return sendJson(res, 200, writeMonth(month, { montagePath }));
        }
        if (req.method === "GET") {
          const record = readMonth(month);
          if (!record.montagePath || !existsSync(record.montagePath)) return sendJson(res, 404, { error: "Montage not generated yet" });
          res.writeHead(200, {
            "Content-Type": "video/mp4",
            "Content-Disposition": `attachment; filename="${month}-wrapped.mp4"`,
          });
          return createReadStream(record.montagePath).pipe(res);
        }
      }
    }

    sendJson(res, 404, { error: "not found" });
  } catch (err) {
    sendJson(res, 500, { error: err.message });
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
