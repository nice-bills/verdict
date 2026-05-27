"use client";

import { formatEther } from "viem";
import type { MarketSnapshot } from "@/hooks/useMarket";
import { GlassButton, GlassPanel } from "@/components/glass";

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

  return (
    <GlassPanel className="trade-panel form-panel">
      <div className="pool-track" role="presentation">
        <div className="pool-track__yes" style={{ width: `${yesPct}%` }} />
        <div className="pool-track__no" />
      </div>
      <div className="trade-panel__pool-labels">
        <span>YES {formatEther(snapshot.totalYesStake)} STT</span>
        <span>{yesPct}% on YES</span>
        <span>NO {formatEther(snapshot.totalNoStake)} STT</span>
      </div>

      <dl className="trade-panel__meta">
        <div>
          <dt>Deadline</dt>
          <dd>{formatDeadline(snapshot.deadline)}</dd>
        </div>
        <div>
          <dt>Time left</dt>
          <dd>{timeLabel}</dd>
        </div>
      </dl>

      {!account && (
        <p className="trade-panel__hint">Connect your wallet to stake, resolve, or claim.</p>
      )}

      {snapshot.state === 0 && (
        <div className="stake-row">
          <label className="glass-label stake-row__amount">
            Amount (STT)
            <input
              type="number"
              min={MIN_STAKE}
              step="0.001"
              className="glass-input"
              value={stakeAmount}
              onChange={(e) => onStakeAmount(e.target.value)}
              disabled={!account || busy}
            />
          </label>
          <GlassButton variant="yes" disabled={!account || busy} onClick={() => onStake(true)}>
            Stake YES
          </GlassButton>
          <GlassButton variant="no" disabled={!account || busy} onClick={() => onStake(false)}>
            Stake NO
          </GlassButton>
        </div>
      )}

      <div className="trade-panel__actions">
        <GlassButton
          disabled={!account || busy || snapshot.state !== 0 || !pastDeadline}
          onClick={onResolve}
        >
          Resolve · {formatEther(snapshot.resolveDeposit)} STT
        </GlassButton>
        <GlassButton
          variant="ghost"
          disabled={!account || busy || snapshot.state !== 2}
          onClick={onClaim}
        >
          Claim payout
        </GlassButton>
      </div>
    </GlassPanel>
  );
}
