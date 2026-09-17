process.loadEnvFile(new URL("../.env", import.meta.url));

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
  if (!res.ok) throw new Error(`Refresh error ${res.status}: ${await res.text()}`);
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
