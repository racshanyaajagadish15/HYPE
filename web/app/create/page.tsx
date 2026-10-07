import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// The builder lives per month; "create" always starts on the current one.
export default function Create() {
  const now = new Date();
  redirect(`/wrapped/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
}
