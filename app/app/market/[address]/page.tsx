import { listMarketAddressesForStaticExport } from "@/lib/market-static-params";
import { MarketPageClient } from "./market-page-client";

export async function generateStaticParams() {
  if (process.env.GITHUB_PAGES !== "true") {
    return [];
  }
  return listMarketAddressesForStaticExport();
}

export default function MarketPage() {
  return <MarketPageClient />;
}
