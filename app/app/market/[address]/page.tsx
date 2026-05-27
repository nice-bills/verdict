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
import { PoolBar } from "@/components/pool-bar";

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

  return (
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-6 pb-20 pt-4">
        <Link
          href="/"
          className="verdict-rise text-sm text-[var(--color-ink-muted)] transition hover:text-[var(--color-ink)]"
        >
          ← All markets
        </Link>

        <header className="verdict-rise verdict-rise-1 text-center">
          <p className="text-xs font-medium tracking-wide text-[var(--color-accent)] uppercase">
            {snapshot ? (STATE_LABELS[snapshot.state] ?? "Market") : "Loading"}
            {snapshot && snapshot.state === 2
              ? ` · ${OUTCOME_LABELS[snapshot.outcome] ?? "—"}`
              : ""}
          </p>
          <h1 className="verdict-display mt-3 text-[length:var(--text-title)] text-[var(--color-ink)]">
            {snapshot?.question ?? "Loading market…"}
          </h1>
          <p className="verdict-mono mt-3 text-[var(--color-ink-faint)]">{market}</p>
        </header>

        {snapshot && (
          <>
            <section className="verdict-rise verdict-rise-2 verdict-card flex flex-col gap-6 p-6 sm:p-8">
              <PoolBar yesStake={snapshot.totalYesStake} noStake={snapshot.totalNoStake} />

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-[var(--color-ink-faint)]">Deadline</dt>
                  <dd className="mt-1">{formatDeadline(snapshot.deadline)}</dd>
                </div>
                <div>
                  <dt className="text-[var(--color-ink-faint)]">Time left</dt>
                  <dd className="mt-1">
                    {snapshot.state !== 0
                      ? "—"
                      : pastDeadline
                        ? "Ready to resolve"
                        : `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  disabled={!account || busy || snapshot.state !== 0}
                  onClick={() => write("stake", { isYes: true })}
                  className="verdict-btn verdict-btn-yes min-w-[8.5rem]"
                >
                  Stake YES · 0.01
                </button>
                <button
                  type="button"
                  disabled={!account || busy || snapshot.state !== 0}
                  onClick={() => write("stake", { isYes: false })}
                  className="verdict-btn verdict-btn-no min-w-[8.5rem]"
                >
                  Stake NO · 0.01
                </button>
                <button
                  type="button"
                  disabled={!account || busy || snapshot.state !== 0 || !pastDeadline}
                  onClick={() => write("resolve")}
                  className="verdict-btn verdict-btn-primary"
                >
                  Resolve (~{formatEther(snapshot.resolveDeposit)} STT)
                </button>
                <button
                  type="button"
                  disabled={!account || busy || snapshot.state !== 2}
                  onClick={() => write("claim")}
                  className="verdict-btn verdict-btn-ghost"
                >
                  Claim payout
                </button>
              </div>
            </section>

            {snapshot.reasoning && (
              <section className="verdict-rise verdict-rise-3 verdict-card p-6">
                <h2 className="text-sm font-medium text-[var(--color-ink-muted)]">
                  Agent reasoning
                </h2>
                <p className="mt-3 text-[var(--color-ink)] leading-relaxed">{snapshot.reasoning}</p>
                <a
                  className="mt-4 inline-block text-sm text-[var(--color-accent)] underline"
                  href="https://agents.testnet.somnia.network"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Somnia agent explorer →
                </a>
              </section>
            )}

            {snapshot.state === 1 && (
              <p className="verdict-rise verdict-rise-3 text-center text-sm text-[var(--color-accent)]">
                Resolving on Somnia… refresh in 30–120s or check agent receipts.
              </p>
            )}
          </>
        )}

        {lastTx && (
          <a
            className="verdict-mono block break-all text-center text-xs text-[var(--color-accent)] underline"
            href={`https://somnia-testnet.blockscout.com/tx/${lastTx}`}
            target="_blank"
            rel="noreferrer"
          >
            {lastTx}
          </a>
        )}

        {error && (
          <p className="verdict-card px-4 py-3 text-center text-sm text-[var(--color-no)]">{error}</p>
        )}
      </main>
    </>
  );
}
