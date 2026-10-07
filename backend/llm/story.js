import { describePhotos, writeJson } from "./index.js";
import { planPrompt, copyPrompt } from "./prompts.js";
import { shortError } from "./retry.js";

// Vision cost/latency grows with every image; past this, sample evenly
// across the month so every week is still represented.
const MAX_DESCRIBE = 60;
const MAX_MOMENTS = 9;

const whenLabel = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "2-digit", hour: "numeric", minute: "2-digit" })
    : "unknown date";

const byTime = (a, b) => (a.createTime ?? "").localeCompare(b.createTime ?? "");

// 1) Vision pass: what's in each photo.
export async function describeMonthPhotos(photos) {
  const sorted = [...photos].sort(byTime);
  const sample =
    sorted.length <= MAX_DESCRIBE
      ? sorted
      : Array.from({ length: MAX_DESCRIBE }, (_, i) => sorted[Math.floor((i * sorted.length) / MAX_DESCRIBE)]);

  const descs = new Map((await describePhotos(sample)).map((d) => [d.id, d]));
  if (descs.size === 0) throw new Error("Couldn't analyse your photos — the AI service didn't respond. Wait a minute and press Curate again.");
  return sample.map((p) => {
    const d = descs.get(p.id) ?? {};
    return {
      id: p.id,
      createTime: p.createTime,
      when: whenLabel(p.createTime),
      setting: clean(d.setting) || "Out and about",
      what: clean(d.what) || "",
      people: Number.isFinite(+d.people) ? +d.people : 0,
      light: clean(d.light) || "daylight",
      quality: Math.min(10, Math.max(1, Number.isFinite(+d.quality) ? +d.quality : 5)),
      // Crop anchor for the frames in the story; upper-centre is a safe default for people.
      focusX: pct(d.focusX, 50),
      focusY: pct(d.focusY, 38),
    };
  });
}

// 2) Layout pass: which photo goes on which slide, and which song fits it.
export async function planStory({ monthLabel, described, tracks }) {
  let raw = {};
  try {
    raw = await writeJson(planPrompt({ monthLabel, photos: described, tracks }), { temperature: 0.5 });
  } catch (err) {
    // The layout has a sensible deterministic fallback (best-rated photos).
    console.error("[story] plan pass failed, using fallback layout:", shortError(err));
  }

  const byId = new Map(described.map((p) => [p.id, p]));
  const trackIds = new Set(tracks.map((t) => t.id));
  const validTrack = (id, i = 0) => (trackIds.has(id) ? id : tracks[i % Math.max(1, Math.min(5, tracks.length))]?.id ?? null);
  const best = [...described].sort((a, b) => b.quality - a.quality);
  const keepers = best.filter((p) => p.quality > 3);

  const hero = byId.has(raw.hero?.id) ? raw.hero.id : best[0].id;
  const used = new Set([hero]);

  let booth = [...new Set(Array.isArray(raw.booth) ? raw.booth : [])].filter((id) => byId.has(id) && !used.has(id));
  if (booth.length !== 3) booth = keepers.filter((p) => p.people > 0 && !used.has(p.id)).slice(0, 3).map((p) => p.id);
  if (booth.length !== 3) booth = [];
  booth.forEach((id) => used.add(id));

  let golden = byId.has(raw.golden) && !used.has(raw.golden) ? raw.golden : null;
  if (!golden) golden = keepers.find((p) => /golden/i.test(p.light) && !used.has(p.id))?.id ?? null;
  if (!golden) golden = [...keepers].sort(byTime).reverse().find((p) => !used.has(p.id))?.id ?? null;

  const rawMoments = Array.isArray(raw.moments) ? raw.moments : [];
  const momentTracks = new Map(rawMoments.filter((m) => byId.has(m?.id)).map((m) => [m.id, m.trackId]));
  const ids = new Set([hero, ...(golden ? [golden] : []), ...momentTracks.keys()]);
  for (const p of keepers) {
    if (ids.size >= Math.min(MAX_MOMENTS, Math.max(5, momentTracks.size + 2))) break;
    ids.add(p.id);
  }
  const moments = [...ids]
    .slice(0, MAX_MOMENTS)
    .map((id) => byId.get(id))
    .sort(byTime)
    .map((p, i) => ({ id: p.id, trackId: validTrack(momentTracks.get(p.id), i) }));

  return { hero: { id: hero, trackId: validTrack(raw.hero?.trackId) }, booth, golden, moments };
}

