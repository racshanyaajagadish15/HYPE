"use client";

import Link from "next/link";
import { useEffect, useRef, type CSSProperties } from "react";
import "./landing.css";
import { SiteNav } from "./_components/SiteNav";
import { AlbumCover, ConcertPhoto, StoryScreen, SunsetPhoto } from "./_components/LandingArt";

const CTA_LABEL = "Create your hype";

// [left%, top%, size px, glow, duration s, delay s]
const STARS: [number, number, number, string, number, number][] = [
  [90.4, 29.8, 2, "#FF4FD8", 3.4, -1.4], [19.5, 32.7, 2, "#3DF5FF", 6.2, -2.0], [84.3, 95.3, 2, "#B06CFF", 5.1, -1.8],
  [44.5, 58.4, 2, "#FF4FD8", 4.0, -4.9], [78.1, 3.9, 3, "#3DF5FF", 4.3, -2.6], [59.5, 65.4, 2, "#B06CFF", 5.9, -2.2],
  [3.8, 6.2, 2, "#FF4FD8", 4.6, -5.2], [78.1, 63.7, 3, "#3DF5FF", 6.4, -2.2], [78.8, 60.3, 2, "#B06CFF", 5.7, -1.8],
  [76.8, 81.6, 2, "#FF4FD8", 5.6, -2.8], [27.8, 20.5, 2, "#3DF5FF", 5.0, -1.3], [50.8, 88.3, 2, "#B06CFF", 4.6, -1.1],
  [71.8, 92.9, 2, "#FF4FD8", 3.1, -4.3], [35.7, 82.6, 3, "#3DF5FF", 4.4, -0.4], [83.6, 57.8, 2, "#B06CFF", 3.1, -0.5],
  [97.1, 48.4, 2, "#FF4FD8", 5.7, -4.1], [10.0, 58.4, 2, "#3DF5FF", 4.8, -6.0], [85.6, 77.0, 3, "#B06CFF", 5.5, -0.5],
  [61.1, 56.4, 2, "#FF4FD8", 5.6, -2.7], [59.1, 56.2, 2, "#3DF5FF", 6.7, -0.5], [65.1, 54.3, 2, "#B06CFF", 4.1, -1.7],
  [72.0, 25.3, 2, "#FF4FD8", 3.2, -0.6], [91.3, 84.3, 2, "#3DF5FF", 6.4, -2.5], [30.6, 98.1, 2, "#B06CFF", 3.3, -4.6],
  [38.3, 63.5, 3, "#FF4FD8", 6.7, -4.4], [14.9, 51.0, 2, "#3DF5FF", 4.1, -0.5], [90.2, 16.6, 3, "#B06CFF", 3.3, -3.6],
  [68.3, 79.1, 2, "#FF4FD8", 4.6, -2.4], [38.3, 64.7, 2, "#3DF5FF", 4.4, -1.0], [52.4, 18.2, 2, "#B06CFF", 4.5, -5.2],
  [70.2, 80.7, 2, "#FF4FD8", 5.1, -1.3], [69.8, 33.8, 2, "#3DF5FF", 3.3, -4.5], [25.5, 11.3, 2, "#B06CFF", 3.3, -4.1],
  [52.5, 76.4, 3, "#FF4FD8", 4.6, -1.5],
];

const MANIFESTO_WORDS =
  "Time runs fast. Every month is different, and flies by one after the other. What if each was a story you'd watch again, and again?".split(" ");
const MANIFESTO = MANIFESTO_WORDS.map((w, i) => {
  const a = Math.round((i / MANIFESTO_WORDS.length) * 55);
  return { w, range: `cover ${a}% cover ${a + 8}%` };
});

const BAND_A_WORDS = ["Photos", "Songs", "Doodles", "Stories", "Tape"];
const BAND_B_WORDS = ["Your month", "On repeat", "Made by hand", "Hit play"];
const BAND_A = [...BAND_A_WORDS, ...BAND_A_WORDS, ...BAND_A_WORDS, ...BAND_A_WORDS];
const BAND_B = [...BAND_B_WORDS, ...BAND_B_WORDS, ...BAND_B_WORDS, ...BAND_B_WORDS];

const EQ_DELAYS = [0, 0.3, 0.15, 0.45, 0.05, 0.35, 0.2];

