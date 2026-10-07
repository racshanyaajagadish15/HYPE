"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type View = "recent" | "top" | "photos";

export default function Home() {
  const [view, setView] = useState<View>("recent");

  return (
    <div className="max-w-2xl mx-auto my-8 px-4 text-zinc-100">
      <h1 className="text-xl font-semibold mb-4">Data Viewer</h1>
      <nav className="flex gap-2 mb-4">
        <button
          onClick={() => setView("recent")}
          className={`px-4 py-2 rounded ${view === "recent" ? "bg-green-500 text-black" : "bg-zinc-800"}`}
        >
          Recently Played
        </button>
        <button
          onClick={() => setView("top")}
          className={`px-4 py-2 rounded ${view === "top" ? "bg-green-500 text-black" : "bg-zinc-800"}`}
        >
          Top Artists
        </button>
        <button
          onClick={() => setView("photos")}
          className={`px-4 py-2 rounded ${view === "photos" ? "bg-green-500 text-black" : "bg-zinc-800"}`}
        >
          Photos
        </button>
        <Link href="/wrapped" className="px-4 py-2 rounded bg-zinc-800 hover:bg-zinc-700">
          Wrapped
        </Link>
      </nav>

      {view === "photos" ? <PhotosView /> : <SpotifyView view={view} />}
    </div>
  );
}

function SpotifyView({ view }: { view: "recent" | "top" }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(view === "recent" ? "/api/recently-played" : "/api/top-artists")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || res.statusText);
        setItems(data.items);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [view]);

  return (
    <>
      {loading && <p className="text-zinc-400">Loading...</p>}
      {error && <p className="text-red-400">Error: {error}</p>}

      <ul>
        {items.map((item, i) => {
          const track = view === "recent" ? item.track : null;
          const img = view === "recent" ? track.album.images[2]?.url ?? track.album.images[0]?.url : item.images?.[2]?.url ?? item.images?.[0]?.url;
          const name = view === "recent" ? track.name : item.name;
          const meta =
            view === "recent"
              ? `${track.artists.map((a: any) => a.name).join(", ")} · ${new Date(item.played_at).toLocaleString()}`
              : (item.genres ?? []).slice(0, 3).join(", ") || "no genres listed";

          return (
            <li key={i} className="flex items-center gap-3 py-2 border-b border-zinc-800">
              {img && <img src={img} alt="" className="w-12 h-12 rounded" />}
              <div>
                <div className="font-semibold">{name}</div>
                <div className="text-sm text-zinc-400">{meta}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

type PhotoItem = { id: string; mediaFile: { baseUrl: string; filename: string } };
type Status = "idle" | "waiting" | "ready" | "error";

function PhotosView() {
  const [status, setStatus] = useState<Status>("idle");
  const [items, setItems] = useState<PhotoItem[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => () => clearInterval(pollRef.current), []);

  async function connect() {
    setStatus("waiting");
    setError("");
    try {
      const session = await fetch("/api/photos/session", { method: "POST" }).then((r) => r.json());
      window.open(session.pickerUri, "_blank");

      pollRef.current = setInterval(async () => {
        const s = await fetch(`/api/photos/session/${session.id}`).then((r) => r.json());
        if (s.mediaItemsSet) {
          clearInterval(pollRef.current);
          const { items } = await fetch(`/api/photos/items/${session.id}`).then((r) => r.json());
          setItems(items);
          setStatus("ready");
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message);
      setStatus("error");
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (status === "idle" || status === "error") {
    return (
      <div>
        {error && <p className="text-red-400 mb-2">Error: {error}</p>}
        <button onClick={connect} className="px-4 py-2 rounded bg-green-500 text-black">
          Connect Google Photos
        </button>
      </div>
    );
  }

  if (status === "waiting") {
    return <p className="text-zinc-400">A picker tab opened — choose your photos there, then come back here.</p>;
  }

  return (
    <div>
      <p className="text-sm text-zinc-400 mb-2">
        {selected.size} of {items.length} selected
      </p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`relative rounded overflow-hidden border-2 ${selected.has(item.id) ? "border-green-500" : "border-transparent"}`}
          >
            <img
              src={`/api/photos/image?url=${encodeURIComponent(item.mediaFile.baseUrl)}&w=300`}
              alt={item.mediaFile.filename}
              className="w-full h-32 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
