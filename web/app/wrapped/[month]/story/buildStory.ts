import type { Story, Slide } from "./design";

type Photo = { id: string; filename: string; createTime?: string };
type Moment = { id: string; caption: string };
type Track = { id: string; name: string; artists: { name: string }[]; album?: { images?: { url: string }[] } };
type Artist = { id: string; name: string };
type MonthRecord = {
  month: string;
  photos: Photo[];
  music: { topTracks: Track[]; topArtists: Artist[] } | null;
  narrative: string | null;
  coverPhotoId: string | null;
  moments: Moment[];
  moods: string[];
};

function shortDate(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "2-digit" });
}

// The design's "note" slide is sized for one punchy line (DEFAULT_STORY's
// example: "pretty solid month."), not the full 60-80 word narrative
// paragraph — so take just the first clause rather than the whole thing.
function tagline(narrative: string) {
  const first = narrative.split(/(?<=[.!?])\s/)[0] || narrative;
  const trimmed = first.replace(/[.!?]+$/, "").trim();
  return (trimmed.length > 70 ? trimmed.slice(0, 67).trim() + "…" : trimmed) + ".";
}

export function buildStory(record: MonthRecord, month: string): Story {
  const [y, m] = month.split("-").map(Number);
  const monthName = new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
  const daysInMonth = new Date(y, m, 0).getDate();
  const periodLabel = `01 — ${daysInMonth} ${monthName.toUpperCase()} ${y}`;
  const vol = String(m).padStart(2, "0");

  const photoUrl = (id: string) => `/api/months/${month}/photos/${id}`;

  const momentPhotos = record.moments
    .map((mo) => ({ moment: mo, photo: record.photos.find((p) => p.id === mo.id) }))
    .filter((x): x is { moment: Moment; photo: Photo } => !!x.photo);

  const coverPhoto = record.photos.find((p) => p.id === record.coverPhotoId) ?? record.photos[0];
  const secondPhoto = momentPhotos[1]?.photo ?? record.photos[1] ?? coverPhoto;

  const slides: Slide[] = [];

  slides.push({
    type: "cover",
    title: `Your\n${monthName}\nRecap`,
    subtitle: "the rewind",
    src: coverPhoto ? photoUrl(coverPhoto.id) : undefined,
    src2: secondPhoto ? photoUrl(secondPhoto.id) : undefined,
    meta: `Vol. ${vol}`,
  });

  if (record.photos.length > 0) {
    slides.push({
      type: "stat",
      kicker: "you captured",
      value: String(record.photos.length),
      unit: "moments captured",
      caption: "okay you were BUSY",
      src: coverPhoto ? photoUrl(coverPhoto.id) : undefined,
      light: true,
    });
  }

  const first = momentPhotos[0];
  const last = momentPhotos.length > 1 ? momentPhotos[momentPhotos.length - 1] : undefined;
  const middle = momentPhotos.slice(1, last ? -1 : undefined);

  if (first) {
    slides.push({ type: "photo", src: photoUrl(first.photo.id), meta: shortDate(first.photo.createTime), caption: first.moment.caption });
  }

  if (middle.length > 0) {
    slides.push({
      type: "mosaic",
      kicker: "The month, in frames",
      meta: `0${middle.length} of ${record.photos.length} shown`,
      tiles: middle.map((x) => ({ src: photoUrl(x.photo.id), meta: shortDate(x.photo.createTime), caption: x.moment.caption })),
    });
  }

  if (record.moods?.length > 0) {
    slides.push({
      type: "chips",
      kicker: "listening moods",
      head: "Your month in moods",
      note: "yeah, this checks out",
      light: true,
      items: record.moods,
    });
  }

  const topTrack = record.music?.topTracks?.[0];
  if (topTrack) {
    slides.push({
      type: "track",
      kicker: "your #1 track",
      title: topTrack.name,
      artist: topTrack.artists.map((a) => a.name).join(", "),
      art: topTrack.album?.images?.[0]?.url,
      embed: `https://open.spotify.com/embed/track/${topTrack.id}`,
    });
  }

  if (record.music?.topTracks?.length) {
    slides.push({
      type: "list",
      kicker: "top five",
      head: "On repeat",
      note: `ranked by plays, ${monthName.slice(0, 3)} ${y}`,
      light: true,
      items: record.music.topTracks.slice(0, 5).map((t) => ({ title: t.name, sub: t.artists.map((a) => a.name).join(", ") })),
    });
  }

  if (last) {
    slides.push({ type: "photo", src: photoUrl(last.photo.id), meta: shortDate(last.photo.createTime), caption: last.moment.caption });
  }

  if (record.narrative) {
    slides.push({ type: "note", kicker: "the wrap-up", text: tagline(record.narrative), sign: "HYPE", light: true });
  }

  slides.push({
    type: "outro",
    kicker: "that's a wrap",
    title: "That's\na wrap.",
    caption: "see you next month",
    share: "Share my recap",
    stats: [`${daysInMonth} days`, `${record.photos.length} moments`, "1 month"],
  });

  return {
    id: month,
    handle: "@you",
    brand: "HYPE",
    periodLabel,
    slides,
  };
}
