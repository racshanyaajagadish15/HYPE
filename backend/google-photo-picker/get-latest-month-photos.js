import { exec } from "node:child_process";
import { createSession, getSession, listAllMediaItems } from "./photoPicker.js";

const session = await createSession();
console.log("Opening the picker so you can select photos...");
console.log(session.pickerUri);
exec(`start "" "${session.pickerUri}"`);

let current = session;
while (!current.mediaItemsSet) {
  const waitMs = parseFloat(current.pollingConfig?.pollInterval ?? "3") * 1000;
  await new Promise((r) => setTimeout(r, waitMs));
  current = await getSession(session.id);
}

const items = await listAllMediaItems(session.id);

const oneMonthAgo = new Date();
oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
const lastMonthItems = items.filter((item) => new Date(item.createTime) >= oneMonthAgo);

console.log(JSON.stringify(lastMonthItems, null, 2));
