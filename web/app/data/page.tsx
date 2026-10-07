"use client";

import { useEffect, useState } from "react";
import { HypeShell } from "../_components/HypeShell";

type View = "recent" | "top";
type Row = { key: string; img?: string; name: string; meta: string };

const TABS: { v: View; label: string; accent: string }[] = [
  { v: "recent", label: "Recently played", accent: "#3DF5FF" },
  { v: "top", label: "Top artists", accent: "#FF4FD8" },
];

export default function DataViewer() {
  const [view, setView] = useState<View>("recent");
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  function pick(v: View) {
    if (v === view) return;
    setView(v);
    setLoading(true);
    setError("");
  }

  useEffect(() => {
    fetch(view === "recent" ? "/api/recently-played" : "/api/top-artists", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        setRows(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data.items.map((item: any, i: number): Row => {
            if (view === "recent") {
              const t = item.track;
              return {
                key: `${t.id}-${i}`,
                img: t.album.images[2]?.url ?? t.album.images[0]?.url,
                name: t.name,
                meta: `${t.artists.map((a: { name: string }) => a.name).join(", ")} · ${new Date(item.played_at).toLocaleString()}`,
              };
            }
            return {
              key: item.id,
              img: item.images?.[2]?.url ?? item.images?.[0]?.url,
              name: item.name,
              meta: (item.genres ?? []).slice(0, 3).join(", ") || "No genres listed",
            };
          })
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [view]);

  const accent = TABS.find((t) => t.v === view)!.accent;

  return (
    <HypeShell ambient={view === "recent" ? "rgba(61,245,255,.16)" : "rgba(255,79,216,.16)"} nav="sound">
      <div style={{ display: "flex", flexDirection: "column", gap: 28, animation: "rise .5s ease both" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h1 className="hb-h1">Your <span className="hb-accent">sound</span></h1>
          <p className="hb-lede">What HYPE sees from Spotify right now.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TABS.map((t) => {
            const on = t.v === view;
            return (
              <button
                key={t.v}
                className="hb-btn"
                onClick={() => pick(t.v)}
                style={on ? { background: t.accent, borderColor: t.accent, color: "#07060B" } : undefined}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loading && (
            <span className="hb-note" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="hb-spinner" style={{ borderTopColor: accent }} /> Loading
            </span>
          )}
          {error && <span className="hb-card-sub hb-error">{error}</span>}
          {!loading &&
            !error &&
            rows.map((r) => (
              <div key={r.key} className="hb-card" style={{ gridTemplateColumns: "52px minmax(0, 1fr)", padding: "12px 16px 12px 12px" }}>
                <div className="hb-tile" style={{ background: r.img ? `url("${r.img}") center/cover` : `${accent}1A`, border: `1px solid ${accent}55` }}>
                  {!r.img && <span style={{ color: accent }}>{r.name[0]}</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                  <span className="hb-card-title" style={{ fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</span>
                  <span className="hb-card-sub" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.meta}</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </HypeShell>
  );
}
