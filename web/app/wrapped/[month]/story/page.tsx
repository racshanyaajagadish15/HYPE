"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";
import { HypeShell } from "../../../_components/HypeShell";
import { SmartPhoto, focusMap } from "../../../_components/SmartPhoto";
import { useSpotifySoundtrack } from "../../../_components/useSpotifySoundtrack";
import { SiteNav } from "../../../_components/SiteNav";
import "./story.css";

type Photo = { id: string; createTime?: string };
type Track = { id: string; name: string; duration_ms?: number; artists: { name: string }[]; album?: { images?: { url: string; width?: number }[] } };
type Activity = { distance?: number; polyline?: string | null; sport_type?: string; type?: string };
type StoryDoc = {
  hero: { id: string; trackId: string | null; setting: string; caption: string };
  booth: { ids: string[]; headline: string; sticker: string } | null;
  golden: { id: string; setting: string; caption: string } | null;
  moments: { id: string; trackId: string | null; caption: string }[];
  song: { trackId: string; note: string } | null;
  strava: { lead: string; word: string } | null;
  outro: { story: string[]; signoff: string; tagline: string };
};
type MonthRecord = {
  month: string;
  photos: Photo[];
  music: { topTracks: Track[] } | null;
  strava?: { activities: Activity[] } | null;
  story?: StoryDoc | null;
  photoNotes?: { id: string; focusX?: number; focusY?: number }[];
};
type SlideKey = "intro" | "cut" | "hero" | "booth" | "song" | "top" | "strava" | "golden" | "outro";

const PAL: [string, string][] = [["#FF4FD8", "#2A0B3D"], ["#3DF5FF", "#0B2A3D"], ["#FFE14D", "#3D1F0B"], ["#B06CFF", "#140B2E"], ["#3DF5FF", "#3A0F52"], ["#FF4FD8", "#0B2A3D"]];
const bgOf = (g: [string, string]) => `linear-gradient(160deg, ${g[0]}, ${g[1]})`;
const NEON = ["#FF4FD8", "#3DF5FF", "#FFE14D", "#B06CFF"];
const GLOW: Record<SlideKey, string> = { intro: "rgba(255,79,216,.28)", cut: "rgba(61,245,255,.22)", hero: "rgba(255,187,0,.24)", booth: "rgba(176,108,255,.3)", song: "rgba(61,245,255,.26)", top: "rgba(255,225,77,.2)", strava: "rgba(255,225,77,.24)", golden: "rgba(255,187,0,.26)", outro: "rgba(255,79,216,.3)" };
const HL: Record<string, string> = { pink: "rgba(255,79,216,.35)", gold: "rgba(255,187,0,.4)", cyan: "rgba(61,245,255,.45)" };
const EQ = [0, 0.3, 0.15, 0.45, 0.1];
// How long each slide stays up — long enough to actually hear its song
// (Spotify previews run ~30s). The song of the month gets the longest.
const SLIDE_MS: Record<SlideKey, number> = { intro: 9000, cut: 10000, hero: 14000, booth: 14000, song: 22000, top: 14000, strava: 14000, golden: 14000, outro: 14000 };
const DECOR_ROUTE = "M22 150 C 36 96, 84 126, 104 76 S 166 26, 180 78 S 150 172, 100 162 S 38 190, 22 150 Z";

const shortDay = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "2-digit" }) : "");
const clock = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase() : "");
const artistsOf = (t: Track) => t.artists.map((a) => a.name).join(", ");
const artOf = (t: Track | undefined, small = false) => {
  const imgs = t?.album?.images ?? [];
  return (small ? imgs[imgs.length - 1] : imgs[0])?.url;
};
const mmss = (ms?: number) => (ms ? `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}` : "");

