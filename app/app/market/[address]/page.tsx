"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { formatEther, parseEther, type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { marketAbi, OUTCOME_LABELS, STATE_LABELS } from "@/lib/contracts";
import { publicClient } from "@/lib/clients";
import { useWallet } from "@/hooks/useWallet";
import { useMarket } from "@/hooks/useMarket";
import { SiteNav } from "@/components/site-nav";
import { GlassButton, GlassPanel } from "@/components/glass";

function formatDeadline(ts: bigint) {
  if (ts <= BigInt(0)) return "—";
  return new Date(Number(ts) * 1000).toLocaleString();
}

export default function MarketPage() {
  const params = useParams();
  const market = params.address as Address;

  const { account, connect, getWalletClient } = useWallet();
  const { snapshot, error: loadError, refresh, setError } = useMarket(market);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const error = actionError ?? loadError;

  async function handleConnect() {
    setActionError(null);
    try {
      await connect();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
    }
  }

  async function write(
    fn: "stake" | "resolve" | "claim",
    args?: { isYes?: boolean }
  ) {
    if (!account || !snapshot) return;
    setBusy(true);
    setActionError(null);
    try {
      const wallet = getWalletClient();
      let hash: Hash;
      const base = { chain: somniaTestnet, account } as const;
      if (fn === "stake") {
        hash = await wallet.writeContract({
          ...base,
          address: market,
          abi: marketAbi,
          functionName: "stake",
          args: [args?.isYes ?? true],
          value: parseEther("0.01"),
        });
      } else if (fn === "resolve") {
        hash = await wallet.writeContract({
          ...base,
          address: market,
          abi: marketAbi,
          functionName: "resolve",
          value: snapshot.resolveDeposit,
        });
      } else {
        hash = await wallet.writeContract({
          ...base,
          address: market,
          abi: marketAbi,
          functionName: "claim",
        });
      }
      setLastTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : String(e));
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const pastDeadline =
    snapshot &&
    snapshot.deadline > BigInt(0) &&
    BigInt(now) >= snapshot.deadline;

  const secondsLeft =
    snapshot && snapshot.deadline > BigInt(0)
      ? Math.max(0, Number(snapshot.deadline) - now)
      : 0;

  const yes = snapshot ? Number(formatEther(snapshot.totalYesStake)) : 0;
  const no = snapshot ? Number(formatEther(snapshot.totalNoStake)) : 0;
  const yesPct = yes + no > 0 ? Math.round((yes / (yes + no)) * 100) : 50;

  return (
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <main className="page-shell">
        <Link
          href="/"
          className="fade-rise mb-8 inline-block text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink)]"
        >
          ← Markets
        </Link>

        <header className="fade-rise fade-rise-1 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-ink-muted)]">
            {snapshot ? (STATE_LABELS[snapshot.state] ?? "Market") : "…"}
            {snapshot?.state === 2
              ? ` · ${OUTCOME_LABELS[snapshot.outcome] ?? ""}`
              : ""}
          </p>
          <h1 className="display-serif mt-4 text-[length:var(--text-title)]">
            {snapshot?.question ?? "Loading…"}
          </h1>
          <p className="address-chip mt-4">{market}</p>
        </header>

        {snapshot && (
          <>
            <GlassPanel className="fade-rise fade-rise-2 mx-auto mt-12 max-w-md p-8">
              <div className="pool-track" role="presentation">
                <div className="pool-track__yes" style={{ width: `${yesPct}%` }} />
                <div className="pool-track__no" />
              </div>
              <div className="mt-4 flex justify-between text-xs text-[var(--color-ink-muted)]">
                <span>YES {formatEther(snapshot.totalYesStake)} STT</span>
                <span>{yesPct}%</span>
                <span>NO {formatEther(snapshot.totalNoStake)} STT</span>
              </div>

              <dl className="mt-8 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[var(--color-ink-muted)]">Deadline</dt>
                  <dd className="mt-1 text-[var(--color-ink)]">{formatDeadline(snapshot.deadline)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-ink-muted)]">Time left</dt>
                  <dd className="mt-1 text-[var(--color-ink)]">
                    {snapshot.state !== 0
                      ? "—"
                      : pastDeadline
                        ? "Ready"
                        : `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`}
                  </dd>
                </div>
              </dl>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                <GlassButton
                  variant="yes"
                  disabled={!account || busy || snapshot.state !== 0}
                  onClick={() => write("stake", { isYes: true })}
                >
                  Stake YES · 0.01
                </GlassButton>
                <GlassButton
                  variant="no"
                  disabled={!account || busy || snapshot.state !== 0}
                  onClick={() => write("stake", { isYes: false })}
                >
                  Stake NO · 0.01
                </GlassButton>
                <GlassButton
                  disabled={!account || busy || snapshot.state !== 0 || !pastDeadline}
                  onClick={() => write("resolve")}
                >
                  Resolve · {formatEther(snapshot.resolveDeposit)} STT
                </GlassButton>
                <GlassButton
                  disabled={!account || busy || snapshot.state !== 2}
                  onClick={() => write("claim")}
                >
                  Claim
                </GlassButton>
              </div>
            </GlassPanel>

            {snapshot.reasoning && (
              <GlassPanel className="fade-rise fade-rise-3 mx-auto mt-6 max-w-md p-6">
                <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--color-ink-muted)]">
                  Agent reasoning
                </h2>
                <p className="mt-4 text-[var(--color-ink-body)]">{snapshot.reasoning}</p>
                <a
                  className="mt-4 inline-block text-sm text-[var(--color-ink)] underline"
                  href="https://agents.testnet.somnia.network"
                  target="_blank"
                  rel="noreferrer"
                >
                  Somnia agent receipts →
                </a>
              </GlassPanel>
            )}

            {snapshot.state === 1 && (
              <p className="fade-rise fade-rise-4 mt-6 text-center text-sm text-[var(--color-ink-body)]">
                Resolving… check back in 30–120 seconds.
              </p>
            )}
          </>
        )}

        {lastTx && (
          <a
            className="mt-8 block break-all text-center text-xs text-[var(--color-ink-muted)] underline"
            href={`https://somnia-testnet.blockscout.com/tx/${lastTx}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction
          </a>
        )}

        {error && (
          <p className="mt-6 text-center text-sm text-[var(--color-no)]">{error}</p>
        )}
      </main>
    </>
  );
}
