import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";
import ffmpegPath from "ffmpeg-static";
import { MONTAGES_DIR } from "../months.js";

const execFileAsync = promisify(execFile);

const VIEWPORT = { width: 405, height: 900 };
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";

export async function recordStory(month) {
  const videoDir = mkdtempSync(path.join(os.tmpdir(), "hype-story-rec-"));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      recordVideo: { dir: videoDir, size: VIEWPORT },
    });
    const page = await context.newPage();
    await page.goto(`${FRONTEND_ORIGIN}/wrapped/${month}/story`);

    // The page auto-advances through every slide on its own timer; wait for
    // the final "That's a wrap!" screen instead of hardcoding a duration, so
    // this works for any slide count.
    await page.getByText("That's a wrap!").waitFor({ timeout: 120_000 });
    await page.waitForTimeout(1500); // hold on the end screen briefly before cutting

    const video = page.video();
    await context.close(); // finalizes the .webm file
    const webmPath = await video.path();

    const mp4Path = path.join(MONTAGES_DIR, `${month}-story.mp4`);
    await execFileAsync(ffmpegPath, ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", mp4Path]);

    return mp4Path;
  } finally {
    await browser.close();
    rmSync(videoDir, { recursive: true, force: true });
  }
}

// Allow running directly: node montage/recordStory.js 2026-09
if (process.argv[1] && process.argv[1].endsWith("recordStory.js")) {
  const month = process.argv[2];
  if (!month) throw new Error("Usage: node montage/recordStory.js <YYYY-MM>");
  const out = await recordStory(month);
  console.log("Saved:", out);
}
