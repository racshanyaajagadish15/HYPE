"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./story.module.css";
import { Star, Squiggle, Arrow, ScribbleCircle } from "./Doodles";

type Photo = { id: string; filename: string };
type Moment = { id: string; caption: string };
type Track = { id: string; name: string; artists: { name: string }[] };
type Artist = { id: string; name: string };
type MonthRecord = {
  month: string;
  photos: Photo[];
  music: { topTracks: Track[]; topArtists: Artist[] } | null;
  narrative: string | null;
  moments: Moment[];
  moods: string[];
};

type Slide =
  | { kind: "title"; monthName: string }
  | { kind: "hype"; text: string; sub?: string }
  | { kind: "moment"; photo: Photo; caption: string }
  | { kind: "moods"; moods: string[] }
  | { kind: "track"; track: Track }
  | { kind: "artist"; artist: Artist }
  | { kind: "narrative"; text: string }
  | { kind: "end" };

const SLIDE_SECONDS = 5;

export default function StoryPage() {
  const { month } = useParams<{ month: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    fetch(`/api/months/${month}`)
      .then((r) => r.json())
      .then(setRecord);
  }, [month]);

  const slides: Slide[] = useMemo(() => {
    if (!record) return [];
    const [y, m] = record.month.split("-");
    const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

    const list: Slide[] = [{ kind: "title", monthName }];

    const momentPhotos = record.moments
      .map((mo) => ({ moment: mo, photo: record.photos.find((p) => p.id === mo.id) }))
      .filter((x): x is { moment: Moment; photo: Photo } => !!x.photo);
    const source =
      momentPhotos.length > 0
        ? momentPhotos.map((x) => ({ photo: x.photo, caption: x.moment.caption }))
        : record.photos.slice(0, 6).map((p) => ({ photo: p, caption: "" }));

    if (source.length > 0) {
      list.push({ kind: "hype", text: "Let's relive the moments", sub: "👀" });
      for (const s of source) list.push({ kind: "moment", photo: s.photo, caption: s.caption });
    }

    if (record.moods?.length > 0) {
      list.push({ kind: "moods", moods: record.moods });
    }

    if (record.music?.topTracks?.[0] || record.music?.topArtists?.[0]) {
      list.push({ kind: "hype", text: "Ready to see your top listens?", sub: "🎧" });
      if (record.music.topTracks[0]) list.push({ kind: "track", track: record.music.topTracks[0] });
      if (record.music.topArtists[0]) list.push({ kind: "artist", artist: record.music.topArtists[0] });
    }

    if (record.narrative) {
      list.push({ kind: "hype", text: "The full recap", sub: "📝" });
      list.push({ kind: "narrative", text: record.narrative });
    }
    list.push({ kind: "end" });
    return list;
  }, [record]);

  const goTo = (i: number) => {
    setIndex(Math.max(0, Math.min(slides.length - 1, i)));
    setProgress(0);
  };
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Auto-advance with a filling progress bar, like a Stories UI — but every
  // slide still has explicit Next/Prev buttons since click-to-advance was
  // the actual ask, this is just extra trailer-style pacing on top.
  useEffect(() => {
    if (slides.length === 0 || index >= slides.length - 1) return;
    setProgress(0);
    const started = Date.now();
    tickRef.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - started) / (SLIDE_SECONDS * 1000)) * 100);
      setProgress(pct);
      if (pct >= 100) next();
    }, 50);
    return () => clearInterval(tickRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!record || slides.length === 0) {
    return (
      <div className={styles.stage}>
        <div className={styles.content}>
          <p className={styles.body}>Loading...</p>
        </div>
      </div>
    );
  }

  const slide = slides[index];

  return (
    <div className={styles.stage}>
      <div className={styles.progressRow}>
        {slides.map((_, i) => (
          <div key={i} className={styles.progressSeg}>
            <div className={styles.progressFill} style={{ width: `${i < index ? 100 : i === index ? progress : 0}%` }} />
          </div>
        ))}
      </div>

      <div className={styles.tapZones}>
        <div className={styles.tapZone} onClick={prev} />
        <div className={styles.tapZone} onClick={next} />
      </div>

      <div className={styles.content} key={index}>
        {slide.kind === "title" && (
          <>
            <Squiggle style={{ marginBottom: -6 }} />
            <p className={styles.eyebrow}>Your Year, Loud &amp; Clear</p>
            <h1 className={`${styles.headline} ${styles.headlineXl}`}>
              {slide.monthName}
              <br />
              Wrapped
            </h1>
            <Star style={{ position: "absolute", top: "18%", right: "12%" }} />
            <p className={styles.body}>Tap anywhere to start →</p>
          </>
        )}

        {slide.kind === "hype" && (
          <>
            <ScribbleCircle className={styles.doodle} style={{ top: "20%" }} />
            <h1 className={`${styles.headline} ${styles.headlineLg} ${styles.wiggle}`}>{slide.text}</h1>
            {slide.sub && <p style={{ fontSize: "2.5rem" }}>{slide.sub}</p>}
          </>
        )}

        {slide.kind === "moment" && (
          <>
            <div className={styles.photoWrap}>
              <div className={styles.tape} />
              <img src={`/api/months/${month}/photos/${slide.photo.id}`} alt={slide.photo.filename} />
            </div>
            {slide.caption && <p className={styles.caption}>{slide.caption}</p>}
          </>
        )}

        {slide.kind === "moods" && (
          <>
            <p className={styles.eyebrow}>You were feeling these moods</p>
            <div className={styles.moodGrid}>
              {slide.moods.map((mood, i) => (
                <span key={mood} className={styles.moodTag} style={{ ["--tilt" as any]: `${i % 2 === 0 ? -3 : 3}deg` }}>
                  {mood}
                </span>
              ))}
            </div>
          </>
        )}

        {slide.kind === "track" && (
          <>
            <Arrow style={{ position: "absolute", top: "14%", left: "14%" }} />
            <p className={styles.eyebrow}>🎵 Your Top Track</p>
            <h2 className={`${styles.headline} ${styles.headlineMd}`}>{slide.track.name}</h2>
            <iframe
              className={styles.spotifyEmbed}
              src={`https://open.spotify.com/embed/track/${slide.track.id}`}
              height="152"
              allow="encrypted-media"
              title="Top track"
            />
          </>
        )}

        {slide.kind === "artist" && (
          <>
            <p className={styles.eyebrow}>⭐ Your Top Artist</p>
            <h2 className={`${styles.headline} ${styles.headlineMd}`}>{slide.artist.name}</h2>
            <iframe
              className={styles.spotifyEmbed}
              src={`https://open.spotify.com/embed/artist/${slide.artist.id}`}
              height="152"
              allow="encrypted-media"
              title="Top artist"
            />
          </>
        )}

        {slide.kind === "narrative" && (
          <div className={styles.card}>
            <p className={styles.body}>{slide.text}</p>
          </div>
        )}

        {slide.kind === "end" && (
          <>
            <h1 className={`${styles.headline} ${styles.headlineLg}`}>That&apos;s a wrap!</h1>
            <Squiggle width={140} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
              <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => goTo(0)}>
                ↺ Replay
              </button>
              <button className={styles.btn} onClick={() => router.push(`/wrapped/${month}`)}>
                🎬 Get Video Version
              </button>
            </div>
          </>
        )}
      </div>

      <div className={styles.controls}>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={prev} disabled={index === 0}>
          ← Back
        </button>
        <Link href={`/wrapped/${month}`} className={`${styles.btn} ${styles.btnGhost}`}>
          Exit
        </Link>
        {slide.kind !== "end" && (
          <button className={styles.btn} onClick={next}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
