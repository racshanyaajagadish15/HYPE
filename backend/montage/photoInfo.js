import { execFile } from "node:child_process";
import { promisify } from "node:util";
import ffprobePath from "ffprobe-static";

const execFileAsync = promisify(execFile);

export async function getDimensions(absolutePath) {
  const { stdout } = await execFileAsync(ffprobePath.path, [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "csv=p=0",
    absolutePath,
  ]);
  const [width, height] = stdout.trim().split(",").map(Number);
  return { width, height };
}
