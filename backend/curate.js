import { readMonth, writeMonth } from "./months.js";
import { describeMonthPhotos, planStory, writeStoryCopy } from "./llm/story.js";
import { activityKind } from "./sources.js";

// The builder's "curate" screen walks through these steps; `step` is the
// index of the one currently running.
export const CURATE_STEPS = [
  "Going through your month",
  "Finding the moments that matter",
  "Matching your soundtrack",
  "Writing your story",
];

const jobs = new Map(); // month → { status, step, error }

export function curateStatus(month) {
  const job = jobs.get(month);
  if (job) return job;
  const record = readMonth(month);
  return { status: record.story ? "done" : "idle", step: 0, error: null };
}

export function startCurate(month) {
  const record = readMonth(month);
  if (record.photos.length === 0) throw new Error("Connect Google Photos and pick some photos first");
  if (!record.music) throw new Error("Connect Spotify first");
  if (jobs.get(month)?.status === "running") return jobs.get(month);

  const job = { status: "running", step: 0, error: null };
  jobs.set(month, job);
  run(month, job).catch((err) => {
    console.error(`[${month}:curate]`, err);
    Object.assign(job, { status: "error", error: err.message });
  });
  return job;
}

function stravaSummary(activities) {
  if (!activities?.length) return null;
  const km = (m) => Math.round((m ?? 0) / 100) / 10;
  const longest = activities.reduce((a, b) => ((b.distance ?? 0) > (a.distance ?? 0) ? b : a));
  return {
    count: activities.length,
    kind: activityKind(activities),
    km: km(activities.reduce((sum, a) => sum + (a.distance ?? 0), 0)),
    longestKm: km(longest.distance),
  };
}

async function run(month, job) {
  const record = readMonth(month);
  const [y, m] = month.split("-").map(Number);
  const monthLabel = `${new Date(y, m - 1, 1).toLocaleString("en-US", { month: "long" })} ${y}`;
  const tracks = (record.music?.topTracks ?? []).map((t) => ({
    id: t.id,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(", "),
  }));
  const strava = stravaSummary(record.strava?.activities);

  job.step = 1;
  const described = await describeMonthPhotos(record.photos);

  job.step = 2;
  const plan = await planStory({ monthLabel, described, tracks });

  job.step = 3;
  const story = await writeStoryCopy({ monthLabel, plan, described, tracks, strava });

  writeMonth(month, {
    story,
    // Kept for the builder preview and the months list.
    coverPhotoId: story.hero.id,
    moments: story.moments.map(({ id, caption }) => ({ id, caption })),
    narrative: story.outro.story.join(" ").replace(/\{\w+:([^{}]*)\}/g, "$1"),
    photoNotes: described,
  });
  Object.assign(job, { status: "done", step: CURATE_STEPS.length });
}
