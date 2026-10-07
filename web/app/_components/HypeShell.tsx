import Link from "next/link";
import type { ReactNode } from "react";
import "../hype.css";
import { SiteNav, type NavPage } from "./SiteNav";

export const PAL: [string, string][] = [
  ["#FF4FD8", "#2A0B3D"], ["#3DF5FF", "#0B2A3D"], ["#FFE14D", "#3D1F0B"],
  ["#B06CFF", "#140B2E"], ["#3DF5FF", "#3A0F52"], ["#FF4FD8", "#0B2A3D"],
];
export const gradientOf = (g: [string, string]) => `linear-gradient(160deg, ${g[0]}, ${g[1]})`;

export const monthName = (month: string, style: "long" | "short" = "long") => {
  const [y, m] = month.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", { month: style });
};

export const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const SPOTLIGHTS: { left: string; color: string; opacity: number; anim: string }[] = [
  { left: "12%", color: "#FF4FD8", opacity: 0.45, anim: "sweepL 9s ease-in-out infinite" },
  { left: "12%", color: "#B06CFF", opacity: 0.3, anim: "sweepL 12s -4s ease-in-out infinite reverse" },
  { left: "88%", color: "#3DF5FF", opacity: 0.4, anim: "sweepR 10s -2s ease-in-out infinite" },
  { left: "88%", color: "#FFE14D", opacity: 0.25, anim: "sweepR 13s -6s ease-in-out infinite reverse" },
  { left: "50%", color: "#FF4FD8", opacity: 0.18, anim: "sweepR 15s -3s ease-in-out infinite" },
];

export function HypeShell({
  ambient = "rgba(255,79,216,.16)",
  spotlights = false,
  headerRight,
  nav,
  children,
}: {
  ambient?: string;
  spotlights?: boolean;
  headerRight?: ReactNode;
  nav?: NavPage;
  children: ReactNode;
}) {
  return (
    <div className="hb-root">
      <div className="hb-dots" />
      <div className="hb-ambient" style={{ background: `radial-gradient(closest-side, ${ambient}, transparent)` }} />

      {spotlights && (
        <div aria-hidden="true" style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden", mixBlendMode: "screen", filter: "blur(2px)", animation: "rise 1s ease both" }}>
          {SPOTLIGHTS.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute", left: s.left, top: "-4%", width: "24vw", height: "125vh", marginLeft: "-12vw",
                transformOrigin: "50% 0", clipPath: "polygon(49.3% 0, 50.7% 0, 72% 100%, 28% 100%)",
                background: `linear-gradient(to bottom, ${s.color}, ${s.color}55 35%, transparent 80%)`,
                opacity: s.opacity, animation: s.anim,
              }}
            />
          ))}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "40vh", background: "radial-gradient(60% 100% at 50% 100%, rgba(255,79,216,.22), transparent 70%)", animation: "haze 5s ease-in-out infinite" }} />
        </div>
      )}

      <div className="hb-col">
        <div className="hb-header">
          <Link href="/" aria-label="HYPE home">
            <img src="/landing/hype-logo.png" alt="HYPE" />
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {headerRight}
            <SiteNav current={nav} />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
