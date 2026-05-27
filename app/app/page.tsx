"use client";

import { useState } from "react";
import Link from "next/link";
import { type Address, type Hash } from "viem";
import { somniaTestnet } from "@/lib/chain";
import { FACTORY_ADDRESS, factoryAbi } from "@/lib/contracts";
import { waitForMarketFromTx } from "@/lib/factory";
import { useWallet } from "@/hooks/useWallet";
import { useMarkets } from "@/hooks/useMarkets";
import { SiteNav } from "@/components/site-nav";
import { useMarket } from "@/hooks/useMarket";
import { STATE_LABELS } from "@/lib/contracts";

function MarketPreview({ address }: { address: Address }) {
  const { snapshot } = useMarket(address);
  if (!snapshot) {
    return (
      <li className="verdict-card px-5 py-4 text-sm text-[var(--color-ink-faint)]">Loading…</li>
    );
  }
  return (
    <li>
      <Link
        href={`/market/${address}`}
        className="verdict-card block px-5 py-4 transition hover:border-[var(--color-border-strong)] hover:shadow-[0_20px_60px_oklch(0%_0_0/0.45)]"
      >
        <p className="verdict-display text-lg text-[var(--color-ink)]">{snapshot.question}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--color-ink-muted)]">
          <span className="rounded-full border border-[var(--color-border)] px-2.5 py-0.5">
            {STATE_LABELS[snapshot.state] ?? snapshot.state}
          </span>
          <span className="verdict-mono text-[var(--color-ink-faint)]">
            {address.slice(0, 10)}…{address.slice(-6)}
          </span>
        </div>
      </Link>
    </li>
  );
}

export default function Home() {
  const { account, connect, getWalletClient } = useWallet();
  const { markets, refresh: refreshMarkets } = useMarkets();
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

  async function handleConnect() {
    setError(null);
    try {
      await connect();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function createMarket() {
    if (!FACTORY_ADDRESS || !account) return;
    setBusy(true);
    setError(null);
    setTxHash(null);
    setMarketAddress(null);
    try {
      const wallet = getWalletClient();
      const deadline =
        BigInt(Math.floor(Date.now() / 1000)) + BigInt(Number(deadlineMinutes) * 60);
      const hash = await wallet.writeContract({
        chain: somniaTestnet,
        account,
        address: FACTORY_ADDRESS,
        abi: factoryAbi,
        functionName: "createMarket",
        args: [question, sourceUrl, resolvePrompt, deadline],
      });
      setTxHash(hash);
      const market = await waitForMarketFromTx(hash);
      setMarketAddress(market);
      await refreshMarkets();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pb-20">
        <section className="verdict-rise verdict-rise-1 mx-auto max-w-3xl pt-4 text-center">
          <p className="text-sm font-medium tracking-wide text-[var(--color-accent)] uppercase">
            Somnia Agentathon
          </p>
          <h1 className="verdict-display mt-4 text-[length:var(--text-display)] text-[var(--color-ink)]">
            Markets that settle themselves
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[length:var(--text-lede)] text-[var(--color-ink-muted)]">
            Stake YES or NO, then Somnia&apos;s agent reads your source URL and reaches
            validator consensus. Winners claim on-chain — no multisig, no trust-me bro.
          </p>
        </section>

        {!factoryConfigured && (
          <p className="verdict-rise verdict-rise-2 verdict-card mx-auto max-w-xl px-4 py-3 text-center text-sm text-[var(--color-accent)]">
            Set{" "}
            <span className="verdict-mono">NEXT_PUBLIC_FACTORY_ADDRESS</span> in{" "}
            <span className="verdict-mono">app/.env.local</span> (see deployments/shannon.json).
          </p>
        )}

        <section className="verdict-rise verdict-rise-2 grid gap-8 lg:grid-cols-[1fr_1.1fr]">
          <div className="verdict-card flex flex-col gap-5 p-6 lg:p-8">
            <h2 className="verdict-display text-[length:var(--text-title)]">Create a market</h2>
            <p className="text-sm text-[var(--color-ink-muted)]">
              Plain-English question, a URL for the agent, and a resolution rule.
            </p>
            <label className="flex flex-col gap-1.5 text-sm text-[var(--color-ink-muted)]">
              Question
              <input
                className="verdict-input"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-[var(--color-ink-muted)]">
              Source URL
              <input
                className="verdict-input verdict-mono"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-[var(--color-ink-muted)]">
              Resolution rule
              <textarea
                className="verdict-input min-h-24 resize-y"
                value={resolvePrompt}
                onChange={(e) => setResolvePrompt(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm text-[var(--color-ink-muted)]">
              Deadline (minutes)
              <input
                type="number"
                min={1}
                className="verdict-input max-w-[8rem]"
                value={deadlineMinutes}
                onChange={(e) => setDeadlineMinutes(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={!account || !factoryConfigured || busy}
              onClick={createMarket}
              className="verdict-btn verdict-btn-primary w-full sm:w-auto"
            >
              {busy ? "Creating…" : "Create market"}
            </button>
            {txHash && (
              <a
                className="verdict-mono break-all text-[var(--color-accent)] underline"
                href={`https://somnia-testnet.blockscout.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                View transaction
              </a>
            )}
            {marketAddress && (
              <Link
                href={`/market/${marketAddress}`}
                className="verdict-btn verdict-btn-ghost text-center"
              >
                Open new market →
              </Link>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="verdict-rise verdict-rise-3 flex items-end justify-between gap-4">
              <h2 className="verdict-display text-2xl">Live markets</h2>
              <span className="text-sm text-[var(--color-ink-faint)]">{markets.length} total</span>
            </div>
            {markets.length === 0 ? (
              <p className="verdict-card px-5 py-8 text-center text-sm text-[var(--color-ink-muted)]">
                No markets yet. Create one to get started.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {markets.slice(0, 8).map((m) => (
                  <MarketPreview key={m} address={m} />
                ))}
              </ul>
            )}
          </div>
        </section>

        {error && (
          <p className="verdict-card border-[oklch(62%_0.16_25/0.4)] px-4 py-3 text-sm text-[var(--color-no)]">
            {error}
          </p>
        )}

        <footer className="verdict-rise verdict-rise-4 border-t border-[var(--color-border)] pt-8 text-center text-sm text-[var(--color-ink-faint)]">
          <p className="verdict-display text-lg text-[var(--color-ink-muted)]">
            The resolver is on-chain. The receipt is public.
          </p>
          <p className="mt-3">
            CLI &amp; MCP: see{" "}
            <a className="text-[var(--color-accent)] underline" href="https://github.com/nice-bills/verdict">
              AGENTS.md
            </a>{" "}
            in the repo.
          </p>
        </footer>
      </main>
    </>
  );
}
