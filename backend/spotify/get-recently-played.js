import { getRecentlyPlayed } from "./spotify.js";
console.log(JSON.stringify(await getRecentlyPlayed(), null, 2));
