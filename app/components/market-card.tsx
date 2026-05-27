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
    <Link href={`/market/${market.address}`} className="market-card glass-panel">
      <div className="market-card__top">
        <span
          className={`market-card__status ${market.state === 0 ? "market-card__status--open" : "market-card__status--resolved"}`}
        >
          {statusLabel(market)}
        </span>
        <span className="market-card__pool">{yesPct}% YES</span>
      </div>
      <h2 className="market-card__question display-serif">{market.question}</h2>
      <p className="market-card__stakes">
        {formatEther(market.totalYesStake)} / {formatEther(market.totalNoStake)} STT pooled
      </p>
    </Link>
  );
}
