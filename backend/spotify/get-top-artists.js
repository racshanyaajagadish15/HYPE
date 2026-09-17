import { getTopArtists } from "./spotify.js";
console.log(JSON.stringify(await getTopArtists(), null, 2));
