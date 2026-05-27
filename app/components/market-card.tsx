import Link from "next/link";
import { formatEther } from "viem";
import type { MarketSummary } from "@/hooks/useMarketSummaries";
import { OUTCOME_LABELS, STATE_LABELS } from "@/lib/contracts";

function statusLabel(m: MarketSummary) {
  if (m.state === 2) return OUTCOME_LABELS[m.outcome] ?? "Resolved";
  return STATE_LABELS[m.state] ?? "Unknown";
}

export function MarketCard({ market }: { market: MarketSummary }) {
  const yes = Number(formatEther(market.totalYesStake));
  const no = Number(formatEther(market.totalNoStake));
  const total = yes + no || 1;
  const yesPct = Math.round((yes / total) * 100);

  return (
    <Link href={`/market/${market.address}`} className="market-card liquid-glass rounded-2xl">
      <div className="flex justify-between text-xs uppercase tracking-wider text-white/50">
        <span>{statusLabel(market)}</span>
        <span>{yesPct}% YES</span>
      </div>
      <h2
        className="font-instrument mt-4 text-xl leading-snug text-white"
        style={{ fontFamily: "'Instrument Serif', serif" }}
      >
        {market.question}
      </h2>
      <p className="mt-3 text-xs text-white/50">
        {formatEther(market.totalYesStake)} / {formatEther(market.totalNoStake)} STT pooled
      </p>
    </Link>
  );
}
