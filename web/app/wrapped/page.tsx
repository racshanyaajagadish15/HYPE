import { redirect } from "next/navigation";

// The month list now lives in the Archive.
export default function Wrapped() {
  redirect("/archive");
}
