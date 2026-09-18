import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import ffmpegPath from "ffmpeg-static";
import { MONTAGES_DIR } from "../months.js";
import { getDimensions } from "./photoInfo.js";

const execFileAsync = promisify(execFile);

const WIDTH = 1080;
const HEIGHT = 1920;
const PHOTO_SECONDS = 2.5; // ponytail: fixed pacing for v1, parameterize if photo counts vary widely
const MOMENT_SECONDS = 4.5; // top-moment photos get extra time to read their caption
const CARD_SECONDS = 3;
const XFADE_SECONDS = 0.5;
const ACCENT = "0x1DB954";
// Segoe UI Bold. The drive-letter colon MUST be \-escaped here — inside an
// ffmpeg filter option value, ':' is always significant even single-quoted,
// so an unescaped "C:/..." silently breaks fontfile parsing and ffmpeg falls
// back to some default face without erroring (this is what actually caused
// every "ugly font" render so far, including the original arial.ttf attempt).
const FONT = "C\\:/Windows/Fonts/segoeuib.ttf";

function escapeDrawtext(text) {
  // ffmpeg's drawtext has no "\n" escape token for line breaks (its generic
  // filter-option escaping treats "\n" as an escaped "n", i.e. just "n" —
  // confirmed by an earlier smoke test rendering "2099nWrapped"). A real
  // embedded newline byte in the text is what actually produces a line break.
  return text.replace(/\\/g, "\\\\").replace(/:/g, "\\:").replace(/'/g, "\u2019");
}

// Segoe UI Bold at fontsize~54 overflows the 1080px frame past ~24 chars/line;
// wrap each line independently so pre-existing \n breaks (e.g. "Top Track\n...") survive.
function wrapLine(text, maxLen = 24) {
  return text
    .split("\n")
    .map((line) => line.match(new RegExp(`.{1,${maxLen}}(\\s|$)`, "g"))?.join("\n").trim() ?? line)
    .join("\n");
}

function drawtextFilter(text, fontsize) {
  return `drawtext=fontfile='${FONT}':text='${escapeDrawtext(text)}':fontcolor=white:fontsize=${fontsize}:line_spacing=14:shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=(h-text_h)/2`;
}

// Card background = one of the user's actual photos, heavily blurred and
// darkened (the same technique Spotify Wrapped itself uses), framed by thin
// brand-colored accent lines above/below the text for a designed look.
// (First attempt used a full-height translucent color wash — looked like a
// garish green smear over the photo in a real render; thin bracket lines +
// a neutral dark scrim reads as "designed" without fighting the photo.)
function cardFragment(index, text, seconds, backgroundPhotoPath, fontsize = 54) {
  const panelH = Math.min(HEIGHT - 300, fontsize * 6);
  const top = `(ih-${panelH})/2`;
  const bottom = `(ih+${panelH})/2-6`;
  const filter = [
    `scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase`,
    `crop=${WIDTH}:${HEIGHT}`,
    "gblur=sigma=25",
    "eq=brightness=-0.3:saturation=0.9",
    `drawbox=x=0:y=${top}:w=iw:h=${panelH}:color=black@0.3:t=fill`,
    `drawbox=x=(iw-160)/2:y=${top}:w=160:h=4:color=${ACCENT}@0.95:t=fill`,
    `drawbox=x=(iw-160)/2:y=${bottom}:w=160:h=4:color=${ACCENT}@0.95:t=fill`,
    drawtextFilter(text, fontsize),
    "fps=30",
    "format=yuv420p",
  ].join(",");
  return { args: ["-loop", "1", "-t", String(seconds), "-i", backgroundPhotoPath], fragment: `[${index}:v]${filter}[v${index}]` };
}

// Photo slide: portrait/square photos crop-to-fill (looks right at 9:16).
// Landscape photos get an Instagram-Stories-style blur-fill instead of a hard
// crop — cropping a landscape photo to 9:16 would chop off most of the frame.
// Real-world check: every photo in this project's first test month came back
// landscape, so this isn't a rare edge case.
function photoFragment(index, seconds, absolutePath, dims, caption) {
  const isLandscape = dims.width > dims.height;
  const bg = `bg${index}`,
    fg = `fg${index}`,
    bgblur = `bgblur${index}`,
    fgfit = `fgfit${index}`,
    base = `base${index}`;

  const statements = [];
  if (isLandscape) {
    statements.push(`[${index}:v]split=2[${bg}][${fg}]`);
    statements.push(`[${bg}]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},gblur=sigma=30,eq=brightness=-0.25[${bgblur}]`);
    statements.push(`[${fg}]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=decrease[${fgfit}]`);
    statements.push(`[${bgblur}][${fgfit}]overlay=(W-w)/2:(H-h)/2[${base}]`);
  } else {
    statements.push(`[${index}:v]scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},setsar=1[${base}]`);
  }

  let last = base;
  if (caption) {
    const captioned = `cap${index}`;
    const safeCaption = escapeDrawtext(caption);
    statements.push(
      `[${base}]drawbox=x=0:y=ih-260:w=iw:h=260:color=black@0.55:t=fill,` +
        `drawtext=fontfile='${FONT}':text='${safeCaption}':fontcolor=white:fontsize=42:` +
        `shadowcolor=black@0.6:shadowx=2:shadowy=2:x=(w-text_w)/2:y=h-170[${captioned}]`
    );
    last = captioned;
  }

  statements.push(`[${last}]fps=30,format=yuv420p[v${index}]`);
  return { args: ["-loop", "1", "-t", String(seconds), "-i", absolutePath], fragment: statements.join(";") };
}

export async function buildMontage(monthRecord) {
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), "hype-montage-"));
  try {
    const { month, photos, music, narrative, coverPhotoId, moments } = monthRecord;
    const topTrack = music?.topTracks?.[0];
    const topArtist = music?.topArtists?.[0];
    const captionById = new Map((moments ?? []).filter((m) => m.caption).map((m) => [m.id, m.caption]));

    const coverPhoto = photos.find((p) => p.id === coverPhotoId) ?? photos[0];
    const photoAt = (fraction) => photos[Math.min(photos.length - 1, Math.floor(photos.length * fraction))];

    const inputs = [];
    const fragments = [];
    const seconds = [];

    const [y, m] = month.split("-");
    const monthName = new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
    const title = cardFragment(0, `${monthName}\nWrapped`, CARD_SECONDS, coverPhoto.absolutePath, 64);
    inputs.push(title.args);
    fragments.push(title.fragment);
    seconds.push(CARD_SECONDS);

    for (const photo of photos) {
      const index = inputs.length;
      const dims = await getDimensions(photo.absolutePath);
      const caption = captionById.get(photo.id);
      const dur = caption ? MOMENT_SECONDS : PHOTO_SECONDS;
      const slide = photoFragment(index, dur, photo.absolutePath, dims, caption);
      inputs.push(slide.args);
      fragments.push(slide.fragment);
      seconds.push(dur);
    }

    if (topTrack) {
      const index = inputs.length;
      const text = wrapLine(`Top Track\n${topTrack.name}\n${topTrack.artists.map((a) => a.name).join(", ")}`);
      const card = cardFragment(index, text, CARD_SECONDS, photoAt(0.3).absolutePath, 44);
      inputs.push(card.args);
      fragments.push(card.fragment);
      seconds.push(CARD_SECONDS);
    }
    if (topArtist) {
      const index = inputs.length;
      const text = wrapLine(`Top Artist\n${topArtist.name}`);
      const card = cardFragment(index, text, CARD_SECONDS, photoAt(0.6).absolutePath, 44);
      inputs.push(card.args);
      fragments.push(card.fragment);
      seconds.push(CARD_SECONDS);
    }
    if (narrative) {
      const index = inputs.length;
      // A fixed card duration left ~80 words of recap unreadable in 5s;
      // scale with word count instead (~3 words/sec reading speed), capped
      // so one long narrative can't balloon the whole video's runtime.
      const readSeconds = Math.min(14, Math.max(CARD_SECONDS, Math.round(narrative.split(/\s+/).length / 3)));
      const card = cardFragment(index, wrapLine(narrative, 30), readSeconds, photoAt(0.9).absolutePath, 34);
      inputs.push(card.args);
      fragments.push(card.fragment);
      seconds.push(readSeconds);
    }

    // Chain xfade transitions between consecutive [v_i] streams.
    let chain = "[v0]";
    let offset = seconds[0];
    const xfades = [];
    for (let i = 1; i < fragments.length; i++) {
      const out = i === fragments.length - 1 ? "vout" : `x${i}`;
      xfades.push(`${chain}[v${i}]xfade=transition=fade:duration=${XFADE_SECONDS}:offset=${(offset - XFADE_SECONDS).toFixed(2)}[${out}]`);
      chain = `[${out}]`;
      offset += seconds[i] - XFADE_SECONDS;
    }

    const filterComplex = [...fragments, ...xfades].join(";");
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
