"use client";

import { useState } from "react";
import Link from "next/link";
import { type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
import { waitForMarketFromTx } from "@/lib/factory";
import { EXAMPLE_MARKET } from "@/lib/examples";
import { useWallet } from "@/hooks/useWallet";
import { SiteNav } from "@/components/site-nav";
import { GlassButton, GlassPanel } from "@/components/glass";

export default function CreatePage() {
  const { account, connect, getWalletClient } = useWallet();
  const [question, setQuestion] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [resolvePrompt, setResolvePrompt] = useState("");
  const [deadlineMinutes, setDeadlineMinutes] = useState("60");
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

  function fillExample() {
    setQuestion(EXAMPLE_MARKET.question);
    setSourceUrl(EXAMPLE_MARKET.sourceUrl);
    setResolvePrompt(EXAMPLE_MARKET.resolvePrompt);
    setDeadlineMinutes(EXAMPLE_MARKET.deadlineMinutes);
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
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <main className="page-gutter page-narrow fade-rise">
        <Link href="/" className="back-link">
          ← Markets
        </Link>

        <h1 className="display-serif page-title">Open a market</h1>
        <p className="page-lede">
          Write a clear question, point to a public URL the agent can read, and describe how to
          decide YES, NO, or INVALID.
        </p>

        {!account && (
          <GlassPanel className="banner-panel">
            <p>Connect a wallet on Somnia testnet (chain 50312) to create a market.</p>
            <GlassButton type="button" onClick={handleConnect} className="mt-4">
              Connect wallet
            </GlassButton>
          </GlassPanel>
        )}

        <GlassPanel className="form-panel">
          <form
            className="form-stack"
            onSubmit={(e) => {
              e.preventDefault();
              void createMarket();
            }}
          >
            <label className="glass-label">
              Question
              <input
                className="glass-input"
                placeholder="Will X happen before date Y?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </label>
            <label className="glass-label">
              Source URL
              <input
                className="glass-input"
                type="url"
                placeholder="https://…"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                required
              />
            </label>
            <label className="glass-label">
              Resolution rule
              <textarea
                className="glass-input glass-textarea"
                placeholder="Return YES if …, else NO. Return INVALID if the page cannot be read."
                value={resolvePrompt}
                onChange={(e) => setResolvePrompt(e.target.value)}
                required
              />
            </label>
            <label className="glass-label">
              Deadline (minutes from now)
              <input
                type="number"
                min={1}
                className="glass-input"
                style={{ maxWidth: "8rem" }}
                value={deadlineMinutes}
                onChange={(e) => setDeadlineMinutes(e.target.value)}
              />
            </label>

            <div className="form-actions">
              <GlassButton type="button" variant="ghost" onClick={fillExample}>
                Try an example
              </GlassButton>
              <GlassButton
                type="submit"
                disabled={!account || !FACTORY_ADDRESS || busy}
              >
                {busy ? "Submitting…" : "Create on Somnia"}
              </GlassButton>
            </div>
          </form>
        </GlassPanel>

        {txHash && (
          <p className="form-meta">
            <a
              href={`https://somnia-testnet.blockscout.com/tx/${txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction
            </a>
          </p>
        )}

        {marketAddress && (
          <Link href={`/market/${marketAddress}`} className="glass-btn form-success">
            Go to your market →
          </Link>
        )}

        {error && <p className="banner-error">{error}</p>}
      </main>
    </>
  );
}
