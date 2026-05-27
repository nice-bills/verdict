"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { parseEther, type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { marketAbi, OUTCOME_LABELS, STATE_LABELS } from "@/lib/contracts";
import { publicClient } from "@/lib/clients";
import { useWallet } from "@/hooks/useWallet";
import { useMarket } from "@/hooks/useMarket";
import { SiteNav } from "@/components/site-nav";
import { WalletBanner } from "@/components/wallet-banner";
import { MarketTradePanel } from "@/components/market-trade-panel";
import { GlassPanel } from "@/components/glass";

const MIN_STAKE = "0.001";

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
  const [stakeAmount, setStakeAmount] = useState("0.01");
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
      if (snapshot?.state === 1) refresh().catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [refresh, snapshot?.state]);

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
        const amount = parseEther(stakeAmount || MIN_STAKE);
        if (amount < parseEther(MIN_STAKE)) {
          throw new Error(`Minimum stake is ${MIN_STAKE} STT`);
        }
        hash = await wallet.writeContract({
          ...base,
          address: market,
          abi: marketAbi,
          functionName: "stake",
          args: [args?.isYes ?? true],
          value: amount,
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

      <main className="page-gutter page-market">
        <Link href="/" className="back-link fade-rise">
          ← Markets
        </Link>

        <WalletBanner connected={Boolean(account)} onConnect={handleConnect} />

        {!snapshot && !loadError && (
          <p className="page-lede fade-rise">Loading market…</p>
        )}

        {snapshot && (
          <>
            <header className="market-header fade-rise fade-rise-1">
              <p className="market-header__status">
                {STATE_LABELS[snapshot.state]}
                {snapshot.state === 2
                  ? ` · ${OUTCOME_LABELS[snapshot.outcome]}`
                  : ""}
              </p>
              <h1 className="display-serif market-header__question">{snapshot.question}</h1>
              <p className="address-chip market-header__addr">{market}</p>
            </header>

            <div className="fade-rise fade-rise-2">
              <MarketTradePanel
                snapshot={snapshot}
                account={account}
                busy={busy}
                stakeAmount={stakeAmount}
                onStakeAmount={setStakeAmount}
                pastDeadline={Boolean(pastDeadline)}
                secondsLeft={secondsLeft}
                onStake={(isYes) => write("stake", { isYes })}
                onResolve={() => write("resolve")}
                onClaim={() => write("claim")}
                formatDeadline={formatDeadline}
              />
            </div>

            {snapshot.reasoning && (
              <GlassPanel className="reasoning-panel form-panel fade-rise fade-rise-3">
                <p className="glass-label">Agent reasoning</p>
                <p className="reasoning-panel__text">{snapshot.reasoning}</p>
                <a
                  className="reasoning-panel__link"
                  href="https://agents.testnet.somnia.network"
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Somnia agent explorer →
                </a>
              </GlassPanel>
            )}

            {snapshot.state === 1 && (
              <p className="resolving-note fade-rise fade-rise-3">
                Resolving on Somnia — usually 30–120 seconds. This page auto-refreshes.
              </p>
            )}
          </>
        )}

        {lastTx && (
          <a
            className="form-meta form-meta--block"
            href={`https://somnia-testnet.blockscout.com/tx/${lastTx}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction on Blockscout
          </a>
        )}

        {error && <p className="banner-error">{error}</p>}
      </main>
    </>
  );
}