export default function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const manifestoRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const el = rootRef.current;
      if (!el) return;
      el.style.setProperty("--mx", e.clientX + "px");
      el.style.setProperty("--my", e.clientY + "px");
      el.style.setProperty("--nx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      el.style.setProperty("--ny", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = rootRef.current;
        if (!el) return;
        const z = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.8)));
        el.style.setProperty("--z", z.toFixed(3));
        const m = manifestoRef.current;
        if (m) {
          const r = m.getBoundingClientRect();
          const vh = window.innerHeight;
          const p = Math.min(1, Math.max(0, (vh * 0.75 - r.top) / (r.height * 0.9)));
          m.style.setProperty("--p", p.toFixed(3));
        }
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={rootRef} className="hl-root">
      <header className="hl-topnav">
        <SiteNav current="home" />
      </header>
      <div className="hl-cursor-glow" />
      <div className="hl-dots" />

      <section id="top" className="hl-hero">
        <div aria-hidden="true" className="hl-stage"><div /></div>
        <div aria-hidden="true" className="hl-floor"><div /></div>
        <div aria-hidden="true" className="hl-scanlines" />
        <div aria-hidden="true" className="hl-vignette" />
        <div aria-hidden="true" className="hl-stars">
          {STARS.map(([left, top, size, glow, dur, delay], i) => (
            <span
              key={i}
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                boxShadow: `0 0 6px ${glow}`,
                animation: `twinkle ${dur}s ${delay}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>
        <div aria-hidden="true" className="hl-hero-glow" />

        <div className="hl-logo-wrap">
          <h1 aria-label="HYPE">
            <img src="/landing/hype-logo.png" alt="HYPE" />
          </h1>
        </div>

        <p className="hl-tagline">Where memories turn into stories</p>

        <div className="hl-mouse"><span /></div>
      </section>

      <div className="hl-bands">
        <div className="hl-band hl-band-a">
          <div className="hl-band-track">
            {BAND_A.map((w, i) => (
              <span key={i} className="hl-band-word">{w}<span>✶</span></span>
            ))}
          </div>
        </div>
        <div className="hl-band hl-band-b">
          <div className="hl-band-track">
            {BAND_B.map((w, i) => (
              <span key={i} className="hl-band-word">{w}<span>✶</span></span>
            ))}
          </div>
        </div>
      </div>

      <section ref={manifestoRef} className="hl-manifesto">
        <p>
          {MANIFESTO.map((m, i) => (
            <span key={i} style={{ animationRange: m.range } as CSSProperties}>{m.w}</span>
          ))}
        </p>
        <div className="hl-hourglass">
          <svg viewBox="0 0 100 160" aria-hidden="true">
            <defs>
              <clipPath id="hg-top"><path d="M14 8 C14 48 44 68 48 80 L52 80 C56 68 86 48 86 8 Z" /></clipPath>
              <clipPath id="hg-bot"><path d="M48 80 C44 92 14 112 14 152 L86 152 C86 112 56 92 52 80 Z" /></clipPath>
              <linearGradient id="hg-sand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FFE14D" />
                <stop offset="1" stopColor="#FF4FD8" />
              </linearGradient>
            </defs>
            <g clipPath="url(#hg-top)">
              <rect x="0" y="8" width="100" height="72" fill="url(#hg-sand)" style={{ transform: "translateY(calc(var(--p) * 72px))" }} />
            </g>
            <g clipPath="url(#hg-bot)">
              <rect x="0" y="152" width="100" height="72" fill="url(#hg-sand)" style={{ transform: "translateY(calc(var(--p) * -62px))" }} />
            </g>
            <line x1="50" y1="80" x2="50" y2="152" stroke="#FFE14D" strokeWidth="1.2" style={{ opacity: "calc(min(var(--p) * 20, (1 - var(--p)) * 20, 1))" }} />
            <path
              d="M14 8 C14 48 44 68 48 80 C44 92 14 112 14 152 L86 152 C86 112 56 92 52 80 C56 68 86 48 86 8 Z"
              fill="rgba(245,243,255,.04)"
              stroke="#3DF5FF"
              strokeWidth="1.5"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={{ filter: "drop-shadow(0 0 6px #3DF5FF)" }}
            />
            <rect x="6" y="2" width="88" height="6" rx="3" fill="#FF4FD8" />
            <rect x="6" y="152" width="88" height="6" rx="3" fill="#FF4FD8" />
          </svg>
        </div>
      </section>

      <section id="how" className="hl-how">
        <div className="hl-step hl-step-l">
          <div className="hl-step-text">
            <div className="hl-step-num" style={{ WebkitTextStroke: "2px #FF4FD8", filter: "drop-shadow(0 0 16px rgba(255,79,216,.5))" }}>01</div>
            <h2>Pick the <span style={{ color: "#FF4FD8" }}>keepers</span></h2>
            <p>HYPE lays out your month. Tap the shots that matter. The blurry ones too, if they&apos;re good.</p>
          </div>
          <div style={{ position: "relative", height: "clamp(300px, 36vw, 440px)" }}>
            <div className="hl-polaroid" style={{ left: "4%", top: "8%", width: "52%", transform: "rotate(-8deg)" }}>
              <div className="hl-polaroid-inner"><SunsetPhoto /></div>
            </div>
            <div
              className="hl-polaroid"
              style={{
                right: "4%",
                top: 0,
                width: "50%",
                transform: "rotate(6deg)",
                boxShadow: "0 24px 60px rgba(0,0,0,.6), 0 0 0 3px #FF4FD8, 0 0 40px rgba(255,79,216,.5)",
              }}
            >
              <div className="hl-polaroid-inner"><ConcertPhoto /></div>
              <div className="hl-check">✓</div>
            </div>
            <div className="hl-note" style={{ left: "28%", bottom: 0, color: "#FFE14D", transform: "rotate(-4deg)" }}>← this one. obviously.</div>
          </div>
        </div>

        <div className="hl-step hl-step-r">
          <div style={{ position: "relative", height: "clamp(300px, 36vw, 440px)", display: "grid", placeItems: "center" }}>
            <div style={{ position: "absolute", width: "min(88%, 400px)", aspectRatio: 1, borderRadius: 999, background: "radial-gradient(closest-side, rgba(61,245,255,.3), transparent)" }} />
            <div className="hl-vinyl">
              <div style={{ position: "relative", width: "38%", aspectRatio: 1, borderRadius: 999, overflow: "hidden" }}>
                <AlbumCover />
              </div>
              <div style={{ position: "absolute", width: "4%", aspectRatio: 1, borderRadius: 999, background: "#07060B", pointerEvents: "none" }} />
            </div>
            <div className="hl-eq">
              {EQ_DELAYS.map((d, i) => (
                <span key={i} style={{ animationDelay: `-${d}s` }} />
              ))}
            </div>
          </div>
          <div className="hl-step-text">
            <div className="hl-step-num" style={{ WebkitTextStroke: "2px #3DF5FF", filter: "drop-shadow(0 0 16px rgba(61,245,255,.5))" }}>02</div>
            <h2>Drop the <span style={{ color: "#3DF5FF" }}>soundtrack</span></h2>
            <p>Choose the songs you couldn&apos;t stop playing. They set the pace of your story.</p>
          </div>
        </div>

        <div className="hl-step hl-step-l">
          <div className="hl-step-text">
            <div className="hl-step-num" style={{ WebkitTextStroke: "2px #FFE14D", filter: "drop-shadow(0 0 16px rgba(255,225,77,.45))" }}>03</div>
            <h2>Hit <span style={{ color: "#FFE14D" }}>play</span></h2>
            <p>HYPE builds it into a story with tape, doodles and marker notes. Post it, send it, keep it.</p>
          </div>
          <div style={{ position: "relative", height: "clamp(360px, 44vw, 520px)", display: "grid", placeItems: "center" }}>
            <div style={{ position: "absolute", width: "90%", height: "90%", background: "radial-gradient(closest-side, rgba(176,108,255,.32), transparent)" }} />
            <div className="hl-phone">
              <div className="hl-phone-screen">
                <StoryScreen />
                <div className="hl-progress">
                  <div className="on" /><div className="on" /><div /><div />
                </div>
              </div>
            </div>
            <div className="hl-note" style={{ left: "0%", top: "4%", color: "#FF4FD8", transform: "rotate(-8deg)", textShadow: "0 0 14px rgba(255,79,216,.5)" }}>
              wait… I made this?
            </div>
          </div>
        </div>
      </section>

      <section className="hl-connect">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div className="hl-eyebrow">Plugs right in</div>
          <h2>
            Works with the apps <span style={{ color: "#FF4FD8", textShadow: "0 0 20px rgba(255,79,216,.5)" }}>you already use</span>
          </h2>
        </div>
        <div className="hl-logos">
          <div className="hl-logo hl-logo-spotify"><img src="/spotify.png" alt="Spotify" /></div>
          <div className="hl-logo hl-logo-gphotos"><img src="/google_photos.png" alt="Google Photos" /></div>
          <div className="hl-logo hl-logo-strava"><img src="/strava.avif" alt="Strava" /></div>
        </div>
      </section>

      <section className="hl-cta">
        <div className="hl-cta-swirl" />
        <h2>
          Create<br />your <img src="/landing/hype-logo-white.png" alt="HYPE" />
        </h2>
        <Link href="/create" className="hl-cta-btn">{CTA_LABEL}</Link>
      </section>

      <footer className="hl-footer">
        <div>
          <span className="hl-footer-brand">HYPE</span>
          <div className="hl-footer-links">
            <Link href="/create">Make a hype</Link>
            <Link href="/archive">Archive</Link>
            <Link href="/data">Your sound</Link>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <span>© 2026 HYPE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
