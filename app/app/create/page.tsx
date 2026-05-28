import type { Metadata } from "next";
import { CreatePageClient } from "./create-page-client";

export const metadata: Metadata = {
  title: "Create market",
  description:
    "Open a new Verdict prediction market on Somnia with a question, source URL, and agent resolution rule.",
};

export default function CreatePage() {
  return <CreatePageClient />;
}
