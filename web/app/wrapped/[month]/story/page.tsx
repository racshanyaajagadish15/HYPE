"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { renderVals, statNumericTarget, type Story } from "./design";
import { renderPage } from "./markup";
import { buildStory } from "./buildStory";
import { CHROME_CSS } from "./chromeCss";

export default function StoryPage() {
  const { month } = useParams<{ month: string }>();
  const router = useRouter();
  const [record, setRecord] = useState<any>(null);
  const [i, setI] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const rafRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/months/${month}`)
      .then((r) => r.json())
      .then(setRecord);
  }, [month]);

  const story: Story | null = useMemo(() => (record ? buildStory(record, month) : null), [record, month]);

  // Restore last-viewed slide per story id, same as the reference component.
  useEffect(() => {
    if (!story) return;
    try {
      const saved = parseInt(localStorage.getItem("hype-monthly-" + story.id) || "", 10);
      if (!isNaN(saved) && saved > 0 && saved < story.slides.length) setI(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id]);

  const go = (d: number) => {
    if (!story) return;
    const max = story.slides.length - 1;
    setI((prev) => {
      const next = Math.min(max, Math.max(0, prev + d));
      try {
        localStorage.setItem("hype-monthly-" + story.id, String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story]);

  // Animated count-up on "stat" slides — ported from the reference's count().
  useEffect(() => {
    if (!story) return;
    cancelAnimationFrame(rafRef.current!);
    const target = statNumericTarget(story, i);
    if (target == null) {
      setCount(null);
      return;
    }
    const t0 = performance.now();
    const dur = 800;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setCount(target >= 10 ? Math.round(target * e) : Math.round(target * e * 10) / 10);
      if (p < 1) rafRef.current = requestAnimationFrame(step);
    };
    setCount(0);
    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, i]);

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "HYPE Recap", url: window.location.href });
        return;
      } catch {
        return;
      }
    }
    await navigator.clipboard?.writeText(window.location.href);
    alert("Link copied!");
  }

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("[data-action]") as HTMLElement | null;
      if (!target) return;
      switch (target.dataset.action) {
        case "tap-back":
        case "back":
          go(-1);
          break;
        case "tap-next":
        case "next":
          go(1);
          break;
        case "exit":
          router.push(`/wrapped/${month}`);
          break;
        case "share":
          share();
          break;
      }
    }
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story, month]);

  if (!story) {
    return (
      <div style={{ minHeight: "100vh", background: "#050505", color: "#F7F7F2", display: "grid", placeItems: "center", fontFamily: "'DM Mono', monospace" }}>
        Loading...
      </div>
    );
  }

  const vals = renderVals(story, i, count);
  const html = renderPage(vals);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CHROME_CSS }} />
      <div ref={containerRef} dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
