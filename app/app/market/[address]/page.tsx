"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  createPublicClient,
  createWalletClient,
  custom,
  formatEther,
  http,
  parseEther,
  type Address,
  type Hash,
} from "viem";
import { somniaTestnet } from "@/lib/chain";
import { marketAbi, OUTCOME_LABELS, STATE_LABELS } from "@/lib/contracts";

export default function MarketPage() {
  const params = useParams();
  const market = params.address as Address;

  const [account, setAccount] = useState<Address | null>(null);
  const [question, setQuestion] = useState("");
  const [state, setState] = useState(0);
  const [outcome, setOutcome] = useState(0);
  const [reasoning, setReasoning] = useState("");
  const [yesPool, setYesPool] = useState<bigint>(BigInt(0));
  const [noPool, setNoPool] = useState<bigint>(BigInt(0));
  const [deadline, setDeadline] = useState<bigint>(BigInt(0));
  const [resolveDeposit, setResolveDeposit] = useState<bigint>(BigInt(0));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastTx, setLastTx] = useState<Hash | null>(null);

  const publicClient = createPublicClient({
    chain: somniaTestnet,
    transport: http(),
  });

  const refresh = useCallback(async () => {
    const [q, s, o, r, yp, np, dl, dep] = await Promise.all([
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "question" }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "state" }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "outcome" }),
      publicClient.readContract({
        address: market,
        abi: marketAbi,
        functionName: "agentReasoning",
      }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "yesPool" }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "noPool" }),
      publicClient.readContract({ address: market, abi: marketAbi, functionName: "deadline" }),
      publicClient.readContract({
        address: market,
        abi: marketAbi,
        functionName: "requiredResolveDeposit",
      }),
    ]);
    setQuestion(q as string);
    setState(Number(s));
    setOutcome(Number(o));
    setReasoning(r as string);
    setYesPool(yp as bigint);
    setNoPool(np as bigint);
    setDeadline(dl as bigint);
    setResolveDeposit(dep as bigint);
  }, [market, publicClient]);

  useEffect(() => {
    refresh().catch((e) => setError(String(e)));
    const id = setInterval(() => refresh().catch(() => {}), 8000);
    return () => clearInterval(id);
  }, [refresh]);

  async function connect() {
    const eth = window.ethereum;
    if (!eth) {
      setError("No wallet found");
      return;
    }
    const wallet = createWalletClient({
      chain: somniaTestnet,
      transport: custom(eth as Parameters<typeof custom>[0]),
    });
    const [addr] = await wallet.requestAddresses();
    setAccount(addr);
  }

  async function write(
    fn: "stake" | "resolve" | "claim",
    args?: { isYes?: boolean; value?: bigint }
  ) {
    if (!account) return;
    setBusy(true);
    setError(null);
    try {
      const eth = window.ethereum!;
      const wallet = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: custom(eth as Parameters<typeof custom>[0]),
      });
      let hash: Hash;
      if (fn === "stake") {
        hash = await wallet.writeContract({
          address: market,
          abi: marketAbi,
          functionName: "stake",
          args: [args?.isYes ?? true],
          value: parseEther("0.01"),
        });
      } else if (fn === "resolve") {
        hash = await wallet.writeContract({
          address: market,
          abi: marketAbi,
          functionName: "resolve",
          value: resolveDeposit,
        });
      } else {
        hash = await wallet.writeContract({
          address: market,
          abi: marketAbi,
          functionName: "claim",
        });
      }
      setLastTx(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const pastDeadline =
    deadline > BigInt(0) && BigInt(Math.floor(Date.now() / 1000)) >= deadline;

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-6 py-12">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
        ← Back
      </Link>

      <header>
        <h1 className="text-xl font-semibold">{question || "Loading…"}</h1>
        <p className="mt-2 font-mono text-xs text-zinc-500">{market}</p>
      </header>

      <dl className="grid grid-cols-2 gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
        <div>
          <dt className="text-zinc-500">State</dt>
          <dd className="font-medium">{STATE_LABELS[state] ?? state}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Outcome</dt>
          <dd className="font-medium">{OUTCOME_LABELS[outcome] ?? outcome}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">YES pool</dt>
          <dd>{formatEther(yesPool)} STT</dd>
        </div>
        <div>
          <dt className="text-zinc-500">NO pool</dt>
          <dd>{formatEther(noPool)} STT</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-zinc-500">Agent reasoning</dt>
          <dd className="mt-1 text-zinc-300">{reasoning || "—"}</dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={connect}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
      >
        {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
      </button>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!account || busy || state !== 0}
          onClick={() => write("stake", { isYes: true })}
          className="rounded-lg bg-emerald-800 px-3 py-2 text-sm disabled:opacity-40"
        >
          Stake YES (0.01)
        </button>
        <button
          type="button"
          disabled={!account || busy || state !== 0}
          onClick={() => write("stake", { isYes: false })}
          className="rounded-lg bg-rose-900 px-3 py-2 text-sm disabled:opacity-40"
        >
          Stake NO (0.01)
        </button>
        <button
          type="button"
          disabled={!account || busy || state !== 0 || !pastDeadline}
          onClick={() => write("resolve")}
          className="rounded-lg bg-violet-800 px-3 py-2 text-sm disabled:opacity-40"
        >
          Resolve (~{formatEther(resolveDeposit)} STT)
        </button>
        <button
          type="button"
          disabled={!account || busy || state !== 2}
          onClick={() => write("claim")}
          className="rounded-lg bg-zinc-700 px-3 py-2 text-sm disabled:opacity-40"
        >
          Claim
        </button>
      </div>

      {state === 1 && (
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