// Google encoded polyline → [lat, lng][]
function decodePolyline(str: string) {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const which of [0, 1]) {
      let shift = 0, result = 0, b;
      do {
        b = str.charCodeAt(i++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (which === 0) lat += d;
      else lng += d;
    }
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

// Fits a route into the design's 200×200 viewBox, keeping its shape.
function routePath(polyline: string) {
  const pts = decodePolyline(polyline);
  if (pts.length < 2) return null;
  const k = Math.cos((pts[0][0] * Math.PI) / 180);
  const xy = pts.map(([la, ln]) => [ln * k, -la]);
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const s = 180 / Math.max(x1 - x0, y1 - y0, 1e-9);
  const ox = 10 + (180 - (x1 - x0) * s) / 2, oy = 10 + (180 - (y1 - y0) * s) / 2;
  const P = xy.map(([x, y]) => [ox + (x - x0) * s, oy + (y - y0) * s]);
  return { d: P.map((p, j) => `${j ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" "), start: P[0] };
}

// "{pink:rooftop}" markup → highlighted spans
function renderMarked(text: string): ReactNode[] {
  return text.split(/(\{\w+:[^{}]*\})/g).map((part, k) => {
    const m = part.match(/^\{(\w+):([^{}]*)\}$/);
    return m ? <span key={k} className="hs-hl" style={{ background: HL[m[1]] }}>{m[2]}</span> : part;
  });
}

export default function StoryPage() {
  const { month } = useParams<{ month: string }>();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/months/${month}`, { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        setRecord(data);
      })
      .catch((err) => setError(err.message));
  }, [month]);

  if (error || (record && !record.story)) {
    return (
      <HypeShell nav="story">
        <div style={{ display: "flex", flexDirection: "column", gap: 14, animation: "rise .5s ease both" }}>
          <h1 className="hb-h1">{error ? <>Can&apos;t load <span className="hb-accent">it</span></> : <>Not curated <span className="hb-accent">yet</span></>}</h1>
          <p className="hb-lede">{error || "This month doesn't have a story yet. Head back to the builder and hit Curate."}</p>
          <Link href={`/wrapped/${month}`} className="hb-cta is-live" style={{ alignSelf: "flex-start" }}>Open the builder</Link>
        </div>
      </HypeShell>
    );
  }
  if (!record) return <div className="hs-root"><StoryGate card loadingText="Loading your month…" /></div>;
  return <Player month={month} record={record} story={record.story!} />;
}

function Player({ month, record, story }: { month: string; record: MonthRecord; story: StoryDoc }) {
  const KEY = `hype-story-${month}`;
  const photos = new Map(record.photos.map((p) => [p.id, p]));
  const tracks = record.music?.topTracks ?? [];
  const trackById = (id: string | null | undefined) => tracks.find((t) => t.id === id);
  const activities = record.strava?.activities ?? [];
  const url = (id: string) => `/api/months/${month}/photos/${encodeURIComponent(id)}`;
  const focus = focusMap(record.photoNotes);
  const photo = (id: string, opts: { maxCrop?: number; fit?: "cover" } = {}) => <SmartPhoto src={url(id)} focus={focus.get(id)} {...opts} />;

  const booth = story.booth && story.booth.ids.every((id) => photos.has(id)) ? story.booth : null;
  const golden = story.golden && photos.has(story.golden.id) ? story.golden : null;
  const slides: SlideKey[] = [
    "intro", "cut", "hero",
    ...(booth ? ["booth" as const] : []),
    ...(tracks.length ? ["song" as const, "top" as const] : []),
    ...(story.strava && activities.length ? ["strava" as const] : []),
    ...(golden ? ["golden" as const] : []),
    "outro",
  ];
  const n = slides.length;

  const [i, setI] = useState(0);
  const [hold, setHold] = useState(false);
  const [btnPause, setBtnPause] = useState(false);
  // The story waits for its images, then starts — by itself if the browser
  // already allows sound (arrived via a click), else from the ▶ start screen.
  const [loaded, setLoaded] = useState({ done: 0, total: 0, ready: false });
  const [started, setStarted] = useState(false);
  const [toast, setToast] = useState(false);
  const [torn, setTorn] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const downRef = useRef<{ t: number; x: number; rect: DOMRect } | null>(null);

  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem(KEY) || "0", 10) || 0;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore once from storage on mount
      if (saved > 0 && saved < n) setI(saved);
    } catch {}
  }, [KEY, n]);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore the viewer's mute choice
      if (localStorage.getItem("hype-sound") === "off") setSoundOn(false);
    } catch {}
  }, []);
  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem("hype-sound", next ? "on" : "off");
    } catch {}
    if (next) soundKick();
  };

  useEffect(() => {
    const urls = [
      ...record.photos.map((p) => url(p.id)),
      ...tracks.slice(0, 5).flatMap((t) => [artOf(t), artOf(t, true)]).filter((u): u is string => !!u),
    ];
    let done = 0;
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      setLoaded({ done: urls.length, total: urls.length, ready: true });
      if (navigator.userActivation?.hasBeenActive) setStarted(true);
    };
    // Never hold the story hostage to one slow image.
    const cap = setTimeout(finish, 10_000);
    Promise.all(
      urls.map(
        (u) =>
          new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = img.onerror = () => {
              done++;
              if (!cancelled) setLoaded((l) => ({ ...l, done, total: urls.length }));
              resolve();
            };
            img.src = u;
          })
      )
    ).then(() => {
      clearTimeout(cap);
      finish();
    });
    return () => {
      cancelled = true;
      clearTimeout(cap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per story
  }, [month]);

  const go = useCallback(
    (j: number) => {
      const k = Math.max(0, Math.min(n - 1, j));
      setI(k);
      setTorn(false);
      try {
        localStorage.setItem(KEY, String(k));
      } catch {}
    },
    [KEY, n]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(i + 1);
      else if (e.key === "ArrowLeft") go(i - 1);
      else if (e.key === " ") {
        e.preventDefault();
        setBtnPause((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [i, go]);

  // Shrink [data-fit] text that would overflow the card (long captions/titles).
  const fit = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.querySelectorAll<HTMLElement>("[data-fit]").forEach((el) => {
      if (el.dataset.base == null) el.dataset.base = el.style.fontSize;
      el.style.fontSize = el.dataset.base;
      const max = card.clientWidth * (parseFloat(el.dataset.fit!) / 100);
      const w = el.scrollWidth;
      if (w > max) el.style.fontSize = ((parseFloat(getComputedStyle(el).fontSize) * max) / w).toFixed(2) + "px";
    });
  }, []);
  useLayoutEffect(() => {
    fit();
    const t = setTimeout(fit, 60);
    document.fonts?.ready.then(fit);
    return () => clearTimeout(t);
  }, [i, fit]);
  useEffect(() => {
    const card = cardRef.current;
    if (!card || !window.ResizeObserver) return;
    const ro = new ResizeObserver(fit);
    ro.observe(card);
    return () => ro.disconnect();
  }, [fit]);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    downRef.current = { t: Date.now(), x: e.clientX, rect: e.currentTarget.getBoundingClientRect() };
    setHold(true);
  };
  const onUp = () => {
    const d = downRef.current;
    if (!d) return;
    downRef.current = null;
    setHold(false);
    if (Date.now() - d.t < 260) go(i + (d.x - d.rect.left < d.rect.width * 0.3 ? -1 : 1));
  };

  async function share() {
    const href = window.location.href;
    setTorn(true);
    try {
      if (navigator.share) await navigator.share({ title: `My ${monthLong} HYPE`, url: href });
      else {
        await navigator.clipboard?.writeText(href);
        setToast(true);
        setTimeout(() => setToast(false), 1800);
      }
    } catch {}
  }

  const cur = slides[Math.min(i, n - 1)];
  const dur = SLIDE_MS[cur];
  const paused = hold || btnPause || !started;
  const [y, m] = month.split("-").map(Number);
  const mNum = String(m).padStart(2, "0");
  const monthLong = new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" });
  const monthShort = monthLong.slice(0, 3);
  const glow = GLOW[cur];

  // The #1 song is saved for its own slide. Every other slide gets a
  // different track: its curated pairing when that isn't the #1, otherwise the
  // next unused song from the top list (assigned in slide order, no repeats).
  const momentTrack = (id?: string) => story.moments.find((x) => x.id === id)?.trackId;
  const songId = story.song?.trackId ?? tracks[0]?.id;
  const others = tracks.map((t) => t.id).filter((id) => id !== songId);
  const preferred: Partial<Record<SlideKey, string | null | undefined>> = {
    cut: story.moments[0]?.trackId,
    hero: story.hero.trackId,
    booth: momentTrack(story.booth?.ids[0]),
    golden: momentTrack(story.golden?.id),
  };
  const used = new Set<string>();
  const SLIDE_TRACK = {} as Record<SlideKey, string | undefined>;
  for (const key of slides) {
    if (key === "song") {
      SLIDE_TRACK.song = songId;
      continue;
    }
    const want = preferred[key];
    const id = want && want !== songId && !used.has(want) ? want : others.find((t) => !used.has(t)) ?? others[0];
    if (id) used.add(id);
    SLIDE_TRACK[key] = id;
  }
  const slideTrack = SLIDE_TRACK[cur];
  const { hostRef: soundHostRef, state: soundState, kick: soundKick } = useSpotifySoundtrack(slideTrack, started && !btnPause && !!slideTrack, soundOn && tracks.length > 0);

  // ---- per-slide data --------------------------------------------------
  const heroPhoto = photos.get(story.hero.id);
  const heroTrack = trackById(SLIDE_TRACK.hero);
  const keep = new Set(story.moments.map((x) => x.id));
  const sorted = [...record.photos].sort((a, b) => (a.createTime ?? "").localeCompare(b.createTime ?? ""));
  const sheetPhotos = (() => {
    if (sorted.length <= 20) return sorted;
    const kept = sorted.filter((p) => keep.has(p.id));
    const rest = sorted.filter((p) => !keep.has(p.id));
    const picked = new Set([...kept, ...rest.filter((_, k) => k % Math.ceil(rest.length / Math.max(1, 20 - kept.length)) === 0)].slice(0, 20).map((p) => p.id));
    return sorted.filter((p) => picked.has(p.id));
  })();
  const rows = Math.max(1, Math.ceil(sheetPhotos.length / 5));
  const topSong = trackById(story.song?.trackId) ?? tracks[0];
  const top5 = tracks.slice(0, 5);
  const longest = activities.reduce<Activity | null>((a, b) => (!a || (b.distance ?? 0) > (a.distance ?? 0) ? b : a), null);
  const route = longest?.polyline ? routePath(longest.polyline) : null;
  const km = (mtr: number) => `${mtr >= 10_000 ? Math.round(mtr / 1000).toLocaleString("en-US") : (Math.round(mtr / 100) / 10).toString()} km`;
  const kind = (() => {
    const types = new Set(activities.map((a) => a.sport_type ?? a.type ?? ""));
    const only = types.size === 1 ? [...types][0] : "";
    return /Run$/.test(only) ? "Runs" : /Ride$/.test(only) ? "Rides" : "Activities";
  })();
  const goldenPhoto = golden ? photos.get(golden.id) : undefined;
  const boothFirst = booth ? photos.get(booth.ids[0]) : undefined;

  const mono = (extra: CSSProperties): CSSProperties => ({ fontFamily: "var(--f-mono)", ...extra });
  const syne = (extra: CSSProperties): CSSProperties => ({ fontFamily: "var(--f-syne)", fontWeight: 800, ...extra });
  const pad: CSSProperties = { position: "absolute", inset: 0, padding: "84px 7cqw 10cqw", boxSizing: "border-box", animation: "enter .6s ease both" };

  return (
    <div className="hs-root" data-slide={cur} data-track={slideTrack ?? ""}>
      {/* Spotify's embed only initialises once it's inside the viewport, so it sits
          in a corner, invisible and click-through, rather than off-screen. */}
      <div ref={soundHostRef} aria-hidden="true" style={{ position: "fixed", right: 0, bottom: 0, width: 300, height: 80, opacity: 0.01, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.5, backgroundImage: "radial-gradient(rgba(245,243,255,.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: `radial-gradient(60% 60% at 50% 50%, ${glow}, transparent 75%)`, transition: "background .8s ease" }} />

      <div
        ref={cardRef}
        data-card="1"
        style={{
          position: "relative", width: "min(100vw, calc(min(100vh - 32px, 920px) * .5625))", height: "min(100vh - 32px, 920px)", borderRadius: 28,
          overflow: "hidden", background: "#07060B", boxShadow: `0 0 0 1px rgba(245,243,255,.12), 0 40px 120px rgba(0,0,0,.8), 0 0 80px ${glow}`,
          containerType: "inline-size", transition: "box-shadow .8s ease",
        }}
      >
        {!started && (
          <StoryGate
            loadingText={loaded.ready ? null : `Loading your month${loaded.total ? ` · ${loaded.done}/${loaded.total}` : "…"}`}
            monthLong={monthLong}
            onStart={() => {
              setStarted(true);
              if (soundOn) soundKick();
            }}
          />
        )}
        {started && (<>
        {cur === "intro" && (
          <div key="intro" style={{ position: "absolute", inset: 0, animation: "enter .6s ease both" }}>
            <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", mixBlendMode: "screen", filter: "blur(2px)" }}>
              <div style={{ position: "absolute", left: "10%", top: "-4%", width: "50cqw", height: "130%", marginLeft: "-25cqw", transformOrigin: "50% 0", clipPath: "polygon(49% 0, 51% 0, 74% 100%, 26% 100%)", background: "linear-gradient(to bottom, #FF4FD8, rgba(255,79,216,.3) 40%, transparent 80%)", opacity: 0.45, animation: "sweepL 8s ease-in-out infinite" }} />
              <div style={{ position: "absolute", left: "90%", top: "-4%", width: "50cqw", height: "130%", marginLeft: "-25cqw", transformOrigin: "50% 0", clipPath: "polygon(49% 0, 51% 0, 74% 100%, 26% 100%)", background: "linear-gradient(to bottom, #3DF5FF, rgba(61,245,255,.3) 40%, transparent 80%)", opacity: 0.4, animation: "sweepR 9s -2s ease-in-out infinite" }} />
            </div>
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4cqw", textAlign: "center" }}>
              <div style={mono({ fontSize: "3.4cqw", letterSpacing: ".4em", textTransform: "uppercase", color: "#B9B4CC", animation: "rise .6s 1.2s both" })}>Your {monthLong}</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                {[mNum, "/12"].map((str, li) => (
                  <div key={li} data-fit="80" style={syne({ display: "flex", fontSize: "44cqw", lineHeight: 0.88, letterSpacing: "-.04em", textTransform: "uppercase" })}>
                    {str.split("").map((ch, k) => {
                      const color = li === 0 ? NEON[k % 2] : "#F5F3FF";
                      return (
                        <span key={k} style={{ display: "inline-block", color, textShadow: `0 0 .06em ${color}, 0 0 .3em ${color}`, animation: `dropIn .7s cubic-bezier(.2,1.3,.4,1) ${(1.25 + (li * 2 + k) * 0.09).toFixed(2)}s both` }}>{ch}</span>
                      );
                    })}
                  </div>
                ))}
              </div>
              <div style={mono({ fontSize: "3.4cqw", letterSpacing: ".3em", textTransform: "uppercase", color: "#FFE14D", animation: "rise .6s 2.2s both" })}>Curated by HYPE ✶</div>
            </div>
            <div aria-hidden="true" style={{ position: "absolute", left: "50%", top: "50%", width: "36cqw", height: "36cqw", transform: "translate(-50%, -50%)", animation: "orbOut 1.3s .3s cubic-bezier(.7,0,.3,1) both", pointerEvents: "none" }}>
              <div style={{ position: "absolute", inset: "-12%", borderRadius: "50%", background: "conic-gradient(#FF4FD8, #B06CFF, #3DF5FF, #FFE14D, #FF4FD8)", filter: "blur(20px)", animation: "spin 3s linear infinite" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(#FF4FD8, #B06CFF, #3DF5FF, #FFE14D, #FF4FD8)", animation: "spin 3s linear infinite" }} />
              <div style={{ position: "absolute", inset: "5%", borderRadius: "50%", background: "#07060B", display: "grid", placeItems: "center" }}>
                <img src="/landing/hype-logo.png" alt="" style={{ width: "70%", height: "auto", display: "block" }} />
              </div>
            </div>
          </div>
        )}

        {cur === "cut" && (
          <div key="cut" style={{ ...pad, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "4cqw" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1cqw" }}>
              <span style={mono({ fontSize: "3.2cqw", letterSpacing: ".3em", textTransform: "uppercase", color: "#3DF5FF", animation: "rise .5s .1s both" })}>HYPE went through</span>
              <div style={{ position: "relative", alignSelf: "flex-start", maxWidth: "100%", display: "flex", flexWrap: "wrap", alignItems: "baseline", columnGap: "3cqw", animation: "rise .5s .2s both" }}>
                <span style={syne({ fontSize: "15cqw", lineHeight: 1, letterSpacing: "-.04em", color: "transparent", WebkitTextStroke: "1.5px #F5F3FF" })}>{record.photos.length.toLocaleString("en-US")}</span>
                <span style={syne({ fontSize: "6cqw", textTransform: "uppercase", color: "#B9B4CC" })}>photo{record.photos.length === 1 ? "" : "s"}</span>
                <div style={{ position: "absolute", left: "-2%", right: "-2%", top: "52%", height: "1.2cqw", background: "#FF4FD8", boxShadow: "0 0 14px #FF4FD8", transformOrigin: "left", animation: "strike .5s 2.6s cubic-bezier(.7,0,.3,1) both" }} />
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ height: "100%", maxHeight: `${(72 * rows) / 4}cqw`, aspectRatio: `5 / ${rows}`, maxWidth: "100%", display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`, gap: "1.8cqw" }}>
                {sheetPhotos.map((p, k) => (
                  <div
                    key={p.id}
                    style={{
                      position: "relative", minHeight: 0, borderRadius: "1.6cqw", overflow: "hidden", background: bgOf(PAL[(k * 5) % 6]),
                      animation: `tileIn .35s ${(0.3 + k * 0.04).toFixed(2)}s both, ${keep.has(p.id) ? "tileKeep" : "tileDrop"} .5s ${(1.4 + ((k * 7) % 20) * 0.05).toFixed(2)}s forwards`,
                    }}
                  >
                    {photo(p.id, { fit: "cover" })}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: "4cqw" }}>
              <span style={syne({ fontSize: "24cqw", lineHeight: 0.8, color: "#FF4FD8", textShadow: "0 0 .06em #fff, 0 0 .2em #FF4FD8, 0 0 .5em rgba(255,79,216,.6)", animation: "popBig .8s 2.9s cubic-bezier(.2,1.4,.4,1) both" })}>{story.moments.length}</span>
              <span style={syne({ fontSize: "8cqw", lineHeight: 0.95, letterSpacing: "-.02em", textTransform: "uppercase", paddingBottom: "1.4cqw", animation: "rise .5s 3.2s both" })}>made<br />the cut</span>
            </div>
          </div>
        )}

        {cur === "hero" && (
          <div key="hero" style={{ position: "absolute", inset: 0, animation: "enter .6s ease both" }}>
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(160deg, #FFE14D, #3D1F0B)", animation: "ken 6s ease-out both" }}>
              {photo(story.hero.id)}
            </div>
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to top, rgba(7,6,11,.95) 8%, rgba(7,6,11,.2) 55%, rgba(7,6,11,.5))" }} />
            <div style={{ position: "absolute", inset: 0, padding: "84px 7cqw 10cqw", boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: "3cqw", pointerEvents: "none" }}>
              {heroTrack && (
                <div style={{ alignSelf: "flex-start", maxWidth: "100%", boxSizing: "border-box", display: "flex", alignItems: "center", gap: "2.4cqw", padding: "1.4cqw 3.4cqw 1.4cqw 1.4cqw", borderRadius: 999, background: "rgba(7,6,11,.65)", backdropFilter: "blur(8px)", animation: "rise .5s .9s both" }}>
                  <div style={{ flex: "none", width: "7cqw", height: "7cqw", borderRadius: "50%", background: "conic-gradient(#FF4FD8, #3DF5FF, #FF4FD8)", animation: "spin 3s linear infinite" }} />
                  <span style={{ fontSize: "3.4cqw", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{heroTrack.name}</span>
                  <div style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 2, height: "3.4cqw" }}>
                    {EQ.map((d) => <span key={d} style={{ width: 2, height: "100%", borderRadius: 2, background: "#3DF5FF", transformOrigin: "bottom", animation: "eqb .8s ease-in-out infinite", animationDelay: `-${d}s` }} />)}
                  </div>
                </div>
              )}
              <span style={mono({ fontSize: "3.2cqw", letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(245,243,255,.85)", animation: "rise .5s .3s both" })}>
                {[shortDay(heroPhoto?.createTime), story.hero.setting].filter(Boolean).join(" · ")}
              </span>
              <div style={{ display: "grid" }}>
                <div data-fit="86" aria-hidden="true" style={syne({ gridArea: "1 / 1", fontSize: "15cqw", lineHeight: 0.9, letterSpacing: "-.04em", textTransform: "uppercase", color: "transparent", WebkitTextStroke: "1.5px #3DF5FF", transform: "translate(1.2cqw, 1.2cqw)", animation: "rise .6s .55s both" })}>{story.hero.caption}</div>
                <div data-fit="86" style={syne({ gridArea: "1 / 1", fontSize: "15cqw", lineHeight: 0.9, letterSpacing: "-.04em", textTransform: "uppercase", color: "#F5F3FF", textShadow: "0 0 30px rgba(255,79,216,.6)", animation: "rise .6s .45s both" })}>{story.hero.caption}</div>
              </div>
            </div>
          </div>
        )}

        {cur === "booth" && booth && (
          <div key="booth" style={{ ...pad, padding: "84px 7cqw 9cqw", display: "flex", flexDirection: "column", gap: "5cqw" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "2cqw" }}>
              <span style={mono({ fontSize: "3.2cqw", letterSpacing: ".3em", textTransform: "uppercase", color: "#B06CFF", animation: "rise .5s .1s both" })}>
                {[shortDay(boothFirst?.createTime), clock(boothFirst?.createTime)].filter(Boolean).join(" · ")}
              </span>
              <span style={syne({ fontSize: "9cqw", lineHeight: 0.95, letterSpacing: "-.03em", textTransform: "uppercase", animation: "rise .5s .2s both" })}>{booth.headline}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", justifyContent: "center", alignItems: "center", containerType: "size" }}>
              <div style={{ width: "min(54cqw, 38cqh)", aspectRatio: 0.4, display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gridTemplateRows: "repeat(3, minmax(0, 1fr))", gap: "2.2cqw", padding: "2.6cqw 2.6cqw 10cqw", boxSizing: "border-box", background: "#F5F3FF", boxShadow: "0 30px 70px rgba(0,0,0,.7), 0 0 50px rgba(176,108,255,.35)", animation: "stripIn .9s .35s cubic-bezier(.2,1.1,.4,1) both", position: "relative" }}>
                {booth.ids.map((id, k) => (
                  <div key={id} style={{ position: "relative", minHeight: 0, overflow: "hidden", background: bgOf([PAL[0], PAL[3], PAL[1]][k]) }}>
                    {photo(id, { maxCrop: 0.45 })}
                  </div>
                ))}
                <div style={syne({ position: "absolute", left: 0, right: 0, bottom: "3.2cqw", textAlign: "center", fontSize: "2.8cqw", color: "#07060B", letterSpacing: ".1em", whiteSpace: "nowrap" })}>HYPE ✶ BOOTH</div>
                <div style={syne({ position: "absolute", right: "-26%", top: "-5%", whiteSpace: "nowrap", padding: "1.6cqw 3.4cqw", borderRadius: "3cqw", background: "#B06CFF", color: "#07060B", fontSize: "6.4cqw", lineHeight: 1, textTransform: "uppercase", transform: "rotate(8deg)", boxShadow: "0 0 30px rgba(176,108,255,.7)", animation: "popBig .7s 1.3s cubic-bezier(.2,1.4,.4,1) both" })}>{booth.sticker}</div>
              </div>
            </div>
          </div>
        )}

        {cur === "song" && topSong && (
          <div key="song" style={{ ...pad, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={mono({ fontSize: "3.2cqw", letterSpacing: ".3em", textTransform: "uppercase", color: "#3DF5FF", animation: "rise .5s .1s both" })}>Song of the month</span>
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", padding: "4cqw 0" }}>
              <div style={{ position: "relative", height: "100%", maxHeight: "60cqw", aspectRatio: 1, marginLeft: "2cqw" }}>
                <div style={{ position: "absolute", left: "5%", top: "5%", width: "90%", height: "90%", animation: "vinylOut .9s 1s cubic-bezier(.3,1.2,.4,1) both" }}>
                  <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "repeating-radial-gradient(circle, #0C0A13 0 2px, #1A1724 2px 4px)", boxShadow: "0 0 0 1.5px rgba(61,245,255,.5), 0 20px 50px rgba(0,0,0,.7)", animation: "spin 3.6s linear infinite", display: "grid", placeItems: "center" }}>
                    <div style={{ width: "34%", height: "34%", borderRadius: "50%", background: "conic-gradient(#FF4FD8, #B06CFF, #3DF5FF, #FF4FD8)", display: "grid", placeItems: "center" }}>
                      <div style={{ width: "14%", height: "14%", borderRadius: "50%", background: "#07060B" }} />
                    </div>
                  </div>
                </div>
                <div style={{ position: "absolute", inset: 0, borderRadius: "2cqw", overflow: "hidden", background: "linear-gradient(160deg, #FF4FD8, #B06CFF)", boxShadow: "0 30px 70px rgba(0,0,0,.7), 0 0 60px rgba(61,245,255,.3)", animation: "sleeveIn .8s .2s cubic-bezier(.2,1.2,.4,1) both" }}>
                  {artOf(topSong) && <img src={artOf(topSong)} alt="" className="hs-fill" />}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "2cqw" }}>
              <span data-fit="86" style={syne({ display: "inline-block", alignSelf: "flex-start", fontSize: "12cqw", lineHeight: 0.95, letterSpacing: "-.03em", textTransform: "uppercase", whiteSpace: "nowrap", animation: "rise .6s 1.4s both" })}>{topSong.name}</span>
              <div style={{ display: "flex", alignItems: "center", gap: "3cqw", flexWrap: "wrap", animation: "rise .5s 1.6s both" }}>
                <span style={{ fontSize: "4.6cqw", color: "#B9B4CC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{artistsOf(topSong)}</span>
                {story.song?.note && <span style={mono({ padding: "1.2cqw 3cqw", borderRadius: 999, border: "1px solid #3DF5FF", color: "#3DF5FF", fontSize: "3cqw", whiteSpace: "nowrap" })}>{story.song.note}</span>}
              </div>
            </div>
          </div>
        )}

        {cur === "top" && (
          <div key="top" style={{ ...pad, display: "flex", flexDirection: "column", justifyContent: "center", gap: "5cqw" }}>
            <span style={syne({ fontSize: "13cqw", lineHeight: 0.9, letterSpacing: "-.04em", textTransform: "uppercase", animation: "rise .5s .1s both" })}>On <span style={{ color: "#FFE14D", textShadow: "0 0 24px rgba(255,225,77,.6)" }}>repeat</span></span>
            <div style={{ display: "flex", flexDirection: "column", gap: "2.4cqw" }}>
              {top5.map((t, k) => (
                <div key={t.id} style={{ display: "grid", gridTemplateColumns: "6cqw 13cqw minmax(0, 1fr) auto", alignItems: "center", gap: "3cqw", padding: "2.4cqw 3.4cqw 2.4cqw 3cqw", borderRadius: "4cqw", background: "rgba(16,14,24,.9)", border: `1px solid ${k === 0 ? "rgba(255,225,77,.6)" : "rgba(245,243,255,.08)"}`, animation: `slideIn .5s ${(0.3 + k * 0.12).toFixed(2)}s cubic-bezier(.2,1.2,.4,1) both` }}>
                  <span style={syne({ fontSize: "6.4cqw", lineHeight: 1, textAlign: "center", color: NEON[k % 4] })}>{k + 1}</span>
                  <div style={{ position: "relative", width: "13cqw", height: "13cqw", borderRadius: "2cqw", overflow: "hidden", background: bgOf(PAL[k]) }}>
                    {artOf(t, true) && <img src={artOf(t, true)} alt="" className="hs-fill" />}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                    <span style={{ fontSize: "4.2cqw", fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                    <span style={{ fontSize: "3.3cqw", color: "#B9B4CC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{artistsOf(t)}</span>
                  </div>
                  <span style={mono({ fontSize: "3cqw", color: NEON[k % 4], whiteSpace: "nowrap" })}>{mmss(t.duration_ms)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cur === "strava" && story.strava && (
          <div key="strava" style={{ ...pad, display: "flex", flexDirection: "column", justifyContent: "center", gap: "4cqw" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "1.4cqw" }}>
              <span style={syne({ fontSize: "11cqw", lineHeight: 0.9, letterSpacing: "-.04em", textTransform: "uppercase", animation: "rise .5s .1s both" })}>
                {story.strava.lead} <span style={{ color: "#FFE14D", textShadow: "0 0 24px rgba(255,225,77,.6)" }}>{story.strava.word}</span>
              </span>
              <span style={mono({ fontSize: "3cqw", letterSpacing: ".2em", textTransform: "uppercase", color: "#B9B4CC", animation: "rise .5s .2s both" })}>via Strava</span>
            </div>
            <div style={{ position: "relative", flex: 1, minHeight: 0, maxHeight: "80cqw", borderRadius: "5cqw", overflow: "hidden", background: "#15121F", boxShadow: "0 0 0 1px rgba(255,225,77,.35), 0 24px 60px rgba(0,0,0,.6)", animation: "rise .6s .25s both" }}>
              <div style={{ position: "absolute", inset: 0, opacity: 0.35, backgroundImage: "linear-gradient(rgba(245,243,255,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(245,243,255,.08) 1px, transparent 1px)", backgroundSize: "8cqw 8cqw" }} />
              <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(to top, rgba(7,6,11,.55), transparent 50%)" }} />
              <svg viewBox="0 0 200 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ position: "absolute", inset: "8%", width: "84%", height: "84%", overflow: "visible", pointerEvents: "none", filter: "drop-shadow(0 0 4px #FFE14D) drop-shadow(0 0 14px rgba(255,79,216,.7))" }}>
                <path d={route?.d ?? DECOR_ROUTE} pathLength={1} fill="none" stroke="#FFE14D" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" style={{ animation: "draw 2.4s .6s cubic-bezier(.5,0,.3,1) both" }} />
                <circle cx={route?.start[0] ?? 22} cy={route?.start[1] ?? 150} r={4} fill="#FF4FD8" style={{ filter: "drop-shadow(0 0 5px #FF4FD8)" }}>
                  <animate attributeName="r" values="4;12" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values=".8;0" dur="1.6s" repeatCount="indefinite" />
                </circle>
                <circle cx={route?.start[0] ?? 22} cy={route?.start[1] ?? 150} r={4} fill="#FF4FD8" />
              </svg>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "2.4cqw" }}>
              {[
                { v: km(activities.reduce((s, a) => s + (a.distance ?? 0), 0)), l: "Distance", color: "#FFE14D", d: "1.6s" },
                { v: String(activities.length), l: kind, color: "#FF4FD8", d: "1.75s" },
                { v: km(longest?.distance ?? 0), l: "Longest", color: "#3DF5FF", d: "1.9s" },
              ].map((r) => (
                <div key={r.l} style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: "1cqw", padding: "3cqw 2.4cqw", borderRadius: "4cqw", background: "rgba(16,14,24,.9)", border: "1px solid rgba(245,243,255,.08)", animation: `popBig .6s ${r.d} cubic-bezier(.2,1.4,.4,1) both` }}>
                  <span style={syne({ fontSize: `min(5cqw, ${(19 / (r.v.length * 0.8)).toFixed(2)}cqw)`, lineHeight: 1, color: r.color, whiteSpace: "nowrap" })}>{r.v}</span>
                  <span style={mono({ fontSize: "2.6cqw", letterSpacing: ".12em", textTransform: "uppercase", color: "#B9B4CC" })}>{r.l}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {cur === "golden" && golden && (
          <div key="golden" style={{ ...pad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6cqw" }}>
            <div style={{ position: "absolute", left: "50%", top: "42%", width: "130cqw", height: "130cqw", transform: "translate(-50%, -50%)", borderRadius: "50%", pointerEvents: "none", background: "radial-gradient(closest-side, rgba(255,187,0,.35), rgba(255,79,216,.12) 50%, transparent)" }} />
            <div style={{ position: "relative", flex: 1, minHeight: 0, maxHeight: "104cqw", aspectRatio: 0.7, maxWidth: "72cqw", display: "flex", flexDirection: "column", padding: "3cqw 3cqw 11cqw", background: "#F5F3FF", transform: "rotate(-4deg)", boxShadow: "0 30px 70px rgba(0,0,0,.7)", animation: "popBig .9s .2s cubic-bezier(.2,1.2,.4,1) both", boxSizing: "border-box" }}>
              <div style={{ position: "absolute", left: "50%", top: "-3cqw", zIndex: 2, width: "22cqw", height: "6cqw", transform: "translateX(-50%) rotate(3deg)", background: "rgba(255,79,216,.8)" }} />
              <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", background: "linear-gradient(160deg, #FFBB00, #3A0F52)" }}>
                {photo(golden.id)}
              </div>
              <div style={mono({ position: "absolute", left: 0, right: 0, bottom: "3.4cqw", textAlign: "center", fontSize: "3cqw", letterSpacing: ".14em", textTransform: "uppercase", color: "#07060B" })}>
                {[shortDay(goldenPhoto?.createTime), golden.setting].filter(Boolean).join(" · ")}
              </div>
            </div>
            <span data-fit="86" style={syne({ position: "relative", display: "inline-block", fontSize: "12cqw", lineHeight: 0.9, letterSpacing: "-.04em", textTransform: "uppercase", whiteSpace: "nowrap", animation: "rise .6s 1s both" })}>{golden.caption}</span>
          </div>
        )}

        {cur === "outro" && (
          <div key="outro" data-story-end="" style={{ position: "absolute", inset: 0, zIndex: 8, padding: "80px 7cqw 7cqw", boxSizing: "border-box", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", gap: "4cqw", animation: "enter .6s ease both" }}>
            <div style={{ flex: 1, minHeight: 0, width: "100%", display: "flex", alignItems: "center" }}>
              <div style={{ width: "100%", animation: "ticketIn 1s .25s cubic-bezier(.2,1.2,.4,1) both" }}>
                <div
                  onPointerMove={(e) => {
                    const el = e.currentTarget, r = el.getBoundingClientRect();
                    el.style.setProperty("--tx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
                    el.style.setProperty("--ty", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
                  }}
                  onPointerLeave={(e) => {
                    e.currentTarget.style.setProperty("--tx", "0");
                    e.currentTarget.style.setProperty("--ty", "0");
                  }}
                  style={{ position: "relative", transform: "perspective(900px) rotateY(calc(var(--tx, 0) * 18deg)) rotateX(calc(var(--ty, 0) * -18deg))", transition: "transform .25s ease", filter: "drop-shadow(0 28px 40px rgba(0,0,0,.65)) drop-shadow(0 0 36px rgba(255,79,216,.35))" }}
                >
                  <div style={{ position: "relative", overflow: "hidden", borderRadius: "4cqw 4cqw 0 0", background: "#F5F3FF", color: "#07060B" }}>
                    <div style={{ height: "2.6cqw", background: "linear-gradient(90deg, #FF4FD8, #3DF5FF, #FFE14D, #B06CFF, #FF4FD8)", backgroundSize: "200% 100%", animation: "holo 3s linear infinite" }} />
                    <div aria-hidden="true" style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: "30%", pointerEvents: "none", background: "linear-gradient(90deg, transparent, rgba(255,255,255,.75), transparent)", mixBlendMode: "overlay", animation: "shineT 4.5s 1.4s ease-in-out infinite" }} />
                    <div style={{ padding: "4cqw 5.4cqw 3cqw", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "3cqw" }}>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: ".6cqw" }}>
                        <span style={mono({ fontSize: "2.6cqw", letterSpacing: ".24em", textTransform: "uppercase", color: "rgba(7,6,11,.6)" })}>HYPE presents</span>
                        <span style={syne({ fontSize: "15cqw", lineHeight: 0.88, letterSpacing: "-.05em", whiteSpace: "nowrap" })}>{mNum}<span style={{ color: "#FF4FD8" }}>/12</span></span>
                        <span style={mono({ fontSize: "2.6cqw", letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(7,6,11,.6)", whiteSpace: "nowrap" })}>{monthShort} {y} · {story.outro.tagline}</span>
                      </div>
                      <img src="/landing/hype-logo.png" alt="HYPE" style={{ flex: "none", height: "4.4cqw", width: "auto", filter: "brightness(0)", marginTop: "1cqw" }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2.4cqw", borderTop: "1.5px solid rgba(7,6,11,.12)", margin: "0 5.4cqw", padding: "3.4cqw 0 4.6cqw" }}>
                      <span style={mono({ fontSize: "2.4cqw", letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(7,6,11,.55)" })}>The story so far</span>
                      <p style={{ margin: 0, fontSize: "3.9cqw", fontWeight: 500, lineHeight: 1.45, color: "#07060B", textWrap: "pretty" }}>
                        {story.outro.story.map((s, k) => (
                          <span key={k} style={{ animation: `rise .5s ${(1.3 + k * 0.3).toFixed(1)}s both`, display: "inline" }}>{renderMarked(s)} </span>
                        ))}
                        <span style={{ animation: `rise .5s ${(1.3 + story.outro.story.length * 0.3).toFixed(1)}s both`, display: "inline", fontWeight: 700 }}>{story.outro.signoff}</span>
                      </p>
                    </div>
                  </div>
                  <div style={{ position: "relative", height: "5cqw", background: "#F5F3FF" }}>
                    <div style={{ position: "absolute", left: "5cqw", right: "5cqw", top: "50%", borderTop: "2px dashed rgba(7,6,11,.25)" }} />
                    <div style={{ position: "absolute", left: "-2.6cqw", top: "50%", width: "5.2cqw", height: "5.2cqw", marginTop: "-2.6cqw", borderRadius: "50%", background: "#07060B" }} />
                    <div style={{ position: "absolute", right: "-2.6cqw", top: "50%", width: "5.2cqw", height: "5.2cqw", marginTop: "-2.6cqw", borderRadius: "50%", background: "#07060B" }} />
                  </div>
                  <div style={{ position: "relative", borderRadius: "0 0 4cqw 4cqw", background: "#F5F3FF", color: "#07060B", padding: "2.4cqw 5.4cqw 4.4cqw", display: "flex", alignItems: "center", gap: "4cqw", animation: torn ? "tear 1s cubic-bezier(.5,0,.7,.4) forwards" : "none" }}>
                    <div style={{ flex: 1, minWidth: 0, height: "10cqw", background: "repeating-linear-gradient(90deg, #07060B 0 2px, transparent 2px 4px, #07060B 4px 5px, transparent 5px 8px, #07060B 8px 11px, transparent 11px 12px, #07060B 12px 13px, transparent 13px 16px)" }} />
                    <div style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: ".6cqw" }}>
                      <span style={syne({ fontSize: "4.4cqw", lineHeight: 1, textTransform: "uppercase" })}>Admit one</span>
                      <span style={mono({ fontSize: "2.4cqw", letterSpacing: ".12em", color: "rgba(7,6,11,.6)" })}>No. {mNum}{y}-{String(record.photos.length).padStart(4, "0")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
              <button onClick={() => go(0)} aria-label="Replay" style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(245,243,255,.25)", background: "transparent", color: "#F5F3FF", fontSize: 18, cursor: "pointer", animation: "rise .5s 1.1s both" }}>↺</button>
              <button onClick={share} style={{ flex: 1, maxWidth: 240, minHeight: 52, padding: "0 16px", whiteSpace: "nowrap", borderRadius: 999, border: 0, background: "#FF4FD8", color: "#07060B", fontWeight: 700, fontSize: "max(15px, 4.4cqw)", cursor: "pointer", animation: "rise .5s 1s both, pulseBtn 2.4s 1.5s infinite" }}>Share my hype</button>
              <Link href="/create" aria-label="Make another" title="Make another" className="hs-icon-btn" style={{ flex: "none", width: 48, height: 48, borderRadius: "50%", border: "1px solid rgba(245,243,255,.25)", display: "grid", placeItems: "center", color: "#F5F3FF", fontSize: 20, animation: "rise .5s 1.1s both" }}>+</Link>
            </div>
          </div>
        )}

        </>)}

        <div key={`flash-${i}`} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 4, background: `radial-gradient(70% 60% at 50% 50%, ${glow}, transparent 70%)`, animation: "flash .9s ease-out both" }} />

        <div
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onPointerLeave={onUp}
          style={{ position: "absolute", inset: 0, zIndex: 5, touchAction: "manipulation", userSelect: "none", WebkitUserSelect: "none", display: btnPause || !started || cur === "outro" ? "none" : "block" }}
        />

        <div style={{ position: "absolute", left: 0, right: 0, top: 0, zIndex: 9, padding: "12px 12px 0", display: "flex", flexDirection: "column", gap: 8, background: "linear-gradient(to bottom, rgba(7,6,11,.6), transparent)", pointerEvents: "none" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {slides.map((s, k) => (
              <div key={s} style={{ flex: 1, height: 3, borderRadius: 3, background: "rgba(245,243,255,.25)", overflow: "hidden" }}>
                <div
                  key={k === i ? `on-${i}` : "off"}
                  onAnimationEnd={k === i ? () => { if (i < n - 1) go(i + 1); } : undefined}
                  style={{ height: "100%", width: k < i ? "100%" : "0%", background: "#F5F3FF", boxShadow: "0 0 6px rgba(255,255,255,.6)", animation: k === i ? `fillSeg ${dur}ms linear both` : "none", animationPlayState: paused ? "paused" : "running" }}
                />
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden" }}>
              <img src="/landing/hype-logo.png" alt="HYPE" style={{ display: "block", height: 16, width: "auto", flex: "none" }} />
              <span style={mono({ fontSize: 11, letterSpacing: ".14em", color: "rgba(245,243,255,.75)", whiteSpace: "nowrap" })}>{String(i + 1).padStart(2, "0")} / {String(n).padStart(2, "0")}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", pointerEvents: "auto" }}>
              {tracks.length > 0 && (
                <button
                  onClick={toggleSound}
                  aria-label={soundOn ? "Mute soundtrack" : "Play soundtrack"}
                  title={soundState === "blocked" ? "Tap to start the soundtrack" : soundOn ? "Mute" : "Sound on"}
                  style={{ position: "relative", width: 44, height: 44, border: 0, background: "transparent", color: soundOn ? "#F5F3FF" : "rgba(245,243,255,.5)", fontSize: 16, cursor: "pointer" }}
                >
                  <span style={{ textDecorationLine: soundOn ? "none" : "line-through", textDecorationThickness: 2 }}>♪</span>
                  {soundOn && soundState === "blocked" && (
                    <span style={{ position: "absolute", right: 8, top: 10, width: 7, height: 7, borderRadius: "50%", background: "#FF4FD8", boxShadow: "0 0 8px #FF4FD8" }} />
                  )}
                </button>
              )}
              <button onClick={() => setBtnPause((p) => !p)} aria-label={btnPause ? "Play" : "Pause"} style={{ width: 44, height: 44, border: 0, background: "transparent", color: "#F5F3FF", fontSize: 15, cursor: "pointer" }}>{btnPause ? "▶" : "❚❚"}</button>
              <SiteNav current="story" menuOnly onOpenChange={(o) => o && setBtnPause(true)} />
              <Link href={`/wrapped/${month}`} aria-label="Close" className="hs-icon-btn" style={{ width: 44, height: 44, display: "grid", placeItems: "center", color: "#F5F3FF", fontSize: 18 }}>✕</Link>
            </div>
          </div>
        </div>

        {started && soundOn && soundState === "blocked" && !btnPause && (
          <button
            onClick={soundKick}
            style={{ position: "absolute", left: "50%", bottom: "4cqw", zIndex: 10, transform: "translateX(-50%)", padding: "9px 16px", borderRadius: 999, border: "1px solid rgba(61,245,255,.6)", background: "rgba(7,6,11,.8)", backdropFilter: "blur(8px)", color: "#3DF5FF", fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", whiteSpace: "nowrap", cursor: "pointer" }}
          >
            ♪ Tap for sound
          </button>
        )}
        {btnPause && (
          <div style={mono({ position: "absolute", left: "50%", bottom: "3cqw", zIndex: 9, transform: "translateX(-50%)", padding: "8px 16px", borderRadius: 999, background: "rgba(7,6,11,.75)", backdropFilter: "blur(8px)", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", whiteSpace: "nowrap", pointerEvents: "none" })}>Paused</div>
        )}
        {toast && (
          <div style={{ position: "absolute", left: "50%", bottom: "4cqw", zIndex: 10, transform: "translateX(-50%)", padding: "10px 18px", borderRadius: 999, background: "#FFE14D", color: "#07060B", fontWeight: 700, fontSize: 14, whiteSpace: "nowrap", animation: "rise .3s ease both" }}>Link copied ✶</div>
        )}
      </div>
    </div>
  );
}

// Start / loading screen in the intro's style: the spinning HYPE orb, then a
// ▶ button that starts slides and soundtrack together (one tap = sound allowed).
function StoryGate({ card = false, loadingText, monthLong, onStart }: { card?: boolean; loadingText: string | null; monthLong?: string; onStart?: () => void }) {
  const body = (
    <div style={{ position: "absolute", inset: 0, zIndex: 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "8cqw", textAlign: "center", animation: "enter .6s ease both" }}>
      <div aria-hidden="true" style={{ position: "relative", width: "36cqw", height: "36cqw" }}>
        <div style={{ position: "absolute", inset: "-12%", borderRadius: "50%", background: "conic-gradient(#FF4FD8, #B06CFF, #3DF5FF, #FFE14D, #FF4FD8)", filter: "blur(20px)", animation: "spin 3s linear infinite" }} />
        <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(#FF4FD8, #B06CFF, #3DF5FF, #FFE14D, #FF4FD8)", animation: "spin 3s linear infinite" }} />
        <div style={{ position: "absolute", inset: "5%", borderRadius: "50%", background: "#07060B", display: "grid", placeItems: "center" }}>
          <img src="/landing/hype-logo.png" alt="" style={{ width: "70%", height: "auto", display: "block" }} />
        </div>
      </div>
      {loadingText ? (
        <span style={{ fontFamily: "var(--f-mono)", fontSize: "3.2cqw", letterSpacing: ".3em", textTransform: "uppercase", color: "#B9B4CC" }}>{loadingText}</span>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3cqw", animation: "rise .5s ease both" }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "3.2cqw", letterSpacing: ".3em", textTransform: "uppercase", color: "#FFE14D" }}>Your {monthLong} is ready</span>
          <button
            onClick={onStart}
            style={{ minHeight: 56, padding: "0 30px", borderRadius: 999, border: 0, background: "#FF4FD8", color: "#07060B", fontFamily: "var(--f-body)", fontWeight: 700, fontSize: "max(16px, 4.4cqw)", cursor: "pointer", animation: "pulseBtn 2.4s infinite" }}
          >
            ▶ Play my hype
          </button>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: "2.6cqw", letterSpacing: ".2em", textTransform: "uppercase", color: "#8A849E" }}>Sound on ♪</span>
        </div>
      )}
    </div>
  );
  if (!card) return body;
  return (
    <div style={{ position: "relative", width: "min(100vw, calc(min(100vh - 32px, 920px) * .5625))", height: "min(100vh - 32px, 920px)", borderRadius: 28, overflow: "hidden", background: "#07060B", boxShadow: "0 0 0 1px rgba(245,243,255,.12), 0 40px 120px rgba(0,0,0,.8), 0 0 80px rgba(255,79,216,.28)", containerType: "inline-size" }}>
      {body}
    </div>
  );
}
