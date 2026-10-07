"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

export type Focus = { x: number; y: number };

// Upper-centre: where faces usually are when we have no focus point yet.
const DEFAULT_FOCUS: Focus = { x: 50, y: 38 };

/**
 * Fills its (positioned) parent with a photo without butchering it:
 * - normally crops ("cover") anchored on the photo's focus point, so faces stay in frame;
 * - if the photo's shape is so different from the frame that a crop would cut away more
 *   than `maxCrop` of it (e.g. a wide group shot in a tall story frame), it shows the
 *   whole photo ("contain") over a blurred, darkened copy of itself instead.
 */
export function SmartPhoto({
  src,
  focus,
  maxCrop = 0.35,
  fit = "auto",
  style,
}: {
  src: string;
  focus?: Focus | null;
  maxCrop?: number;
  fit?: "auto" | "cover";
  style?: CSSProperties;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [contain, setContain] = useState(false);
  const f = focus ?? DEFAULT_FOCUS;

  const decide = useCallback(() => {
    const img = imgRef.current, wrap = wrapRef.current;
    if (fit === "cover" || !img?.naturalWidth || !wrap?.clientHeight) return;
    const ia = img.naturalWidth / img.naturalHeight;
    const fa = wrap.clientWidth / wrap.clientHeight;
    setContain(1 - Math.min(ia, fa) / Math.max(ia, fa) > maxCrop);
  }, [fit, maxCrop]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !window.ResizeObserver) return;
    const ro = new ResizeObserver(decide);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [decide]);

  const fill: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", maxWidth: "none" };
  return (
    <div ref={wrapRef} style={{ position: "absolute", inset: 0, overflow: "hidden", ...style }}>
      {contain && (
        <img src={src} alt="" aria-hidden="true" style={{ ...fill, objectFit: "cover", objectPosition: `${f.x}% ${f.y}%`, filter: "blur(22px) brightness(.55) saturate(1.2)", transform: "scale(1.15)" }} />
      )}
      <img
        ref={imgRef}
        src={src}
        alt=""
        onLoad={decide}
        style={{ ...fill, objectFit: contain ? "contain" : "cover", objectPosition: contain ? "50% 50%" : `${f.x}% ${f.y}%` }}
      />
    </div>
  );
}

/** CSS background-position for a focus point (for tiny tiles that use background images). */
export const focusPosition = (focus?: Focus | null) => `${(focus ?? DEFAULT_FOCUS).x}% ${(focus ?? DEFAULT_FOCUS).y}%`;

/** Builds a focus lookup from a month record's AI photo notes. */
export function focusMap(notes?: { id: string; focusX?: number; focusY?: number }[] | null) {
  const m = new Map<string, Focus>();
  for (const n of notes ?? []) if (n.focusX != null && n.focusY != null) m.set(n.id, { x: n.focusX, y: n.focusY });
  return m;
}
