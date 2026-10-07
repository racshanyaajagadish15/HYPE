"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { HypeShell, PAL, gradientOf, monthName } from "../../_components/HypeShell";
import { SmartPhoto, focusMap, focusPosition, type Focus } from "../../_components/SmartPhoto";

type SourceKey = "photos" | "music" | "strava";
type SourceStatus = {
  state: "idle" | "loading" | "done";
  phase: "auth" | "picker" | "sync" | null;
  progress?: { done: number; total: number } | null;
  error: string | null;
  authorized: boolean;
  count: number;
  kind?: string;
  configured?: boolean;
};
type Sources = Record<SourceKey, SourceStatus>;
type Photo = { id: string; createTime?: string };
type Track = { id: string; name: string; artists: { name: string }[] };
type MonthRecord = {
  month: string;
  photos: Photo[];
  music: { topTracks: Track[] } | null;
  strava?: { activities: unknown[] } | null;
  moments: { id: string; caption: string }[];
  narrative: string | null;
  photoNotes?: { id: string; focusX?: number; focusY?: number }[];
};
type Curate = { status: "idle" | "running" | "done" | "error"; step: number; error: string | null };
type Stage = "connect" | "curate" | "ready";

const SRC: { k: SourceKey; name: string; idle: string; accent: string; optional?: boolean }[] = [
  { k: "photos", name: "Google Photos", idle: "Your photos and videos from this month", accent: "#FF4FD8" },
  { k: "music", name: "Spotify", idle: "The songs you had on repeat", accent: "#3DF5FF" },
  { k: "strava", name: "Strava", idle: "Add your runs and rides", accent: "#FFE14D", optional: true },
];
const STAT_LINES = ["Going through your month", "Finding the moments that matter", "Matching your soundtrack", "Writing your story"];
const SLIDE_MS = 2800;
const EQ = [0, 0.3, 0.15, 0.45, 0.1];
const ORBIT = [0, 60, 120, 180, 240, 300];
// A popup that hasn't reached the backend yet still shows "Connecting" —
// give it this long before trusting the server's idle state.
const OPTIMISTIC_MS = 8000;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export default function Builder() {
  const { month } = useParams<{ month: string }>();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [sources, setSources] = useState<Sources | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [pending, setPending] = useState<Partial<Record<SourceKey, number>>>({});
  const [clickError, setClickError] = useState<Partial<Record<SourceKey, string>>>({});
  const [curate, setCurate] = useState<Curate>({ status: "idle", step: 0, error: null });
  const [pct, setPct] = useState(0);
  const [slide, setSlide] = useState(0);
  const [loadError, setLoadError] = useState("");

  const base = `/api/months/${month}`;
  const router = useRouter();
  const loadRecord = useCallback(() => api<MonthRecord>(base).then((r) => (setRecord(r), r)), [base]);
  const loadSources = useCallback(() => api<Sources>(`${base}/sources`).then(setSources), [base]);

  // Initial stage: resume a running curation, show a finished one, else connect.
  useEffect(() => {
    Promise.all([api<MonthRecord>(base), api<Sources>(`${base}/sources`), api<Curate>(`${base}/curate`)])
      .then(([r, s, c]) => {
        setRecord(r);
        setSources(s);
        setCurate(c);
        setStage(c.status === "running" ? "curate" : c.status === "done" ? "ready" : "connect");
      })
      .catch((err) => setLoadError(err.message));
  }, [base]);

  // ---- connect ----------------------------------------------------------
  const isLoading = (k: SourceKey) =>
    sources?.[k].state === "loading" || (pending[k] != null && Date.now() - pending[k]! < OPTIMISTIC_MS);
  const anyLoading = SRC.some((x) => isLoading(x.k));

  useEffect(() => {
    if (stage !== "connect" || !anyLoading) return;
    const id = setInterval(() => {
      loadSources().catch(() => {});
    }, 1500);
    return () => clearInterval(id);
  }, [stage, anyLoading, loadSources]);

  // A finished photo import changes the month's photos — refetch them so the
  // curate screen's orbiting tiles show the real photos.
  const photoCount = sources?.photos.state === "done" ? sources.photos.count : -1;
  useEffect(() => {
    if (photoCount > 0) loadRecord().catch(() => {});
  }, [photoCount, loadRecord]);

  // Once the server owns the job (or the optimistic window lapses), drop the local flag.
  useEffect(() => {
    if (!sources) return;
    setPending((p) => {
      const next = { ...p };
      for (const k of Object.keys(p) as SourceKey[]) {
        if (sources[k].state !== "idle" || Date.now() - p[k]! >= OPTIMISTIC_MS) delete next[k];
      }
      return next;
    });
  }, [sources]);

  useEffect(() => {
    const onFocus = () => loadSources().catch(() => {});
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [loadSources]);

  function openPopup(k: SourceKey) {
    const w = window.open(`${base}/sources/${k}/connect`, "hype-connect", "popup,width=520,height=760");
    if (!w) throw new Error("Allow pop-ups for this site to connect");
  }

  async function toggle(k: SourceKey) {
    if (!sources) return;
    setClickError((e) => ({ ...e, [k]: undefined }));
    if (isLoading(k)) {
      setPending((p) => ({ ...p, [k]: undefined }));
      setSources(await api<Sources>(`${base}/sources/${k}/cancel`, { method: "POST" }));
      return;
    }
    try {
      // Photos always needs the Google picker; the others only need a popup to log in.
      if (k === "photos" || !sources[k].authorized) {
        openPopup(k);
      } else {
        await api(`${base}/sources/${k}/connect`, { method: "POST" });
      }
      setPending((p) => ({ ...p, [k]: Date.now() }));
      await loadSources();
    } catch (err) {
      setClickError((e) => ({ ...e, [k]: (err as Error).message }));
    }
  }

  // ---- curate -----------------------------------------------------------
  const startCurate = async () => {
    loadRecord().catch(() => {});
    setCurate({ status: "running", step: 0, error: null });
    setPct(0);
    setSlide(0);
    setStage("curate");
    try {
      setCurate(await api<Curate>(`${base}/curate`, { method: "POST" }));
    } catch (err) {
      setCurate({ status: "error", step: 0, error: (err as Error).message });
      setStage("connect");
    }
  };

  useEffect(() => {
    if (stage !== "curate") return;
    const id = setInterval(async () => {
      try {
        const c = await api<Curate>(`${base}/curate`);
        setCurate(c);
        if (c.status === "error") setStage("connect");
      } catch {}
    }, 1000);
    return () => clearInterval(id);
  }, [stage, base]);

  // Ease the bar toward the running step; it only completes when the job does.
  useEffect(() => {
    if (stage !== "curate") return;
    const id = setInterval(() => {
      setPct((p) => {
        const target = curate.status === "done" ? 100 : ((Math.min(curate.step, 3) + 0.9) / 4) * 100;
        return Math.min(target, p + Math.max(0.15, (target - p) * 0.05));
      });
    }, 100);
    return () => clearInterval(id);
  }, [stage, curate]);

  useEffect(() => {
    if (stage !== "curate" || curate.status !== "done" || pct < 100) return;
    const t = setTimeout(() => {
      loadRecord()
        .then((r) => preload([r.photos.find((p) => p.id === r.moments[0]?.id)?.id, ...r.moments.map((m) => m.id)].filter(Boolean).map((id) => `${base}/photos/${encodeURIComponent(id!)}`)))
        .finally(() => setStage("ready"));
    }, 500);
    return () => clearTimeout(t);
  }, [stage, curate.status, pct, loadRecord]);

  // ---- ready ------------------------------------------------------------
  useEffect(() => {
    if (stage === "ready") router.prefetch(`/wrapped/${month}/story`);
  }, [stage, month, router]);
  const moments = (record?.moments ?? [])
    .map((m) => ({ ...m, photo: record!.photos.find((p) => p.id === m.id) }))
    .filter((m) => m.photo);
  const tracks = record?.music?.topTracks ?? [];

  useEffect(() => {
    if (stage !== "ready" || moments.length < 2) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % moments.length), SLIDE_MS);
    return () => clearInterval(id);
  }, [stage, moments.length]);

  // ---- render -----------------------------------------------------------
  const order: Stage[] = ["connect", "curate", "ready"];
  const si = stage ? order.indexOf(stage) : 0;
  const ambient = { connect: "rgba(255,79,216,.16)", curate: "rgba(61,245,255,.16)", ready: "rgba(255,225,77,.14)" }[stage ?? "connect"];
  const stepDots = (
    <div style={{ display: "flex", gap: 6 }}>
      {order.map((_, i) => (
        <span
          key={i}
          style={{
            width: i === si ? 28 : 6, height: 6, borderRadius: 6,
            background: i <= si ? ["#FF4FD8", "#3DF5FF", "#FFE14D"][i] : "rgba(245,243,255,.2)",
            transition: "width .4s ease, background .4s ease",
          }}
        />
      ))}
    </div>
  );

  const photoUrl = (id: string) => `${base}/photos/${encodeURIComponent(id)}`;
  const focus = focusMap(record?.photoNotes);
  const ok = sources?.photos.state === "done" && sources?.music.state === "done";
  const stravaOn = sources?.strava.state === "done" && (sources?.strava.count ?? 0) > 0;
  const name = monthName(month);

  return (
    <HypeShell ambient={ambient} spotlights={stage === "ready"} headerRight={stepDots} nav="create">
      {loadError && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, animation: "rise .5s ease both" }}>
          <h1 className="hb-h1">Can&apos;t reach <span className="hb-accent">HYPE</span></h1>
          <p className="hb-lede">
            The backend didn&apos;t answer ({loadError}). Make sure it&apos;s running the latest code: restart <code>node server.js</code> in <code>backend/</code>, then reload.
          </p>
          <button className="hb-cta is-live" style={{ alignSelf: "flex-start" }} onClick={() => window.location.reload()}>Try again</button>
        </div>
      )}

      {stage === "connect" && sources && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28, animation: "rise .5s ease both" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 className="hb-h1">Create your <span className="hb-accent">hype</span></h1>
            <p className="hb-lede">Connect your apps. HYPE&apos;s AI picks the best moments and songs of your {name} and turns them into a story. You don&apos;t lift a finger.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {SRC.map((x) => {
              const st = sources[x.k];
              const loading = isLoading(x.k);
              const done = !loading && st.state === "done";
              const error = clickError[x.k] ?? (!loading ? st.error : null);
              const sub = loading
                ? st.phase === "picker" ? "Pick your photos in the Google tab…" : st.phase === "sync" ? (st.progress?.total ? `Downloading ${st.progress.done + 1} of ${st.progress.total}…` : "Syncing…") : "Waiting for permission…"
                : error ?? (done ? doneText(x.k, st, name) : x.idle);
              return (
                <div
                  key={x.k}
                  className="hb-card"
                  style={{ borderColor: done ? x.accent : "rgba(245,243,255,.1)", boxShadow: done ? `0 0 28px ${x.accent}33` : "none" }}
                >
                  <div className="hb-tile" style={{ background: x.accent + "1A", border: `1px solid ${x.accent}55` }}>
                    <span style={{ color: x.accent }}>{x.name[0]}</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="hb-card-title">{x.name}</span>
                      {x.optional && <span className="hb-tag">Optional</span>}
                    </div>
                    <span className={`hb-card-sub${error && !loading ? " hb-error" : ""}`} style={done && !error ? { color: x.accent } : undefined}>{sub}</span>
                  </div>
                  <button
                    className="hb-btn"
                    onClick={() => toggle(x.k)}
                    title={loading ? "Cancel" : done ? "Sync again" : undefined}
                    style={done ? { background: x.accent, color: "#07060B", borderColor: x.accent } : undefined}
                  >
                    {loading && <span className="hb-spinner" style={{ borderTopColor: x.accent }} />}
                    <span>{done ? "Connected ✓" : loading ? "Connecting" : "Connect"}</span>
                  </button>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
            <button className={`hb-cta${ok ? " is-live" : ""}`} onClick={startCurate} disabled={!ok}>Curate my month ✶</button>
            <span className={`hb-note${curate.status === "error" ? " hb-error" : ""}`}>
              {curate.status === "error" ? `Curation failed: ${curate.error}` : ok ? "Takes a minute or two" : "Connect Google Photos and Spotify to start"}
            </span>
          </div>
        </div>
      )}

      {stage === "curate" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 30, paddingTop: 10, animation: "rise .5s ease both" }}>
          <div style={{ position: "relative", width: "min(88vw, 400px, 58vh)", aspectRatio: 1 }}>
            <div style={ring("#FF4FD8", "rgba(255,79,216,.5)", "0s")} />
            <div style={ring("#3DF5FF", "rgba(61,245,255,.5)", "1.5s")} />
            <div style={{ position: "absolute", inset: 0, animation: "spin 14s linear infinite" }}>
              {ORBIT.map((deg, i) => {
                const photo = record?.photos[i];
                return (
                  <div key={deg} style={{ position: "absolute", left: "50%", top: "50%", width: 0, height: 0, transform: `rotate(${deg}deg) translateX(clamp(118px, 30vw, 150px))` }}>
                    <div style={{ position: "absolute", left: -26, top: -34, width: 52, height: 68, animation: "spinRev 14s linear infinite" }}>
                      <div
                        style={{
                          width: "100%", height: "100%", borderRadius: 10, transform: `rotate(${-deg}deg)`,
                          background: photo ? `url("${photoUrl(photo.id)}") ${focusPosition(focus.get(photo.id))}/cover, ${gradientOf(PAL[i])}` : gradientOf(PAL[i]),
                          boxShadow: "0 10px 26px rgba(0,0,0,.6), 0 0 0 1px rgba(245,243,255,.2), 0 0 18px rgba(255,79,216,.25)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ position: "absolute", left: "50%", top: "50%", width: "40%", aspectRatio: 1, margin: "-20% 0 0 -20%", animation: "corePulse 2.4s ease-in-out infinite" }}>
              <div style={{ position: "absolute", inset: "-12%", borderRadius: "50%", background: "conic-gradient(#FF4FD8, #B06CFF, #3DF5FF, #FFE14D, #FF4FD8)", filter: "blur(22px)", opacity: 0.85, animation: "spin 4s linear infinite" }} />
              <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(#FF4FD8, #B06CFF, #3DF5FF, #FFE14D, #FF4FD8)", animation: "spin 4s linear infinite" }} />
              <div style={{ position: "absolute", inset: "5%", borderRadius: "50%", background: "#07060B", display: "grid", placeItems: "center" }}>
                <img src="/landing/hype-logo.png" alt="" style={{ width: "70%", height: "auto", display: "block" }} />
              </div>
            </div>
          </div>
          <div style={{ minHeight: 72, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
            <div
              key={curate.step}
              style={{ fontFamily: "var(--f-syne)", fontWeight: 800, fontSize: "clamp(22px, 5vw, 32px)", lineHeight: 1.1, letterSpacing: "-.02em", textTransform: "uppercase", animation: `${curate.step % 2 ? "statB" : "statA"} .6s ease-out both` }}
            >
              {STAT_LINES[Math.min(3, curate.step)]}
            </div>
            <div style={{ width: 160, height: 3, borderRadius: 3, background: "rgba(245,243,255,.1)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.round(pct)}%`, background: "linear-gradient(90deg, #FF4FD8, #3DF5FF)", boxShadow: "0 0 10px #FF4FD8", transition: "width .12s linear" }} />
            </div>
          </div>
        </div>
      )}

      {stage === "ready" && record && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, animation: "rise .6s ease both" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textAlign: "center" }}>
            <span className="hb-eyebrow">Curated by HYPE</span>
            <h1 className="hb-h1" style={{ fontSize: "clamp(32px, 8vw, 52px)" }}>Your {name} <span className="hb-accent">is ready</span></h1>
          </div>

          <StoryPreview moments={moments} tracks={tracks} slide={slide} photoUrl={photoUrl} focus={focus} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { txt: `${moments.length} moments`, color: "#FF4FD8", border: "rgba(255,79,216,.5)" },
              { txt: `${Math.min(5, tracks.length)} tracks`, color: "#3DF5FF", border: "rgba(61,245,255,.5)" },
              ...(stravaOn ? [{ txt: `${sources!.strava.count} ${sources!.strava.kind}`, color: "#FFE14D", border: "rgba(255,225,77,.5)" }] : []),
            ].map((s) => (
              <span key={s.txt} style={{ padding: "9px 16px", borderRadius: 999, border: `1px solid ${s.border}`, color: s.color, fontWeight: 700, fontSize: 14 }}>{s.txt}</span>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Link href={`/wrapped/${month}/story`} className="hb-cta is-live" style={{ padding: "0 36px" }}>Watch my hype</Link>
            <button className="hb-ghost" onClick={() => setStage("connect")}>Change sources</button>
            <button className="hb-ghost" onClick={startCurate}>Re-curate ↺</button>
            <Link href="/archive" className="hb-ghost" style={{ display: "flex", alignItems: "center", color: "#B9B4CC" }}>All my hypes →</Link>
          </div>
        </div>
      )}
    </HypeShell>
  );
}

// Resolves once the images are in the browser cache (or after 6s regardless).
function preload(urls: string[]) {
  return Promise.race([
    Promise.all(urls.map((u) => new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = img.onerror = () => resolve();
      img.src = u;
    }))),
    new Promise<void>((resolve) => setTimeout(resolve, 6000)),
  ]);
}

function doneText(k: SourceKey, st: SourceStatus, month: string) {
  const n = st.count.toLocaleString("en-US");
  if (k === "photos") return `${n} photo${st.count === 1 ? "" : "s"} from ${month}`;
  if (k === "music") return `Top ${n} tracks synced`;
  return st.count === 0 ? `No activities in ${month}` : `${n} ${st.kind} this month`;
}

function ring(color: string, glow: string, delay: string): CSSProperties {
  return {
    position: "absolute", left: "50%", top: "50%", width: "46%", aspectRatio: 1, borderRadius: "50%",
    border: `1.5px solid ${color}`, boxShadow: `0 0 20px ${glow}`, animation: `ringOut 3s ${delay} ease-out infinite both`,
  };
}

function StoryPreview({
  moments,
  tracks,
  slide,
  photoUrl,
  focus,
}: {
  moments: { id: string; caption: string; photo?: Photo }[];
  tracks: Track[];
  slide: number;
  photoUrl: (id: string) => string;
  focus: Map<string, Focus>;
}) {
  const cur = moments[slide];
  const odd = slide % 2 === 1;
  const date = cur?.photo?.createTime
    ? new Date(cur.photo.createTime).toLocaleDateString("en-US", { month: "short", day: "2-digit", weekday: "short" }).replace(/^(\w+), (\w+) (\d+)$/, "$2 $3 · $1")
    : "";
  const track = tracks.length ? tracks[slide % Math.min(5, tracks.length)].name : "";

  return (
    <div style={{ position: "relative", width: "min(76vw, 300px)", aspectRatio: "9 / 16", borderRadius: 34, padding: 8, boxSizing: "border-box", background: "#15121F", border: "1px solid rgba(245,243,255,.16)", boxShadow: "0 30px 80px rgba(0,0,0,.7), 0 0 60px rgba(255,79,216,.25)" }}>
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: 26, overflow: "hidden", background: "#100E18" }}>
        <div
          key={`bg-${slide}`}
          style={{
            position: "absolute", inset: 0,
            background: gradientOf(PAL[slide % PAL.length]),
            animation: `${odd ? "kenB" : "kenA"} ${SLIDE_MS}ms ease-out both`,
          }}
        >
          {cur && <SmartPhoto src={photoUrl(cur.id)} focus={focus.get(cur.id)} />}
        </div>
        <div style={{ position: "absolute", left: 10, right: 10, top: 10, display: "flex", gap: 3 }}>
          {moments.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: "rgba(245,243,255,.3)", overflow: "hidden" }}>
              <div
                key={i === slide ? `on-${slide}` : "off"}
                style={{ height: "100%", width: i <= slide ? "100%" : "0%", background: "#F5F3FF", animation: i === slide ? `${odd ? "fillB" : "fillA"} ${SLIDE_MS}ms linear both` : "none" }}
              />
            </div>
          ))}
        </div>
        {track && (
          <div style={{ position: "absolute", left: 12, top: 24, display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 999, background: "rgba(7,6,11,.6)", backdropFilter: "blur(8px)", maxWidth: "calc(100% - 44px)" }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 12, flex: "none" }}>
              {EQ.map((d) => (
                <span key={d} style={{ width: 2, height: "100%", borderRadius: 2, background: "#3DF5FF", transformOrigin: "bottom", animation: "eqb .8s ease-in-out infinite", animationDelay: `-${d}s` }} />
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{track}</span>
          </div>
        )}
        <div
          key={`cap-${slide}`}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "80px 18px 22px", background: "linear-gradient(to top, rgba(7,6,11,.92), transparent)", display: "flex", flexDirection: "column", gap: 6, animation: `${odd ? "capB" : "capA"} .7s .25s ease-out both` }}
        >
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(245,243,255,.8)" }}>{date}</span>
          <span style={{ fontFamily: "var(--f-syne)", fontWeight: 800, fontSize: 24, lineHeight: 1.05, letterSpacing: "-.02em", textTransform: "uppercase" }}>{cur?.caption || `Moment ${slide + 1}`}</span>
        </div>
      </div>
    </div>
  );
}
