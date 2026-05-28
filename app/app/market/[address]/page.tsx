import type { Metadata } from "next";
import { listMarketAddressesForStaticExport } from "@/lib/market-static-params";
import { MarketPageClient } from "./market-page-client";

export const metadata: Metadata = {
  title: "Market",
  description: "Stake, resolve, and claim on a Verdict prediction market on Somnia.",
};

/** GitHub Pages: pre-render known markets. Vercel: empty list → dynamic /market/0x… on demand. */
export async function generateStaticParams() {
  if (process.env.GITHUB_PAGES !== "true") {
    return [];
  }
  return listMarketAddressesForStaticExport();
}

export default function MarketPage() {
  return <MarketPageClient />;
}
