"use client";

import { useState } from "react";
import Link from "next/link";
import { type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
import { waitForMarketFromTx } from "@/lib/factory";
import { DEMO_MARKET } from "@/lib/examples";
import { blockscoutTxUrl } from "@/lib/constants";
import { useWallet } from "@/hooks/useWallet";
import { VerdictShell } from "@/components/verdict-shell";
import { LiquidNav } from "@/components/liquid-nav";
import { WalletBanner } from "@/components/wallet-banner";

export default function CreatePage() {
  const { account, connect, getWalletClient } = useWallet();
  const [question, setQuestion] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [resolvePrompt, setResolvePrompt] = useState("");
  const [deadlineMinutes, setDeadlineMinutes] = useState("30");
  const [txHash, setTxHash] = useState<Hash | null>(null);
  const [marketAddress, setMarketAddress] = useState<Address | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleConnect() {
    setError(null);
    try {
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function fillDemo() {
    setQuestion(DEMO_MARKET.question);
    setSourceUrl(DEMO_MARKET.sourceUrl);
    setResolvePrompt(DEMO_MARKET.resolvePrompt);
    setDeadlineMinutes(DEMO_MARKET.deadlineMinutes);
  }

  async function createMarket() {
    if (!FACTORY_ADDRESS || !account) return;
    if (!question.trim() || !sourceUrl.trim() || !resolvePrompt.trim()) {
      setError("Fill in question, source URL, and resolution rule.");
      return;
    }
    setBusy(true);
    setError(null);
    setTxHash(null);
    setMarketAddress(null);
    try {
      const wallet = getWalletClient();
      const deadline =
        BigInt(Math.floor(Date.now() / 1000)) +
        BigInt(Math.max(1, Number(deadlineMinutes)) * 60);
      const hash = await wallet.writeContract({
        chain: somniaTestnet,
        account,
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createMarket",
        args: [question.trim(), sourceUrl.trim(), resolvePrompt.trim(), deadline],
      });
      setTxHash(hash);
      const market = await waitForMarketFromTx(hash);
      setMarketAddress(market);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <VerdictShell>
      <LiquidNav account={account} onConnect={handleConnect} />

      <main className="app-section mx-auto w-full max-w-lg flex-1 px-6 py-12">
        <Link href="/" className="text-sm text-white/60 hover:text-white">
          ← Markets
        </Link>

        <h1
          className="font-instrument mt-8 text-4xl text-white"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Open a market
        </h1>
        <p className="mt-3 text-sm text-white/60">
          Plain-English question, public URL, and how the agent should decide YES / NO / INVALID.
        </p>

        <WalletBanner connected={Boolean(account)} onConnect={handleConnect} />

        {!FACTORY_ADDRESS && (
          <p className="mt-6 rounded-2xl bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
            Factory address missing — cannot create markets. Check deployments/shannon.json or set
            NEXT_PUBLIC_FACTORY_ADDRESS.
          </p>
        )}

        <form
          className="liquid-glass mt-8 space-y-6 rounded-2xl p-6 md:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            void createMarket();
          }}
        >
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Question
            <input
              className="liquid-glass-input mt-2 w-full rounded-xl px-4 py-3"
              placeholder="Will X happen before date Y?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Source URL
            <input
              className="liquid-glass-input mt-2 w-full rounded-xl px-4 py-3"
              type="url"
              placeholder="https://…"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Resolution rule
            <textarea
              className="liquid-glass-input mt-2 min-h-28 w-full resize-y rounded-xl px-4 py-3"
              placeholder="Return YES if …, else NO."
              value={resolvePrompt}
              onChange={(e) => setResolvePrompt(e.target.value)}
              required
            />
          </label>
          <label className="block text-xs font-medium uppercase tracking-wide text-white/50">
            Deadline (minutes)
            <input
              type="number"
              min={1}
              className="liquid-glass-input mt-2 w-28 rounded-full px-4 py-2 text-center"
              value={deadlineMinutes}
              onChange={(e) => setDeadlineMinutes(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={fillDemo}
              className="liquid-glass rounded-full px-5 py-2 text-sm text-white/80 hover:bg-white/5"
            >
              Use demo example
            </button>
            <button
              type="submit"
              disabled={!account || !FACTORY_ADDRESS || busy}
              className="rounded-full bg-white px-6 py-2 text-sm font-medium text-black disabled:opacity-40"
            >
              {busy ? "Submitting…" : "Create on Somnia"}
            </button>
          </div>
        </form>

        {txHash && (
          <p className="mt-4 text-center text-xs">
            <a
              className="text-white/60 underline"
              href={blockscoutTxUrl(txHash)}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          </p>
        )}

        {marketAddress && (
          <Link
            href={`/market/${marketAddress}`}
            className="liquid-glass mt-4 block rounded-full py-3 text-center text-sm text-white hover:bg-white/5"
          >
            Go to your market →
          </Link>
        )}

        {error && (
          <p className="mt-4 rounded-xl bg-red-500/15 px-4 py-3 text-center text-sm text-red-200">
            {error}
          </p>
        )}
      </main>
    </VerdictShell>
  );
}
