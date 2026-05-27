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
import { GlassButton, GlassPanel } from "@/components/glass";

export default function Home() {
  const { account, connect, getWalletClient } = useWallet();
  const { markets, refresh: refreshMarkets, error: marketsError } = useMarkets();
  const [showCreate, setShowCreate] = useState(false);
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
      setShowCreate(false);
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

      <main className="page-shell page-shell--wide">
        {/* Centered hero — reference layout */}
        <section className="fade-rise fade-rise-1 mx-auto max-w-2xl pt-8 pb-16 text-center">
          <h1 className="display-serif text-[length:var(--text-hero)]">
            Ask a question.
            <br />
            Let the agent decide.
          </h1>
          <p className="mx-auto mt-6 max-w-md text-[length:var(--text-body)] text-[var(--color-ink-body)]">
            Stake on YES or NO. After the deadline, Somnia&apos;s agent reads your source and
            validators reach consensus — payouts settle on-chain.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <GlassButton type="button" onClick={() => setShowCreate((v) => !v)}>
              {showCreate ? "Hide form" : "Create market"}
            </GlassButton>
            {markets[0] && (
              <Link href={`/market/${markets[0]}`} className="glass-btn">
                View latest market
              </Link>
            )}
          </div>
        </section>

        {!factoryConfigured && (
          <p className="fade-rise fade-rise-2 mb-8 text-center text-sm text-[var(--color-no)]">
            Set NEXT_PUBLIC_FACTORY_ADDRESS in app/.env.local
          </p>
        )}

        {showCreate && (
          <GlassPanel className="fade-rise fade-rise-2 mx-auto mb-16 max-w-lg p-8">
            <h2 className="display-serif text-center text-2xl">New market</h2>
            <form
              className="mt-8 flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                void createMarket();
              }}
            >
              <label className="glass-label">
                Question
                <input
                  className="glass-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
              </label>
              <label className="glass-label">
                Source URL
                <input
                  className="glass-input"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
              </label>
              <label className="glass-label">
                Resolution rule
                <textarea
                  className="glass-input glass-textarea"
                  value={resolvePrompt}
                  onChange={(e) => setResolvePrompt(e.target.value)}
                />
              </label>
              <label className="glass-label">
                Deadline (minutes)
                <input
                  type="number"
                  min={1}
                  className="glass-input max-w-[120px]"
                  value={deadlineMinutes}
                  onChange={(e) => setDeadlineMinutes(e.target.value)}
                />
              </label>
              <GlassButton type="submit" disabled={!account || !factoryConfigured || busy}>
                {busy ? "Creating…" : "Create on Somnia"}
              </GlassButton>
            </form>
            {txHash && (
              <a
                className="mt-4 block text-center text-xs text-[var(--color-ink-muted)] underline"
                href={`https://somnia-testnet.blockscout.com/tx/${txHash}`}
                target="_blank"
                rel="noreferrer"
              >
                Transaction on Blockscout
              </a>
            )}
            {marketAddress && (
              <Link
                href={`/market/${marketAddress}`}
                className="glass-btn mt-4 w-full text-center"
              >
                Open market →
              </Link>
            )}
          </GlassPanel>
        )}

        <section className="fade-rise fade-rise-3">
          <h2 className="display-serif mb-6 text-center text-2xl">Markets</h2>
          {marketsError && (
            <p className="mb-4 text-center text-sm text-[var(--color-no)]">{marketsError}</p>
          )}
          {markets.length === 0 ? (
            <p className="text-center text-sm text-[var(--color-ink-muted)]">
              No markets yet — create one above.
            </p>
          ) : (
            <ul className="mx-auto flex max-w-lg flex-col gap-3">
              {markets.map((m, i) => (
                <li key={m}>
                  <Link href={`/market/${m}`} className="glass-panel block px-6 py-4 transition hover:scale-[1.01]">
                    <span className="text-sm text-[var(--color-ink-body)]">
                      Market {markets.length - i}
                    </span>
                    <span className="address-chip mt-1 block">{m}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {error && (
          <p className="fade-rise mt-8 text-center text-sm text-[var(--color-no)]">{error}</p>
        )}
      </main>
    </>
  );
}
