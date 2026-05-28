"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { isAddress, type Address } from "viem";
import { OUTCOME_LABELS, STATE_LABELS } from "@/lib/contracts";
import { useWallet } from "@/hooks/useWallet";
import { useMarket } from "@/hooks/useMarket";
import { useMarketTx } from "@/hooks/useMarketTx";
import { VerdictShell } from "@/components/verdict-shell";
import { LiquidNav } from "@/components/liquid-nav";
import { WalletBanner } from "@/components/wallet-banner";
import { MarketTradePanel } from "@/components/market-trade-panel";
import { isLegacySmokeMarket } from "@/lib/market-filters";
import { AGENTS_URL, blockscoutTxUrl } from "@/lib/constants";

function formatDeadline(ts: bigint) {
  if (ts <= BigInt(0)) return "n/a";
  return new Date(Number(ts) * 1000).toLocaleString();
}

export function MarketPageClient() {
  const params = useParams();
  const rawAddress = typeof params.address === "string" ? params.address : "";
  const { account, connect } = useWallet();

  async function handleConnect() {
    try {
      await connect();
    } catch {
      /* invalid page uses banner only */
    }
  }

  if (!isAddress(rawAddress, { strict: false })) {
    return (
      <VerdictShell>
        <LiquidNav account={account} onConnect={handleConnect} />
        <main className="app-section mx-auto w-full max-w-lg flex-1 px-6 py-12">
          <Link href="/" className="text-sm text-white/60 hover:text-white">
            ← Markets
          </Link>
          <p className="mt-12 rounded-2xl bg-red-500/15 px-4 py-6 text-center text-sm text-red-200">
            Invalid market address. Check the URL or pick a market from the home page.
          </p>
        </main>
      </VerdictShell>
    );
  }

  return <MarketPageInner market={rawAddress as Address} />;
}

function MarketPageInner({ market }: { market: Address }) {
  const { account, connect } = useWallet();
  const { snapshot, error: loadError, loading, refresh, setError } = useMarket(market);
  const tx = useMarketTx({
    market,
    snapshot,
    onSuccess: refresh,
  });
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  async function handleConnect() {
    tx.clearError();
    setError(null);
    try {
      await connect();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      tx.clearError();
      setError(msg);
    }
  }

  const error = tx.error ?? loadError;

  const pastDeadline =
    snapshot &&
    snapshot.deadline > BigInt(0) &&
    BigInt(now) >= snapshot.deadline;

  const secondsLeft =
    snapshot && snapshot.deadline > BigInt(0)
      ? Math.max(0, Number(snapshot.deadline) - now)
      : 0;

  return (
    <VerdictShell>
      <LiquidNav account={account} onConnect={handleConnect} />

      <main className="app-section mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Markets
        </Link>

        <WalletBanner connected={Boolean(account)} onConnect={handleConnect} />

        {loading && !snapshot && !loadError && (
          <div className="mt-8 space-y-4" aria-busy="true" aria-label="Loading market">
            <div className="liquid-glass mx-auto h-8 w-3/4 animate-pulse rounded-lg" />
            <div className="liquid-glass h-32 animate-pulse rounded-2xl" />
          </div>
        )}

        {snapshot && (
          <>
            <header className="mt-8 text-center">
              <p className="text-xs uppercase tracking-widest text-white/50">
                {STATE_LABELS[snapshot.state]}
                {snapshot.state === 2 ? ` · ${OUTCOME_LABELS[snapshot.outcome]}` : ""}
              </p>
              <h1 className="font-instrument mt-4 text-3xl leading-tight text-white md:text-4xl">
                {snapshot.question}
              </h1>
              {isLegacySmokeMarket({ question: snapshot.question, address: market }) && (
                <p className="mt-3 text-sm text-amber-200/90">
                  Legacy test market (hidden from the home list). Create a new one for your demo.
                </p>
              )}
              <p className="mt-4 break-all text-xs text-white/40">{market}</p>
            </header>

            <div className="mt-8">
              <MarketTradePanel
                snapshot={snapshot}
                account={account}
                busy={tx.busy}
                stakeAmount={tx.stakeAmount}
                onStakeAmount={tx.setStakeAmount}
                pastDeadline={Boolean(pastDeadline)}
                secondsLeft={secondsLeft}
                onStake={tx.stake}
                onResolve={tx.resolve}
                onClaim={tx.claim}
                formatDeadline={formatDeadline}
              />
            </div>

            {snapshot.reasoning && (
              <div className="liquid-glass mt-6 rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wide text-white/50">Agent reasoning</p>
                <p className="mt-4 text-sm leading-relaxed text-white/85">{snapshot.reasoning}</p>
                <a
                  className="mt-4 inline-block text-sm text-white underline"
                  href={AGENTS_URL}
                  target="_blank"
                  rel="noreferrer"
                >
                  Somnia agent receipts →
                </a>
              </div>
            )}

            {snapshot.state === 1 && (
              <p className="mt-4 text-center text-sm text-white/70">
                Resolving on Somnia, usually 30–120 seconds.
              </p>
            )}
          </>
        )}

        {tx.lastTx && (
          <a
            className="mt-6 block text-center text-xs text-white/60 underline"
            href={blockscoutTxUrl(tx.lastTx)}
            target="_blank"
            rel="noreferrer"
          >
            View transaction on Blockscout
          </a>
        )}

        {error && (
          <p className="mt-6 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}
      </main>
    </VerdictShell>
  );
}
