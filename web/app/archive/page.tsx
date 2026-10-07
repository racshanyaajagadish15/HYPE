"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { SmartPhoto, focusMap } from "../_components/SmartPhoto";
import { SiteNav } from "../_components/SiteNav";
import "./archive.css";

const NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PAL: [string, string][] = [["#FF4FD8", "#2A0B3D"], ["#3DF5FF", "#0B2A3D"], ["#FFE14D", "#3D1F0B"], ["#B06CFF", "#140B2E"], ["#3DF5FF", "#3A0F52"], ["#FF4FD8", "#0B2A3D"]];
const ACC = ["#FF4FD8", "#3DF5FF", "#FFE14D", "#B06CFF"];
const GLOW = ["rgba(255,79,216,.35)", "rgba(61,245,255,.3)", "rgba(255,225,77,.3)", "rgba(176,108,255,.35)"];
const NEW_DROP_DAYS = 14;

type Track = { id: string; name: string };
type MonthRecord = {
  month: string;
  photos: { id: string }[];
  music: { topTracks: Track[] } | null;
  narrative: string | null;
  photoNotes?: { id: string; focusX?: number; focusY?: number }[];
  story?: {
    hero: { id: string };
    moments: unknown[];
    song: { trackId: string } | null;
    blurb?: string;
    generatedAt?: string;
  } | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
const plain = (s: string) => s.replace(/\{\w+:([^{}]*)\}/g, "$1");

export default function Archive() {
  const router = useRouter();
  const [records, setRecords] = useState<MonthRecord[] | null>(null);
  const [error, setError] = useState("");
  const [year, setYear] = useState<number | null>(null);

  const [nowMs] = useState(() => Date.now());
  const now = new Date(nowMs);
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;

  useEffect(() => {
    fetch("/api/months", { cache: "no-store" })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || r.statusText);
        setRecords(data.months);
      })
      .catch((err) => setError(err.message));
  }, []);

  const byMonth = useMemo(() => new Map((records ?? []).map((r) => [r.month, r])), [records]);
  const years = useMemo(() => {
    const ys = new Set([thisYear, ...(records ?? []).map((r) => Number(r.month.slice(0, 4)))]);
    return [...ys].sort((a, b) => a - b);
  }, [records, thisYear]);

  // ?year= wins; otherwise the year of the newest story (or this year).
  useEffect(() => {
    if (!records || year != null) return;
    const fromUrl = Number(new URLSearchParams(window.location.search).get("year"));
    const newest = records.filter((r) => r.story).map((r) => r.month).sort().pop();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial year depends on fetched data + URL
    setYear(years.includes(fromUrl) ? fromUrl : newest ? Number(newest.slice(0, 4)) : thisYear);
  }, [records, year, years, thisYear]);

  const pickYear = (y: number) => {
    setYear(y);
    router.replace(`/archive?year=${y}`, { scroll: false });
  };

  const y = year ?? thisYear;
  const songOf = (r: MonthRecord) => {
    const tracks = r.music?.topTracks ?? [];
    return (tracks.find((t) => t.id === r.story?.song?.trackId) ?? tracks[0])?.name ?? "—";
  };
  const photoOf = (r: MonthRecord, id?: string) => (id ? `/api/months/${r.month}/photos/${encodeURIComponent(id)}` : null);

  const months = NAMES.map((name, k) => {
    const n = k + 1;
    const key = `${y}-${pad(n)}`;
    const rec = byMonth.get(key);
    const done = !!rec?.story;
    const isFuture = y > thisYear || (y === thisYear && n > thisMonth);
    const isCurrent = y === thisYear && n === thisMonth;
    const lastDay = new Date(y, n, 0).getDate();
    return {
      key, n, name, num: pad(n), rec, done,
      accent: ACC[k % 4], glow: GLOW[k % 4], bg: `linear-gradient(160deg, ${PAL[k % 6][0]}, ${PAL[k % 6][1]})`,
      tilt: k % 2 ? "1deg" : "-1deg",
      d: `${(0.15 + k * 0.05).toFixed(2)}s`,
      // Not-yet-made months: future ones are locked; the rest link to the builder.
      makeable: !done && !isFuture,
      note: done ? "" : isFuture ? "Coming soon" : isCurrent ? `Drops ${name.slice(0, 3)} ${lastDay}` : rec ? "Draft" : "Not made",
      cta: done || isFuture ? "" : isCurrent ? "Make it now →" : rec ? "Finish it →" : "Make it →",
    };
  });

  const doneMonths = months.filter((m) => m.done);
  const latest = doneMonths[doneMonths.length - 1];
  const grid = months.filter((m) => m !== latest).reverse();
  const latestFocus = latest ? focusMap(latest.rec!.photoNotes) : null;
  const isNew = latest?.rec?.story?.generatedAt && nowMs - Date.parse(latest.rec.story.generatedAt) < NEW_DROP_DAYS * 864e5;
  const yi = years.indexOf(y);

  return (
    <div className="ha-root">
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.5, backgroundImage: "radial-gradient(rgba(245,243,255,.07) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
      <div style={{ position: "fixed", left: "50%", top: "-30vh", width: "130vw", height: "90vh", transform: "translateX(-50%)", pointerEvents: "none", background: "radial-gradient(closest-side, rgba(255,79,216,.16), rgba(176,108,255,.06) 60%, transparent)" }} />

      <div style={{ position: "relative", maxWidth: 1180, margin: "0 auto", padding: "24px clamp(16px, 4vw, 40px) 72px", display: "flex", flexDirection: "column", gap: "clamp(32px, 5vw, 56px)" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, minHeight: 44 }}>
          <Link href="/" aria-label="HYPE home" style={{ display: "flex", alignItems: "center", minHeight: 44 }}>
            <img src="/landing/hype-logo.png" alt="HYPE" style={{ display: "block", height: 24, width: "auto" }} />
          </Link>
          <SiteNav current="archive" />
        </header>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 20, animation: "rise .6s ease both" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="ha-mono" style={{ fontSize: 13, letterSpacing: ".3em", textTransform: "uppercase", color: "#3DF5FF" }}>Your archive</span>
              {years.length > 1 && (
                <span style={{ display: "flex", gap: 6 }}>
                  <button className="ha-year" aria-label="Previous year" disabled={yi <= 0} onClick={() => pickYear(years[yi - 1])}>‹</button>
                  <button className="ha-year" aria-label="Next year" disabled={yi >= years.length - 1} onClick={() => pickYear(years[yi + 1])}>›</button>
                </span>
              )}
            </div>
            <h1 className="ha-syne" style={{ margin: 0, fontSize: "clamp(44px, 9vw, 110px)", lineHeight: 0.9, letterSpacing: "-.045em", textTransform: "uppercase" }}>
              {y} <span style={{ color: "#FF4FD8", textShadow: "0 0 30px rgba(255,79,216,.55)" }}>in hype</span>
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="ha-mono" style={{ fontSize: 13, letterSpacing: ".14em", textTransform: "uppercase", color: "#B9B4CC" }}>{records ? doneMonths.length : "–"}/12 stories</span>
            <div style={{ display: "flex", gap: 4 }}>
              {months.map((m, k) => (
                <span key={m.key} title={`${m.name}${m.done ? " ✓" : ""}`} style={{ width: 8, height: 22, borderRadius: 4, background: m.done ? ACC[k % 4] : "rgba(245,243,255,.12)", boxShadow: m.done ? `0 0 8px ${ACC[k % 4]}` : "none" }} />
              ))}
            </div>
          </div>
        </div>

        {error && <p style={{ margin: 0, color: "#FF8A8A" }}>Couldn&apos;t load your archive: {error}</p>}

        {records && (latest ? (
          <Link href={`/wrapped/${latest.key}/story`} className="ha-latest">
            <div style={{ position: "relative", minHeight: "clamp(260px, 34vw, 400px)", background: latest.bg, overflow: "hidden" }}>
              {photoOf(latest.rec!, latest.rec!.story!.hero.id) && <SmartPhoto src={photoOf(latest.rec!, latest.rec!.story!.hero.id)!} focus={latestFocus!.get(latest.rec!.story!.hero.id)} fit="cover" />}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,6,11,.7), rgba(7,6,11,.05) 55%)" }} />
              <div style={{ position: "absolute", left: "50%", top: "50%", width: "70%", aspectRatio: 1, transform: "translate(-50%, -50%)", borderRadius: "50%", background: "conic-gradient(rgba(255,79,216,.5), rgba(61,245,255,.4), rgba(255,225,77,.35), rgba(176,108,255,.5), rgba(255,79,216,.5))", filter: "blur(50px)", opacity: 0.55, mixBlendMode: "screen", animation: "spin 12s linear infinite" }} />
              <div className="ha-syne" style={{ position: "absolute", left: "clamp(20px, 3vw, 32px)", bottom: "clamp(16px, 2.4vw, 26px)", fontSize: "clamp(110px, 16vw, 200px)", lineHeight: 0.8, letterSpacing: "-.05em", color: "transparent", WebkitTextStroke: "2px #F5F3FF", filter: "drop-shadow(0 0 18px rgba(255,255,255,.35))" }}>{latest.num}</div>
              <div className="ha-mono" style={{ position: "absolute", right: 20, top: 20, display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "#FFE14D", color: "#07060B", fontWeight: 500, fontSize: 12, letterSpacing: ".16em", textTransform: "uppercase" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#07060B", animation: isNew ? "blink 1.2s ease-in-out infinite" : "none" }} />
                {isNew ? "New drop" : "Latest"}
              </div>
            </div>
            <div style={{ padding: "clamp(24px, 4vw, 44px)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 28, containerType: "inline-size", minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span className="ha-mono" style={{ fontSize: 12, letterSpacing: ".24em", textTransform: "uppercase", color: "#B9B4CC" }}>Latest · {latest.num}/12</span>
                <span className="ha-syne" style={{ fontSize: "min(64px, 8.6cqw)", lineHeight: 0.9, letterSpacing: "-.04em", textTransform: "uppercase", whiteSpace: "nowrap", maxWidth: "100%", overflow: "hidden" }}>{latest.name}</span>
                <p style={{ margin: 0, maxWidth: 420, fontSize: 16, lineHeight: 1.5, color: "#B9B4CC", textWrap: "pretty", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {latest.rec!.story!.blurb || plain(latest.rec!.narrative ?? "")}
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                <span style={{ minHeight: 56, padding: "0 28px", display: "inline-flex", alignItems: "center", gap: 10, borderRadius: 999, background: "#FF4FD8", color: "#07060B", fontWeight: 700, fontSize: 16, animation: "pulseBtn 2.4s infinite" }}>▶ Watch story</span>
                <span className="ha-mono" style={{ fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#B9B4CC" }}>
                  {latest.rec!.story!.moments.length} moments · ♫ {songOf(latest.rec!)}
                </span>
              </div>
            </div>
          </Link>
        ) : (
          <Link href="/create" className="ha-latest">
            <div style={{ position: "relative", minHeight: "clamp(260px, 34vw, 400px)", background: "linear-gradient(160deg, #FF4FD8, #2A0B3D)", overflow: "hidden" }}>
              <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,.06) 0 16px, transparent 16px 32px)" }} />
              <div style={{ position: "absolute", left: "50%", top: "50%", width: "70%", aspectRatio: 1, transform: "translate(-50%, -50%)", borderRadius: "50%", background: "conic-gradient(rgba(255,79,216,.5), rgba(61,245,255,.4), rgba(255,225,77,.35), rgba(176,108,255,.5), rgba(255,79,216,.5))", filter: "blur(50px)", animation: "spin 12s linear infinite" }} />
              <div className="ha-syne" style={{ position: "absolute", left: "clamp(20px, 3vw, 32px)", bottom: "clamp(16px, 2.4vw, 26px)", fontSize: "clamp(110px, 16vw, 200px)", lineHeight: 0.8, letterSpacing: "-.05em", color: "transparent", WebkitTextStroke: "2px #F5F3FF" }}>{pad(y === thisYear ? thisMonth : 1)}</div>
            </div>
            <div style={{ padding: "clamp(24px, 4vw, 44px)", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 28, containerType: "inline-size", minWidth: 0 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <span className="ha-mono" style={{ fontSize: 12, letterSpacing: ".24em", textTransform: "uppercase", color: "#B9B4CC" }}>Nothing here yet</span>
                <span className="ha-syne" style={{ fontSize: "min(64px, 8.6cqw)", lineHeight: 0.9, letterSpacing: "-.04em", textTransform: "uppercase" }}>No {y} stories</span>
                <p style={{ margin: 0, maxWidth: 420, fontSize: 16, lineHeight: 1.5, color: "#B9B4CC" }}>Connect your photos and songs and HYPE turns the month into a story you&apos;ll watch again.</p>
              </div>
              <span style={{ alignSelf: "flex-start", minHeight: 56, padding: "0 28px", display: "inline-flex", alignItems: "center", borderRadius: 999, background: "#FF4FD8", color: "#07060B", fontWeight: 700, fontSize: 16, animation: "pulseBtn 2.4s infinite" }}>Make your first hype ✶</span>
            </div>
          </Link>
        ))}

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <span className="ha-mono" style={{ fontSize: 12, letterSpacing: ".24em", textTransform: "uppercase", color: "#B9B4CC" }}>All months</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 210px), 1fr))", gap: "clamp(12px, 2vw, 20px)" }}>
            {records &&
              grid.map((m) => {
                const vars = { "--accent": m.accent, "--glow": m.glow, "--tilt": m.tilt } as CSSProperties;
                if (m.done) {
                  const r = m.rec!;
                  const heroId = r.story!.hero.id;
                  return (
                    <Link key={m.key} href={`/wrapped/${m.key}/story`} className="ha-card" style={{ ...vars, animation: `rise .6s ${m.d} ease both` }}>
                      <div style={{ height: 4, background: "linear-gradient(90deg, #FF4FD8, #3DF5FF, #FFE14D, #B06CFF, #FF4FD8)", backgroundSize: "200% 100%", animation: "holo 4s linear infinite" }} />
                      <div style={{ position: "relative", aspectRatio: "4 / 3", background: m.bg, overflow: "hidden" }}>
                        <SmartPhoto src={photoOf(r, heroId)!} focus={focusMap(r.photoNotes).get(heroId)} fit="cover" />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(7,6,11,.6), transparent 60%)" }} />
                        <div className="ha-syne" style={{ position: "absolute", left: 14, bottom: 8, fontSize: 76, lineHeight: 0.8, letterSpacing: "-.05em", color: "transparent", WebkitTextStroke: "1.5px #F5F3FF" }}>{m.num}</div>
                      </div>
                      <div style={{ position: "relative", height: 0, borderTop: "2px dashed rgba(245,243,255,.14)", margin: "0 14px" }}>
                        <span style={{ position: "absolute", left: -24, top: -9, width: 16, height: 16, borderRadius: "50%", background: "#07060B" }} />
                        <span style={{ position: "absolute", right: -24, top: -9, width: 16, height: 16, borderRadius: "50%", background: "#07060B" }} />
                      </div>
                      <div style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                          <span className="ha-syne" style={{ fontSize: m.name.length > 7 ? 17 : 20, letterSpacing: "-.02em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{m.name}</span>
                          <span className="ha-mono" style={{ fontSize: 11, color: m.accent, whiteSpace: "nowrap" }}>{r.story!.moments.length} moments</span>
                        </div>
                        <span style={{ fontSize: 13, color: "#B9B4CC", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>♫ {songOf(r)}</span>
                      </div>
                    </Link>
                  );
                }
                const body = (
                  <>
                    <span className="ha-syne" style={{ fontSize: 76, lineHeight: 0.8, letterSpacing: "-.05em", color: "transparent", WebkitTextStroke: "1.5px rgba(245,243,255,.16)" }}>{m.num}</span>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span className="ha-syne" style={{ fontSize: m.name.length > 7 ? 17 : 20, letterSpacing: "-.02em", textTransform: "uppercase", whiteSpace: "nowrap", color: "#B9B4CC" }}>{m.name}</span>
                      <span className="ha-mono" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>{m.note}</span>
                      {m.cta && <span className="ha-mono ha-locked-cta" style={{ fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", transition: "color .25s ease" }}>{m.cta}</span>}
                    </div>
                  </>
                );
                return m.makeable ? (
                  <Link key={m.key} href={`/wrapped/${m.key}`} className="ha-locked" style={{ ...vars, animation: `rise .6s ${m.d} ease both` }}>{body}</Link>
                ) : (
                  <div key={m.key} aria-disabled="true" className="ha-locked" style={{ animation: `rise .6s ${m.d} ease both` }}>{body}</div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}
