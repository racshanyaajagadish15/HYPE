import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const DATA_DIR = fileURLToPath(new URL("./data/", import.meta.url));
export const MONTHS_DIR = path.join(DATA_DIR, "months");
export const PHOTOS_DIR = path.join(DATA_DIR, "photos");
export const MONTAGES_DIR = path.join(DATA_DIR, "montages");

for (const dir of [MONTHS_DIR, PHOTOS_DIR, MONTAGES_DIR]) mkdirSync(dir, { recursive: true });

function monthFile(month) {
  return path.join(MONTHS_DIR, `${month}.json`);
}

export function readMonth(month) {
  const file = monthFile(month);
  if (!existsSync(file)) return { month, photos: [], music: null, narrative: null, coverPhotoId: null, montagePath: null };
  return JSON.parse(readFileSync(file, "utf8"));
}

export function writeMonth(month, patch) {
  const record = { ...readMonth(month), ...patch, month, updatedAt: new Date().toISOString() };
  writeFileSync(monthFile(month), JSON.stringify(record, null, 2));
  return record;
}

export function listMonths() {
  if (!existsSync(MONTHS_DIR)) return [];
  return readdirSync(MONTHS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readMonth(f.replace(/\.json$/, "")))
    .sort((a, b) => b.month.localeCompare(a.month));
}
