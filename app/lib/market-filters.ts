import type { Address } from "viem";
import { SHANNON } from "@/lib/deployment";

const LEGACY_ADDRESSES = new Set(
  (SHANNON.legacyMarketAddresses ?? [
    "0xcAf82F210a5aabf286d8493BE5A2B4DE4B59cF8E",
  ]).map((a) => a.toLowerCase())
);

/** Hide known smoke-test markets from the home list. */
export function isLegacySmokeMarket(market: {
  question: string;
  address?: Address;
}): boolean {
  if (market.address && LEGACY_ADDRESSES.has(market.address.toLowerCase())) {
    return true;
  }
  const q = market.question.trim();
  if (/contain\s+verdict/i.test(q)) return true;
  if (/demo page contain/i.test(q)) return true;
  return false;
}

export function filterDisplayMarkets<T extends { question: string; address?: Address }>(
  markets: T[]
): T[] {
  return markets.filter((m) => !isLegacySmokeMarket(m));
}