// 3) Copy pass: every line of text in the story, written from the month itself.
export async function writeStoryCopy({ monthLabel, plan, described, tracks, strava }) {
  const byId = new Map(described.map((p) => [p.id, p]));
  const trackName = (id) => {
    const t = tracks.find((x) => x.id === id);
    return t ? `${t.title} — ${t.artist}` : "";
  };

  // Every line of story text must come from the model — if it can't be
  // written, fail the curation rather than ship generic placeholder copy.
  const prompt = copyPrompt({
    monthLabel,
    hero: { ...byId.get(plan.hero.id), track: trackName(plan.hero.trackId) },
    booth: plan.booth.map((id) => byId.get(id)),
    golden: plan.golden ? byId.get(plan.golden) : null,
    moments: plan.moments.map((m) => byId.get(m.id)),
    tracks,
    strava,
  });
  const required = [
    "heroSetting", "heroCaption", "moments", "songNote", "story", "signoff", "ticketTagline", "archiveBlurb",
    ...(plan.booth.length === 3 ? ["boothHeadline", "boothSticker"] : []),
    ...(plan.golden ? ["goldenSetting", "goldenCaption"] : []),
    ...(strava ? ["stravaLead", "stravaWord"] : []),
  ];
  const missingIn = (r) => required.filter((k) => !r?.[k] || (Array.isArray(r[k]) && !r[k].some(Boolean)));

  let raw;
  try {
    raw = await writeJson(prompt, { temperature: 1 });
    const missing = missingIn(raw);
    if (missing.length) {
      // One follow-up for anything it skipped, then merge.
      const more = await writeJson(`${prompt}\n\nYour previous answer left these out or empty: ${missing.join(", ")}. Return the complete JSON again with every field filled.`, { temperature: 1 });
      for (const k of missing) if (more?.[k]) raw[k] = more[k];
    }
  } catch (err) {
    throw new Error(`Couldn't write your story: ${shortError(err)}. Wait a minute and press Curate again.`);
  }
  const stillMissing = missingIn(raw);
  if (stillMissing.length) console.warn("[story] copy pass still missing:", stillMissing.join(", "));

  const heroDesc = byId.get(plan.hero.id);
  const goldenDesc = plan.golden ? byId.get(plan.golden) : null;
  const captions = new Map((Array.isArray(raw.moments) ? raw.moments : []).map((m) => [m?.id, clean(m?.caption)]));
  const story = (Array.isArray(raw.story) ? raw.story : [raw.story]).map(cleanStory).filter(Boolean);

  return {
    hero: {
      id: plan.hero.id,
      trackId: plan.hero.trackId,
      setting: words(raw.heroSetting, 3) || heroDesc.setting,
      caption: words(raw.heroCaption, 4) || "The main event",
    },
    booth:
      plan.booth.length === 3
        ? { ids: plan.booth, headline: words(raw.boothHeadline, 6) || "The crew showed up.", sticker: words(raw.boothSticker, 2) || "A lot." }
        : null,
    golden: plan.golden
      ? { id: plan.golden, setting: words(raw.goldenSetting, 3) || goldenDesc.setting, caption: words(raw.goldenCaption, 4) || "Last golden hour" }
      : null,
    moments: plan.moments.map((m) => ({
      ...m,
      caption: words(captions.get(m.id), 8) || byId.get(m.id).what || byId.get(m.id).setting,
    })),
    song: tracks[0] ? { trackId: tracks[0].id, note: words(raw.songNote, 3) || "on repeat" } : null,
    strava: strava ? { lead: words(raw.stravaLead, 2) || "You", word: words(raw.stravaWord, 2) || "moved" } : null,
    outro: {
      story: story.length ? story : [`You opened ${monthLabel} with {pink:${heroDesc.setting.toLowerCase()}} energy and never slowed down.`],
      signoff: words(raw.signoff, 3) || "Certified unforgettable.",
      tagline: words(raw.ticketTagline, 4) || "One night only",
    },
    blurb: words(raw.archiveBlurb, 28) || story.map((x) => x.replace(/\{\w+:([^{}]*)\}/g, "$1"))[0] || "",
    generatedAt: new Date().toISOString(),
  };
}

function pct(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : fallback;
}

function clean(s) {
  return String(s ?? "")
    .replace(/["“”#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function words(s, max) {
  const w = clean(s).split(" ").filter(Boolean);
  return w.slice(0, max).join(" ");
}

// Keep only the three highlight colours the design supports; drop any
// other {tag:...} markup the model invents.
function cleanStory(s) {
  return clean(s).replace(/\{(\w+):([^{}]*)\}/g, (_, tag, text) => (["pink", "gold", "cyan"].includes(tag) ? `{${tag}:${text.trim()}}` : text));
}
