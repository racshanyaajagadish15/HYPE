"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type MonthRecord = {
  month: string;
  photos: any[];
  music: any;
  narrative: string | null;
};

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function WrappedIndex() {
  const [months, setMonths] = useState<MonthRecord[]>([]);
  const [newMonth, setNewMonth] = useState(currentMonth());

  useEffect(() => {
    fetch("/api/months")
      .then((r) => r.json())
      .then((data) => setMonths(data.months));
  }, []);

  return (
    <div className="max-w-2xl mx-auto my-8 px-4 text-zinc-100">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">Wrapped</h1>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Data Viewer
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          type="month"
          value={newMonth}
          onChange={(e) => setNewMonth(e.target.value)}
          className="bg-zinc-800 rounded px-3 py-2"
        />
        <Link href={`/wrapped/${newMonth}`} className="px-4 py-2 rounded bg-green-500 text-black font-semibold">
          Open
        </Link>
      </div>

      <ul className="space-y-2">
        {months.map((m) => (
          <li key={m.month}>
            <Link href={`/wrapped/${m.month}`} className="flex items-center justify-between bg-zinc-800 rounded px-4 py-3 hover:bg-zinc-700">
              <span className="font-semibold">{m.month}</span>
              <span className="text-sm text-zinc-400">
                {m.photos.length} photo(s) · {m.music ? "music ✓" : "music ✗"} · {m.narrative ? "narrative ✓" : "narrative ✗"}
              </span>
            </Link>
          </li>
        ))}
        {months.length === 0 && <p className="text-zinc-400">No months yet — pick one above to get started.</p>}
      </ul>
    </div>
  );
}
