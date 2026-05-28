import type { Metadata } from "next";
import { HomePageClient } from "./home-page-client";

export const metadata: Metadata = {
  title: "Markets",
  description:
    "Consensus-resolved YES/NO prediction markets on Somnia. Stake STT, resolve with agents, claim on-chain.",
};

export default function Home() {
  return <HomePageClient />;
}
