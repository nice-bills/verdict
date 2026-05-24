"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Address,
  type Hash,
} from "viem";
import { somniaTestnet } from "@/lib/chain";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";

export default function Home() {
  const [account, setAccount] = useState<Address | null>(null);
  const [question, setQuestion] = useState("Does the page contain VERDICT?");
  const [sourceUrl, setSourceUrl] = useState("https://example.com");
  const [resolvePrompt, setResolvePrompt] = useState(
    "Return YES if the text contains VERDICT (case insensitive), else NO."
  );
  const [deadlineMinutes, setDeadlineMinutes] = useState("2");
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [marketAddress, setMarketAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const factoryConfigured = Boolean(FACTORY_ADDRESS);

  async function connect() {
    setError(null);
    const eth = window.ethereum;
    if (!eth) {
      setError("Install MetaMask or another EVM wallet.");
      return;
    }
    const wallet = createWalletClient({
      chain: somniaTestnet,
      transport: custom(eth as Parameters<typeof custom>[0]),
    });
    const [addr] = await wallet.requestAddresses();
    setAccount(addr);
  }

  async function createMarket() {
    if (!FACTORY_ADDRESS || !account) return;
    setBusy(true);
    setError(null);
    setTxHash(null);
    setMarketAddress(null);
    try {
      const eth = window.ethereum!;
      const wallet = createWalletClient({
        account,
        chain: somniaTestnet,
        transport: custom(eth as Parameters<typeof custom>[0]),
      });
      const deadline =
        BigInt(Math.floor(Date.now() / 1000)) + BigInt(Number(deadlineMinutes) * 60);
      const hash = await wallet.writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createMarket",
        args: [question, sourceUrl, resolvePrompt, deadline],
      });
      setTxHash(hash);
      const publicClient = createPublicClient({
        chain: somniaTestnet,
        transport: http(),
      });
      await publicClient.waitForTransactionReceipt({ hash });
      const count = (await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "marketCount",
      })) as bigint;
      const market = (await publicClient.readContract({
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "getMarket",
        args: [count - BigInt(1)],
      })) as Address;
      setMarketAddress(market);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-8 px-6 py-12">
      <header>
        <p className="text-sm text-zinc-500">Somnia Agentathon</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Verdict</h1>
        <p className="mt-2 text-zinc-400">
          YES/NO markets settled by Somnia&apos;s on-chain agent — not a human multisig.
        </p>
      </header>

      {!factoryConfigured && (
        <p className="rounded-lg border border-amber-900/50 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">
          Set <code className="font-mono">NEXT_PUBLIC_FACTORY_ADDRESS</code> in{" "}
          <code className="font-mono">app/.env.local</code> after deploying the factory.
        </p>
      )}

      <section className="flex flex-col gap-3">
        <button
          type="button"
          onClick={connect}
          className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
        </button>
      </section>

      <section className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
        <h2 className="text-lg font-medium">Create market</h2>
        <label className="flex flex-col gap-1 text-sm">
          Question
          <input
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Source URL (agent reads this page)
          <input
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Resolution rule
          <textarea
            className="min-h-20 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
            value={resolvePrompt}
            onChange={(e) => setResolvePrompt(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Deadline (minutes from now)
          <input
            type="number"
            min={1}
            className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2"
            value={deadlineMinutes}
            onChange={(e) => setDeadlineMinutes(e.target.value)}
          />
        </label>
        <button
          type="button"
          disabled={!account || !factoryConfigured || busy}
          onClick={createMarket}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-40"
        >
          {busy ? "Creating…" : "Create market"}
        </button>
      </section>

      {txHash && (
        <p className="break-all font-mono text-xs text-zinc-500">
          Tx:{" "}
          <a
            className="text-emerald-400 underline"
            href={`https://somnia-testnet.blockscout.com/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {txHash}
          </a>
        </p>
      )}

      {marketAddress && (
        <Link
          href={`/market/${marketAddress}`}
          className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-center text-emerald-300 hover:bg-emerald-950/60"
        >
          Open market → {marketAddress.slice(0, 10)}…
        </Link>
      )}

      {error && (
        <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <footer className="text-xs text-zinc-600">
        Prefer CLI? Run <code className="font-mono">./scripts/demo-testnet.sh</code> from the repo
        root. Video script: <code className="font-mono">docs/DEMO.md</code>
      </footer>
    </main>
  );
}
