"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import "./sitenav.css";

export type NavPage = "home" | "create" | "archive" | "sound" | "story";

const PAGES: { key: NavPage; href: string; label: string; hint: string }[] = [
  { key: "home", href: "/", label: "Home", hint: "Landing" },
  { key: "create", href: "/create", label: "+ Make a HYPE", hint: "This month" },
  { key: "archive", href: "/archive", label: "Your HYPEs", hint: "All stories" },
  { key: "sound", href: "/data", label: "Your sound", hint: "Spotify" },
];

/**
 * Buttons to every page. Wide screens get a row of pills; narrow screens get
 * the primary "Make a hype" pill plus a ☰ menu. `menuOnly` always uses the menu
 * (for tight spots like the story player); `onOpenChange` lets a host pause.
 */
export function SiteNav({ current, menuOnly = false, onOpenChange }: { current?: NavPage; menuOnly?: boolean; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLElement>(null);

  const setMenu = (v: boolean) => {
    setOpen(v);
    onOpenChange?.(v);
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const pill = (p: (typeof PAGES)[number]) => (
    <Link
      key={p.key}
      href={p.href}
      className={`sn-pill${p.key === "create" && current !== "create" ? " sn-primary" : ""}`}
      aria-current={p.key === current ? "page" : undefined}
    >
      {p.label}
    </Link>
  );

  return (
    <nav ref={ref} aria-label="Pages" className={`sn${menuOnly ? " sn-menu-only" : ""}`} onPointerDown={(e) => e.stopPropagation()}>
      <div className="sn-pills sn-pills-wide">{PAGES.map(pill)}</div>
      {current !== "create" && <div className="sn-pills sn-pills-narrow">{pill(PAGES[1])}</div>}
      <button type="button" className="sn-pill sn-burger" aria-label="All pages" aria-expanded={open} onClick={() => setMenu(!open)}>
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="sn-panel" role="menu">
          {PAGES.map((p) => (
            <Link key={p.key} href={p.href} role="menuitem" aria-current={p.key === current ? "page" : undefined} onClick={() => setMenu(false)}>
              {p.label.replace(/^\+ /, "")}
              <span>{p.key === current ? "You're here" : p.hint}</span>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
