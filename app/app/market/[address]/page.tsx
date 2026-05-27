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
import { VerdictShell } from "@/components/verdict-shell";
import { LiquidNav } from "@/components/liquid-nav";
import { WalletBanner } from "@/components/wallet-banner";
import { MarketTradePanel } from "@/components/market-trade-panel";
import { isLegacySmokeMarket } from "@/lib/market-filters";

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
    <VerdictShell>
      <LiquidNav account={account} onConnect={handleConnect} />

      <main className="app-section mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Markets
        </Link>

        <WalletBanner connected={Boolean(account)} onConnect={handleConnect} />

        {!snapshot && !loadError && (
          <p className="mt-8 text-sm text-white/60">Loading market…</p>
        )}

        {snapshot && (
          <>
            <header className="mt-8 text-center">
              <p className="text-xs uppercase tracking-widest text-white/50">
                {STATE_LABELS[snapshot.state]}
                {snapshot.state === 2 ? ` · ${OUTCOME_LABELS[snapshot.outcome]}` : ""}
              </p>
              <h1
                className="font-instrument mt-4 text-3xl leading-tight text-white md:text-4xl"
                style={{ fontFamily: "'Instrument Serif', serif" }}
              >
                {snapshot.question}
              </h1>
              {isLegacySmokeMarket(snapshot.question) && (
                <p className="mt-3 text-sm text-amber-200/90">
                  Legacy test market — hidden from the home list. Create a new one for your demo.
                </p>
              )}
              <p className="mt-4 break-all text-xs text-white/40">{market}</p>
            </header>

            <div className="mt-8">
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
              <div className="liquid-glass mt-6 rounded-2xl p-6">
                <p className="text-xs uppercase tracking-wide text-white/50">Agent reasoning</p>
                <p className="mt-4 text-sm leading-relaxed text-white/85">{snapshot.reasoning}</p>
                <a
                  className="mt-4 inline-block text-sm text-white underline"
                  href="https://agents.testnet.somnia.network"
                  target="_blank"
                  rel="noreferrer"
                >
                  Somnia agent receipts →
                </a>
              </div>
            )}

            {snapshot.state === 1 && (
              <p className="mt-4 text-center text-sm text-white/70">
                Resolving on Somnia — usually 30–120 seconds.
              </p>
            )}
          </>
        )}

        {lastTx && (
          <a
            className="mt-6 block text-center text-xs text-white/60 underline"
            href={`https://somnia-testnet.blockscout.com/tx/${lastTx}`}
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
