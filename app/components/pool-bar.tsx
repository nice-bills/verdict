import { formatEther } from "viem";

type PoolBarProps = {
  yesStake: bigint;
  noStake: bigint;
};

export function PoolBar({ yesStake, noStake }: PoolBarProps) {
  const yes = Number(formatEther(yesStake));
  const no = Number(formatEther(noStake));
  const total = yes + no || 1;
  const yesPct = Math.round((yes / total) * 100);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs text-[var(--color-ink-muted)]">
        <span>YES · {formatEther(yesStake)} STT</span>
        <span>NO · {formatEther(noStake)} STT</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-[oklch(100%_0_0/0.08)]">
        <div
          className="h-full rounded-full bg-[var(--color-yes)] transition-all duration-500"
          style={{ width: `${yesPct}%` }}
        />
        <div className="h-full flex-1 bg-[var(--color-no)] opacity-80" />
      </div>
      <p className="text-center text-xs text-[var(--color-ink-faint)]">{yesPct}% on YES</p>
    </div>
  );
}
