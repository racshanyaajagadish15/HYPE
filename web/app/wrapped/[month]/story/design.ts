// Ported 1:1 from the reference design's own component logic
// (web/ref/HYPE-Monthly-Recap.html, the Design Canvas `Component` class'
// renderVals()) — keep this file's formulas byte-for-byte identical to that
// source; only the data going IN (buildStory.ts) should ever change.

export type ChipItem = string | { label: string; pct?: string; weight?: number };
export type ListItem = string | { title: string; sub?: string; weight?: number };

export type Slide =
  | { type: "cover"; kicker?: string; title: string; subtitle?: string; src?: string; src2?: string; meta?: string }
  | { type: "stat"; kicker?: string; value: string; unit: string; caption?: string; src?: string; light?: boolean }
  | { type: "photo"; src?: string; meta?: string; caption?: string }
  | { type: "mosaic"; kicker?: string; meta?: string; tiles: { src?: string; meta?: string; caption?: string }[] }
  | { type: "chips"; kicker?: string; head?: string; note?: string; light?: boolean; items: ChipItem[] }
  | { type: "track"; kicker?: string; title: string; artist?: string; plays?: string; meta?: string; art?: string; embed?: string }
  | { type: "list"; kicker?: string; head?: string; note?: string; light?: boolean; items: ListItem[] }
  | { type: "note"; kicker?: string; text: string; sign?: string; src?: string; light?: boolean }
  | { type: "outro"; kicker?: string; title: string; caption?: string; share?: string; src?: string; stats?: string[] };

export type Story = {
  id: string;
  handle: string;
  brand: string;
  periodLabel?: string;
  accent?: string;
  photoTreatment?: "bw" | "color";
  slides: Slide[];
};

export const NEON = { green: "#39FF88", pink: "#FF3CAC", purple: "#8B5CFF", blue: "#35D6FF", yellow: "#EFFF4F" };
export const WHITE = "#F7F7F2";

// one neon accent + one black value per slide type — neon stays rare
export const THEME: Record<Slide["type"], { bg: string; accent: string }> = {
  cover: { bg: "#050505", accent: NEON.green },
  stat: { bg: "#090909", accent: NEON.pink },
  photo: { bg: "#050505", accent: NEON.green },
  mosaic: { bg: "#0B0B0D", accent: NEON.blue },
  chips: { bg: "#090909", accent: NEON.purple },
  track: { bg: "#050505", accent: NEON.pink },
  list: { bg: "#0B0B0D", accent: NEON.yellow },
  note: { bg: "#050505", accent: NEON.blue },
  outro: { bg: "#090909", accent: NEON.green },
};

const MOOD_COLORS = [NEON.purple, NEON.blue, NEON.pink, NEON.green, NEON.yellow];

function hash(str: string) {
  let h = 0;
  for (let i = 0; i < String(str).length; i++) h = (h * 31 + String(str).charCodeAt(i)) % 9973;
  return h;
}
function rot(seed: string, spread: number) {
  const h = hash(seed);
  return ((h % 200) / 100 - 1) * spread;
}
function rgba(hex: string, a: number) {
  const c = String(hex || "").replace("#", "");
  if (c.length !== 6) return `rgba(247,247,242,${a})`;
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}
function onColor(hex: string) {
  const c = String(hex || "").replace("#", "");
  if (c.length !== 6) return "#050505";
  const lin = (v: number) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(parseInt(c.slice(0, 2), 16)) + 0.7152 * lin(parseInt(c.slice(2, 4), 16)) + 0.0722 * lin(parseInt(c.slice(4, 6), 16));
  return L > 0.3 ? "#050505" : WHITE;
}

