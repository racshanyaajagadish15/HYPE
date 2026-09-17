import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";
import { MONTAGES_DIR } from "../months.js";

const execFileAsync = promisify(execFile);

const WIDTH = 1080;
const HEIGHT = 1920;
const PHOTO_SECONDS = 2.5; // ponytail: fixed pacing for v1, parameterize if photo counts vary widely
const CARD_SECONDS = 3;
const XFADE_SECONDS = 0.5;
const FONT = "C:\\Windows\\Fonts\\arial.ttf";

function escapeDrawtext(text) {
  // ffmpeg's drawtext has no "\n" escape token for line breaks (its generic
  // filter-option escaping treats "\n" as an escaped "n", i.e. just "n" —
  // confirmed by an earlier smoke test rendering "2099nWrapped"). A real
  // embedded newline byte in the text is what actually produces a line break.
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019");
}

// Arial at fontsize~54 overflows the 1080px frame past ~24 chars/line; wrap
// each line independently so pre-existing \n breaks (e.g. "Top Track\n...") survive.
function wrapLine(text, maxLen = 24) {
  return text
    .split("\n")
    .map((line) => line.match(new RegExp(`.{1,${maxLen}}(\\s|$)`, "g"))?.join("\n").trim() ?? line)
    .join("\n");
}

function textCardInput(text, seconds, fontsize = 54) {
  const safeText = escapeDrawtext(text);
  return {
    args: ["-f", "lavfi", "-t", String(seconds), "-i", `color=c=0x1DB954:s=${WIDTH}x${HEIGHT}:d=${seconds}`],
    filter: `drawtext=fontfile='${FONT.replace(/\\/g, "/")}':text='${safeText}':fontcolor=black:fontsize=${fontsize}:line_spacing=12:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=white@0.85:boxborderw=20`,
  };
}

export async function buildMontage(monthRecord) {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "hype-montage-"));
  try {
    const { month, photos, music, narrative } = monthRecord;
    const topTrack = music?.topTracks?.[0];
    const topArtist = music?.topArtists?.[0];

    const inputs = [];
    const filterSegments = [];

    const [y, m] = month.split("-");
    const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const title = textCardInput(`${monthName}\nWrapped`, CARD_SECONDS);
    inputs.push(title.args);
    filterSegments.push({ filter: title.filter, seconds: CARD_SECONDS });

    for (const photo of photos) {
      inputs.push(["-loop", "1", "-t", String(PHOTO_SECONDS), "-i", photo.absolutePath]);
      filterSegments.push({
        filter: `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1`,
        seconds: PHOTO_SECONDS,
      });
    }

    if (topTrack) {
      const text = wrapLine(`Top Track\n${topTrack.name}\n${topTrack.artists.map((a) => a.name).join(", ")}`);
      const card = textCardInput(text, CARD_SECONDS, 44);
      inputs.push(card.args);
      filterSegments.push({ filter: card.filter, seconds: CARD_SECONDS });
    }
    if (topArtist) {
      const text = wrapLine(`Top Artist\n${topArtist.name}`);
      const card = textCardInput(text, CARD_SECONDS, 44);
      inputs.push(card.args);
      filterSegments.push({ filter: card.filter, seconds: CARD_SECONDS });
    }
    if (narrative) {
      const card = textCardInput(wrapLine(narrative), CARD_SECONDS + 2, 40);
      inputs.push(card.args);
      filterSegments.push({ filter: card.filter, seconds: CARD_SECONDS + 2 });
    }

    // Build per-input filters, then chain xfade transitions between consecutive streams.
    const labeled = filterSegments.map((seg, i) => `[${i}:v]${seg.filter},fps=30,format=yuv420p[v${i}]`);
    let chain = "[v0]";
    let offset = filterSegments[0].seconds;
    const xfades = [];
    for (let i = 1; i < filterSegments.length; i++) {
      const out = i === filterSegments.length - 1 ? "vout" : `x${i}`;
      xfades.push(`${chain}[v${i}]xfade=transition=fade:duration=${XFADE_SECONDS}:offset=${(offset - XFADE_SECONDS).toFixed(2)}[${out}]`);
      chain = `[${out}]`;
      offset += filterSegments[i].seconds - XFADE_SECONDS;
    }

    const filterComplex = [...labeled, ...xfades].join(";");
    const outputPath = path.join(MONTAGES_DIR, `${month}.mp4`);

    const args = [
      "-y",
      ...inputs.flat(),
      "-filter_complex",
      filterComplex,
      "-map",
      "[vout]",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      outputPath,
    ];

    const scriptPath = path.join(tmpDir, "args.txt");
    writeFileSync(scriptPath, JSON.stringify(args)); // debugging aid if the run fails
    await execFileAsync(ffmpegPath, args, { maxBuffer: 1024 * 1024 * 64 });

    return outputPath;
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}
