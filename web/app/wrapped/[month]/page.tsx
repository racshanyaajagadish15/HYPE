"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Photo = { id: string; filename: string };
type Track = { id: string; name: string; artists: { name: string }[] };
type Artist = { id: string; name: string };
type MonthRecord = {
  month: string;
  photos: Photo[];
  music: { topTracks: Track[]; topArtists: Artist[] } | null;
  narrative: string | null;
  coverPhotoId: string | null;
  moments: { id: string; caption: string }[];
  montagePath: string | null;
  montageStatus: "idle" | "processing" | "done" | "error";
  montageError: string | null;
};

export default function MonthDetail() {
  const { month } = useParams<{ month: string }>();
  const [record, setRecord] = useState<MonthRecord | null>(null);
  const [busy, setBusy] = useState<string>("");
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval>>();
  const montagePollRef = useRef<ReturnType<typeof setInterval>>();

  const load = () => fetch(`/api/months/${month}`).then((r) => r.json()).then(setRecord);

  useEffect(() => {
    load();
    return () => {
      clearInterval(pollRef.current);
      clearInterval(montagePollRef.current);
    };
  }, [month]);

  async function run(label: string, fn: () => Promise<Response>) {
    setBusy(label);
    setError("");
    try {
      const res = await fn();
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy("");
    }
  }

  async function selectPhotos() {
    setBusy("photos");
    setError("");
    try {
      const session = await fetch("/api/photos/session", { method: "POST" }).then((r) => r.json());
      window.open(session.pickerUri, "_blank");

      pollRef.current = setInterval(async () => {
        const s = await fetch(`/api/photos/session/${session.id}`).then((r) => r.json());
        if (s.mediaItemsSet) {
          clearInterval(pollRef.current);
          await run("photos", () =>
            fetch(`/api/months/${month}/photos/finalize`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ sessionId: session.id }),
            })
          );
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setBusy("");
    }
  }

  async function generateMontage() {
    setBusy("montage");
    setError("");
    try {
      const res = await fetch(`/api/months/${month}/montage`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || res.statusText);
      setRecord(data);

      montagePollRef.current = setInterval(async () => {
        const r = await fetch(`/api/months/${month}`).then((r) => r.json());
        if (r.montageStatus === "done" || r.montageStatus === "error") {
          clearInterval(montagePollRef.current);
          setRecord(r);
          setBusy("");
          if (r.montageStatus === "error") setError(r.montageError || "Montage generation failed");
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setBusy("");
    }
  }

  async function share() {
    const res = await fetch(`/api/months/${month}/montage`);
    const blob = await res.blob();
    const file = new File([blob], `${month}-wrapped.mp4`, { type: "video/mp4" });
    const nav = navigator as any;
    if (nav.canShare?.({ files: [file] })) {
      await nav.share({ files: [file], title: `${month} Wrapped` });
    } else {
      alert("This browser can't share files directly — use Download instead.");
    }
  }

  if (!record) return <div className="max-w-2xl mx-auto my-8 px-4 text-zinc-100">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto my-8 px-4 text-zinc-100">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">{month} Wrapped</h1>
        <Link href="/wrapped" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← All months
        </Link>
      </div>

      {record.moments.length > 0 && record.narrative && (
        <Link
          href={`/wrapped/${month}/story`}
          className="block mb-6 px-4 py-3 rounded bg-green-500 text-black font-semibold text-center hover:bg-green-400"
        >
          ✨ View Interactive Story
        </Link>
      )}

      {error && <p className="text-red-400 mb-4">Error: {error}</p>}

      <Step title="1. Photos" done={record.photos.length > 0}>
        <button onClick={selectPhotos} disabled={!!busy} className="px-4 py-2 rounded bg-green-500 text-black font-semibold disabled:opacity-50">
          {busy === "photos" ? "Waiting for picker..." : "Select Photos"}
        </button>
        {record.photos.length > 0 && (
          <div className="grid grid-cols-4 gap-2 mt-3">
            {record.photos.map((p) => {
              const moment = record.moments?.find((m) => m.id === p.id);
              return (
                <div key={p.id} className="relative">
                  <img
                    src={`/api/months/${month}/photos/${p.id}`}
                    alt={p.filename}
                    className={`w-full h-20 object-cover rounded ${p.id === record.coverPhotoId ? "ring-2 ring-green-500" : moment ? "ring-1 ring-zinc-500" : ""}`}
                  />
                  {moment?.caption && <p className="text-[10px] text-zinc-400 mt-0.5 truncate">{moment.caption}</p>}
                </div>
              );
            })}
          </div>
        )}
      </Step>

      <Step title="2. Music" done={!!record.music}>
        <button
          onClick={() => run("music", () => fetch(`/api/months/${month}/music/snapshot`, { method: "POST" }))}
          disabled={!!busy}
          className="px-4 py-2 rounded bg-green-500 text-black font-semibold disabled:opacity-50"
        >
          {busy === "music" ? "Snapshotting..." : "Snapshot Music"}
        </button>
        {record.music && (
          <div className="mt-3 space-y-3">
            {record.music.topTracks.slice(0, 5).map((t) => (
              <iframe
                key={t.id}
                src={`https://open.spotify.com/embed/track/${t.id}`}
                width="100%"
                height="80"
                style={{ borderRadius: 8 }}
                allow="encrypted-media"
              />
            ))}
          </div>
        )}
      </Step>

      <Step title="3. Narrative" done={!!record.narrative}>
        <button
          onClick={() => run("narrative", () => fetch(`/api/months/${month}/narrative`, { method: "POST" }))}
          disabled={!!busy || record.photos.length === 0 || !record.music}
          className="px-4 py-2 rounded bg-green-500 text-black font-semibold disabled:opacity-50"
        >
          {busy === "narrative" ? "Asking Gemini..." : "Generate Narrative"}
        </button>
        {record.narrative && <p className="mt-3 text-zinc-300 italic">{record.narrative}</p>}
      </Step>

      <Step title="4. Montage" done={record.montageStatus === "done"}>
        <button
          onClick={generateMontage}
          disabled={!!busy || record.photos.length === 0 || record.montageStatus === "processing"}
          className="px-4 py-2 rounded bg-green-500 text-black font-semibold disabled:opacity-50"
        >
          {record.montageStatus === "processing" ? "Rendering (this can take a few minutes)..." : "Generate Montage"}
        </button>
        {record.montageStatus === "done" && record.montagePath && (
          <div className="mt-3 space-y-3">
            <video controls src={`/api/months/${month}/montage`} className="w-full max-w-[300px] rounded" />
            <div className="flex gap-2">
              <a href={`/api/months/${month}/montage`} download className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700">
                Download
              </a>
              <button onClick={share} className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700">
                Share
              </button>
            </div>
          </div>
        )}
      </Step>
    </div>
  );
}

function Step({ title, done, children }: { title: string; done: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-6 border border-zinc-800 rounded p-4">
      <h2 className="font-semibold mb-2">
        {title} {done && <span className="text-green-500">✓</span>}
      </h2>
      {children}
    </section>
  );
}
