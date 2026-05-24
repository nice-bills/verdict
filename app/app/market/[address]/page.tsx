"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { formatEther, parseEther, type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { marketAbi, OUTCOME_LABELS, STATE_LABELS } from "@/lib/contracts";
import { publicClient } from "@/lib/clients";
import { useWallet } from "@/hooks/useWallet";
import { useMarket } from "@/hooks/useMarket";

export default function MarketPage() {
  const params = useParams();
  const market = params.address as Address;

  const { account, connect, getWalletClient } = useWallet();
  const { snapshot, error: loadError, refresh, setError } = useMarket(market);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<Hash | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    BigInt(Math.floor(Date.now() / 1000)) >= snapshot.deadline;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Back
      </Link>

      <header>
        <h1 className="text-xl font-semibold">{snapshot?.question ?? "Loading…"}</h1>
        <p className="mt-2 font-mono text-xs text-zinc-500">{market}</p>
      </header>

      {snapshot && (
        <dl className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
          <div>
            <dt className="text-zinc-500">State</dt>
            <dd className="font-medium">{STATE_LABELS[snapshot.state] ?? snapshot.state}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Outcome</dt>
            <dd className="font-medium">
              {OUTCOME_LABELS[snapshot.outcome] ?? snapshot.outcome}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">YES stake</dt>
            <dd>{formatEther(snapshot.totalYesStake)} STT</dd>
          </div>
          <div>
            <dt className="text-zinc-500">NO stake</dt>
            <dd>{formatEther(snapshot.totalNoStake)} STT</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-zinc-500">Agent reasoning</dt>
            <dd className="mt-1 text-zinc-300">{snapshot.reasoning || "—"}</dd>
          </div>
        </dl>
      )}

      <button
        type="button"
        onClick={handleConnect}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
      >
        {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
      </button>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!account || busy || snapshot?.state !== 0}
          onClick={() => write("stake", { isYes: true })}
          className="rounded-lg bg-emerald-800 px-3 py-2 text-sm disabled:opacity-40"
        >
          Stake YES (0.01)
        </button>
        <button
          type="button"
          disabled={!account || busy || snapshot?.state !== 0}
          onClick={() => write("stake", { isYes: false })}
          className="rounded-lg bg-rose-900 px-3 py-2 text-sm disabled:opacity-40"
        >
          Stake NO (0.01)
        </button>
        <button
          type="button"
          disabled={!account || busy || snapshot?.state !== 0 || !pastDeadline}
          onClick={() => write("resolve")}
          className="rounded-lg bg-violet-800 px-3 py-2 text-sm disabled:opacity-40"
        >
          Resolve (~{formatEther(snapshot?.resolveDeposit ?? BigInt(0))} STT)
        </button>
        <button
          type="button"
          disabled={!account || busy || snapshot?.state !== 2}
          onClick={() => write("claim")}
          className="rounded-lg bg-zinc-700 px-3 py-2 text-sm disabled:opacity-40"
        >
          Claim
        </button>
      </div>

      {snapshot?.state === 1 && (
        <p className="text-sm text-amber-300">
          Resolving… Somnia agents run async. Refresh in 30–120s or check{" "}
          <a
            className="underline"
            href="https://agents.testnet.somnia.network"
            target="_blank"
            rel="noreferrer"
          >
            agent receipts
          </a>
          .
        </p>
      )}

      {lastTx && (
        <a
          className="break-all font-mono text-xs text-emerald-400 underline"
          href={`https://somnia-testnet.blockscout.com/tx/${lastTx}`}
          target="_blank"
          rel="noreferrer"
        >
          {lastTx}
        </a>
      )}

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </main>
  );
}
