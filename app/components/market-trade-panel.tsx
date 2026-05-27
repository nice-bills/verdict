"use client";

import { formatEther } from "viem";
import type { MarketSnapshot } from "@/hooks/useMarket";
import { isLegacySmokeMarket } from "@/lib/market-filters";

type MarketTradePanelProps = {
  snapshot: MarketSnapshot;
  account: `0x${string}` | null;
  busy: boolean;
  stakeAmount: string;
  onStakeAmount: (v: string) => void;
  pastDeadline: boolean;
  secondsLeft: number;
  onStake: (isYes: boolean) => void;
  onResolve: () => void;
  onClaim: () => void;
  formatDeadline: (ts: bigint) => string;
};

const MIN_STAKE = "0.001";

export function MarketTradePanel({
  snapshot,
  account,
  busy,
  stakeAmount,
  onStakeAmount,
  pastDeadline,
  secondsLeft,
  onStake,
  onResolve,
  onClaim,
  formatDeadline,
}: MarketTradePanelProps) {
  const yes = Number(formatEther(snapshot.totalYesStake));
  const no = Number(formatEther(snapshot.totalNoStake));
  const yesPct = yes + no > 0 ? Math.round((yes / (yes + no)) * 100) : 50;

  const timeLabel =
    snapshot.state !== 0
      ? "—"
      : pastDeadline
        ? "Ready to resolve"
        : `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`;

  const legacy = isLegacySmokeMarket(snapshot.question);

  return (
    <div className="liquid-glass rounded-2xl p-6 md:p-8">
      {legacy && (
        <p className="mb-4 rounded-xl bg-amber-500/15 px-4 py-3 text-center text-sm text-amber-100">
          This is an old operator smoke-test market.{" "}
          <a href="/create" className="underline">
            Create a new market
          </a>{" "}
          for your demo.
        </p>
      )}

      <div className="pool-track" role="presentation">
        <div className="pool-track__yes" style={{ width: `${yesPct}%` }} />
        <div className="pool-track__no" />
      </div>
      <div className="mt-2 flex justify-between text-xs text-white/50">
        <span>YES {formatEther(snapshot.totalYesStake)} STT</span>
        <span>{yesPct}%</span>
        <span>NO {formatEther(snapshot.totalNoStake)} STT</span>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-white/50">Deadline</dt>
          <dd className="mt-1 text-white">{formatDeadline(snapshot.deadline)}</dd>
        </div>
        <div>
          <dt className="text-white/50">Time left</dt>
          <dd className="mt-1 text-white">{timeLabel}</dd>
        </div>
      </dl>

      {!account && (
        <p className="mt-6 text-center text-sm text-white/60">
          Connect your wallet to stake, resolve, or claim.
        </p>
      )}

      {snapshot.state === 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <label className="flex flex-col gap-1 text-xs uppercase tracking-wide text-white/50">
            STT
            <input
              type="number"
              min={MIN_STAKE}
              step="0.001"
              className="liquid-glass w-24 rounded-full px-4 py-2 text-center text-sm text-white"
              value={stakeAmount}
              onChange={(e) => onStakeAmount(e.target.value)}
              disabled={!account || busy}
            />
          </label>
          <button
            type="button"
            disabled={!account || busy}
            onClick={() => onStake(true)}
            className="liquid-glass rounded-full px-5 py-2 text-sm text-green-300 hover:bg-white/5 disabled:opacity-40"
          >
            Stake YES
          </button>
          <button
            type="button"
            disabled={!account || busy}
            onClick={() => onStake(false)}
            className="liquid-glass rounded-full px-5 py-2 text-sm text-red-300 hover:bg-white/5 disabled:opacity-40"
          >
            Stake NO
          </button>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          disabled={!account || busy || snapshot.state !== 0 || !pastDeadline}
          onClick={onResolve}
          className="liquid-glass rounded-full px-6 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40"
        >
          Resolve · {formatEther(snapshot.resolveDeposit)} STT
        </button>
        <button
          type="button"
          disabled={!account || busy || snapshot.state !== 2}
          onClick={onClaim}
          className="liquid-glass rounded-full px-6 py-2 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
        >
          Claim payout
        </button>
      </div>
    </div>
  );
}