export function renderVals(story: Story, index: number, statCount: number | null, accentProp?: string, photoTreatmentProp?: "bw" | "color") {
  const i = Math.min(index, story.slides.length - 1);
  const s: any = story.slides[i] || {};
  const th = THEME[s.type as Slide["type"]] || THEME.cover;
  const bg = s.bg || (s.night === true ? "#050505" : s.light === true ? "#101010" : th.bg);
  const accent = s.accent || accentProp || story.accent || th.accent;
  const bw = (story.photoTreatment ?? photoTreatmentProp ?? "bw") === "bw";
  const alt = i % 2 ? "B" : "A";
  // Single-quoted: this ends up inside a double-quoted HTML style="..."
  // attribute (markup.ts generates raw HTML strings, not a DOM style object
  // like the reference's own Design Canvas runtime), so a nested `"` here
  // would terminate the attribute early and silently truncate everything
  // after it — confirmed live: shot1 rendered as `background-image: url("`
  // with nothing following, and zero photo network requests fired.
  const url = (u?: string) => (u ? `url('${u}')` : "none");
  const pct = (v: number | null | undefined, n: number) => Math.round((v != null ? v : 1 - n * 0.15) * 100) + "%";
  const photoNo = story.slides.filter((x, n) => x.type === "photo" && n <= i).length;
  const photoTotal = story.slides.filter((x) => x.type === "photo").length;
  const statSuffix = String(s.value == null ? "" : s.value).replace(/[0-9.,\s]/g, "");
  const statShown = s.type === "stat" && statCount != null ? statCount + statSuffix : s.value || "";
  const glowText = `0 0 10px ${rgba(accent, 0.55)}, 0 0 30px ${rgba(accent, 0.3)}`;

  return {
    bg,
    ink: WHITE,
    accent,
    accentDim: rgba(accent, 0.55),
    accentWash: rgba(accent, 0.11),
    onAccent: onColor(accent),
    glowText,
    glowWhite: "0 0 26px rgba(247,247,242,.18)",
    glowBox: `0 0 12px ${rgba(accent, 0.5)}, 0 0 34px ${rgba(accent, 0.24)}`,
    brand: story.brand || "HYPE",
    periodLabel: story.periodLabel || "",
    handle: story.handle || "",
    counterNow: String(i + 1).padStart(2, "0"),
    counterTotal: String(story.slides.length).padStart(2, "0"),
    progress: (story.slides.length > 1 ? (i / (story.slides.length - 1)) * 100 : 100).toFixed(1) + "%",
    nextLabel: i === story.slides.length - 1 ? "Done" : "Next",
    fadeIn: "in" + alt,
    up: "up" + alt,
    pop: "pop" + alt,
    snap: "snap" + alt,
    draw: "draw" + alt,
    reveal: "reveal" + alt,
    zoom: "zoom" + alt,
    grow: "grow" + alt,
    streak: "streak" + alt,

    isCover: s.type === "cover",
    isStat: s.type === "stat",
    isPhoto: s.type === "photo",
    isMosaic: s.type === "mosaic",
    isChips: s.type === "chips",
    isTrack: s.type === "track",
    isList: s.type === "list",
    isNote: s.type === "note",
    isOutro: s.type === "outro",

    kicker: s.kicker || "",
    title: s.title || "",
    subtitle: s.subtitle || "",
    caption: s.caption || "",
    coverMeta: s.meta || "",
    statValue: statShown,
    statUnit: s.unit || "",
    photoMeta: s.meta || "",
    photoIndex: photoTotal ? "frame " + String(photoNo).padStart(2, "0") + " / " + String(photoTotal).padStart(2, "0") : "",
    mosaicMeta: s.meta || "",
    chipsHead: s.head || "",
    chipsNote: s.note || "",
    listHead: s.head || "",
    listNote: s.note || "",
    trackMeta: s.meta || "",

    rot1: rot((s.src || "") + i, 3).toFixed(2) + "deg",
    shot1: url(s.src),
    shot2: url(s.src2),
    noShot1: !s.src,
    hasShot1: !!s.src,
    artBg: url(s.art),
    noArt: s.type === "track" && !s.art,
    photoFilter: bw ? "grayscale(1) contrast(1.22) brightness(1.02)" : "saturate(1.05) contrast(1.05)",

    tiles: (s.tiles || []).map((t: any, n: number) => ({
      bg: url(t.src),
      noShot: !t.src,
      slot: "img 0" + (n + 1),
      date: t.meta || "",
      caption: t.caption || "",
      first: n === 0,
      rot: rot((t.src || "t") + n + i, 3.6).toFixed(2) + "deg",
      w: n === 0 ? "clamp(190px, 25vw, 320px)" : "clamp(140px, 18vw, 226px)",
      glow: n === 0 ? `0 0 0 2px ${accent}, 0 0 18px ${rgba(accent, 0.5)}` : "0 0 0 1px rgba(247,247,242,.22)",
      delay: (0.16 + n * 0.12).toFixed(2) + "s",
    })),

    chips: (s.items || []).map((c: ChipItem, n: number) => {
      const col = n === 0 ? accent : MOOD_COLORS[(n + 1) % MOOD_COLORS.length];
      return {
        label: typeof c === "string" ? c : c.label,
        pct: typeof c === "string" ? "" : c.pct || "",
        bar: typeof c === "string" ? pct(null, n) : pct(c.weight, n),
        ink: n === 0 ? accent : WHITE,
        textGlow: n === 0 ? glowText : "none",
        fill: n === 0 ? accent : "rgba(247,247,242,.72)",
        barGlow: n === 0 ? `0 0 14px ${rgba(accent, 0.6)}` : "none",
        size: n === 0 ? "clamp(24px, 3.4vw, 50px)" : "clamp(16px, 2vw, 28px)",
        barH: n === 0 ? "14px" : "8px",
        delay: (0.2 + n * 0.1).toFixed(2) + "s",
        color: col,
      };
    }),

    trackTitle: s.title || "",
    trackArtist: s.artist || "",
    trackPlays: s.plays || "",
    hasEmbed: !!s.embed,
    embedUrl: s.embed || "",
    bars: Array.from({ length: 30 }, (_, n) => ({
      h: 18 + (hash("b" + n) % 28) + "px",
      dur: (0.7 + (hash("d" + n) % 70) / 100).toFixed(2) + "s",
      delay: ((hash("x" + n) % 60) / 100).toFixed(2) + "s",
    })),

    rows: (s.items || []).map((r: ListItem, n: number) => ({
      n: String(n + 1).padStart(2, "0"),
      first: n === 0,
      title: typeof r === "string" ? r : r.title,
      sub: typeof r === "string" ? "" : r.sub || "",
      color: n === 0 ? accent : "rgba(247,247,242,.5)",
      glow: n === 0 ? glowText : "none",
      titleInk: n === 0 ? WHITE : "rgba(247,247,242,.82)",
      nSize: n === 0 ? "clamp(44px, 6vw, 86px)" : "clamp(20px, 2.4vw, 32px)",
      tSize: n === 0 ? "clamp(26px, 3.6vw, 52px)" : "clamp(16px, 1.9vw, 26px)",
      pad: n === 0 ? "clamp(12px, 1.6vw, 20px)" : "clamp(7px, 1vw, 12px)",
      delay: (0.18 + n * 0.09).toFixed(2) + "s",
    })),

    noteText: s.text || "",
    noteSign: s.sign || "",
    shareLabel: s.share || "Share",
    outroStats: (s.stats || []).map((t: string) => ({ text: t })),
  };
}

export function statNumericTarget(story: Story, index: number): number | null {
  const s: any = story.slides[Math.min(index, story.slides.length - 1)] || {};
  const n = parseFloat(String(s.value == null ? "" : s.value).replace(/[^0-9.]/g, ""));
  return s.type !== "stat" || !isFinite(n) ? null : n;
}
