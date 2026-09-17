process.loadEnvFile(new URL("../.env", import.meta.url));

const artistId = process.argv[2] ?? "4Z8W4fKeB5YxbusRsdQVPb"; // Radiohead, default example

const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.SPOTIFY_CLIENT_ID,
    client_secret: process.env.SPOTIFY_CLIENT_SECRET,
  }),
});
if (!tokenRes.ok) throw new Error(`Token error ${tokenRes.status}: ${await tokenRes.text()}`);
const { access_token } = await tokenRes.json();

const artistRes = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
if (!artistRes.ok) throw new Error(`Spotify API error ${artistRes.status}: ${await artistRes.text()}`);

console.log(await artistRes.json());
