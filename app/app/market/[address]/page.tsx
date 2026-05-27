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

  const yes = snapshot ? Number(formatEther(snapshot.totalYesStake)) : 0;
  const no = snapshot ? Number(formatEther(snapshot.totalNoStake)) : 0;
  const yesPct = yes + no > 0 ? Math.round((yes / (yes + no)) * 100) : 50;

  return (
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <main className="page-gutter page-narrow" style={{ maxWidth: "40rem" }}>
        <Link href="/" className="back-link fade-rise">
          ← Markets
        </Link>

        {!snapshot && !loadError && (
          <p className="page-lede fade-rise">Loading market…</p>
        )}

        {snapshot && (
          <>
            <header className="fade-rise fade-rise-1" style={{ textAlign: "center" }}>
              <p className="market-card__status">
                {STATE_LABELS[snapshot.state]}
                {snapshot.state === 2
                  ? ` · ${OUTCOME_LABELS[snapshot.outcome]}`
                  : ""}
              </p>
              <h1 className="display-serif page-title" style={{ marginTop: "var(--space-md)" }}>
                {snapshot.question}
              </h1>
              <p
                className="address-chip"
                style={{ marginTop: "var(--space-md)", wordBreak: "break-all" }}
              >
                {market}
              </p>
            </header>

            <GlassPanel className="form-panel fade-rise fade-rise-2" style={{ marginTop: "var(--space-xl)" }}>
              <div className="pool-track" role="presentation">
                <div className="pool-track__yes" style={{ width: `${yesPct}%` }} />
                <div className="pool-track__no" />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "var(--space-sm)",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-ink-muted)",
                }}
              >
                <span>YES {formatEther(snapshot.totalYesStake)}</span>
                <span>{yesPct}%</span>
                <span>NO {formatEther(snapshot.totalNoStake)}</span>
              </div>

              <dl
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-md)",
                  marginTop: "var(--space-lg)",
                  fontSize: "var(--text-sm)",
                }}
              >
                <div>
                  <dt style={{ color: "var(--color-ink-muted)" }}>Deadline</dt>
                  <dd style={{ marginTop: 4 }}>{formatDeadline(snapshot.deadline)}</dd>
                </div>
                <div>
                  <dt style={{ color: "var(--color-ink-muted)" }}>Time left</dt>
                  <dd style={{ marginTop: 4 }}>
                    {snapshot.state !== 0
                      ? "—"
                      : pastDeadline
                        ? "Ready to resolve"
                        : `${Math.floor(secondsLeft / 60)}m ${secondsLeft % 60}s`}
                  </dd>
                </div>
              </dl>

              {!account && (
                <p style={{ marginTop: "var(--space-lg)", textAlign: "center", fontSize: "var(--text-sm)" }}>
                  Connect wallet to stake or resolve.
                </p>
              )}

              {snapshot.state === 0 && (
                <div className="stake-row" style={{ marginTop: "var(--space-lg)" }}>
                  <label className="glass-label" style={{ margin: 0 }}>
                    STT
                    <input
                      type="number"
                      min={MIN_STAKE}
                      step="0.001"
                      className="glass-input"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      disabled={!account || busy}
                    />
                  </label>
                  <GlassButton
                    variant="yes"
                    disabled={!account || busy}
                    onClick={() => write("stake", { isYes: true })}
                  >
                    Stake YES
                  </GlassButton>
                  <GlassButton
                    variant="no"
                    disabled={!account || busy}
                    onClick={() => write("stake", { isYes: false })}
                  >
                    Stake NO
                  </GlassButton>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "var(--space-sm)",
                  justifyContent: "center",
                  marginTop: "var(--space-lg)",
                }}
              >
                <GlassButton
                  disabled={!account || busy || snapshot.state !== 0 || !pastDeadline}
                  onClick={() => write("resolve")}
                >
                  Resolve ({formatEther(snapshot.resolveDeposit)} STT)
                </GlassButton>
                <GlassButton
                  variant="ghost"
                  disabled={!account || busy || snapshot.state !== 2}
                  onClick={() => write("claim")}
                >
                  Claim payout
                </GlassButton>
              </div>
            </GlassPanel>

            {snapshot.reasoning && (
              <GlassPanel className="form-panel fade-rise fade-rise-3" style={{ marginTop: "var(--space-md)" }}>
                <p className="glass-label" style={{ margin: 0 }}>
                  Agent reasoning
                </p>
                <p style={{ marginTop: "var(--space-md)", lineHeight: 1.6 }}>{snapshot.reasoning}</p>
                <a
                  href="https://agents.testnet.somnia.network"
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: "inline-block", marginTop: "var(--space-md)", fontSize: "var(--text-sm)" }}
                >
                  View receipts →
                </a>
              </GlassPanel>
            )}

            {snapshot.state === 1 && (
              <p
                className="fade-rise fade-rise-3"
                style={{ marginTop: "var(--space-md)", textAlign: "center", fontSize: "var(--text-sm)" }}
              >
                Resolving on Somnia — this page refreshes every few seconds.
              </p>
            )}
          </>
        )}

        {lastTx && (
          <a
            className="form-meta"
            style={{ display: "block", marginTop: "var(--space-md)" }}
            href={`https://somnia-testnet.blockscout.com/tx/${lastTx}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction on Blockscout
          </a>
        )}

        {error && <p className="banner-error" style={{ marginTop: "var(--space-lg)" }}>{error}</p>}
      </main>
    </>
  );
}
