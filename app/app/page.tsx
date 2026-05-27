"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ExternalLink, Globe, Link2 } from "lucide-react";
import { VerdictShell } from "@/components/verdict-shell";
import { LiquidNav } from "@/components/liquid-nav";
import { MarketCard } from "@/components/market-card";
import { useWallet } from "@/hooks/useWallet";
import { useMarketSummaries } from "@/hooks/useMarketSummaries";
import { FACTORY_ADDRESS } from "@/lib/contracts";

export default function Home() {
  const router = useRouter();
  const { account, connect } = useWallet();
  const { markets, loading, error, refresh } = useMarketSummaries();
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleConnect() {
    setConnectError(null);
    try {
      await connect();
    } catch (e) {
      setConnectError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <VerdictShell>
      <LiquidNav account={account} onConnect={handleConnect} />

      {/* Hero — full viewport, spec layout */}
      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12 text-center -translate-y-[10%]">
        <h1
          className="font-instrument mb-8 text-5xl tracking-tight text-white md:text-6xl lg:text-7xl lg:whitespace-nowrap"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          Settled on Somnia.
        </h1>

        <div className="w-full max-w-xl space-y-4">
          <form
            className="liquid-glass flex items-center gap-3 rounded-full py-2 pl-6 pr-2"
            onSubmit={(e) => {
              e.preventDefault();
              router.push("/create");
            }}
          >
            <input
              type="text"
              className="liquid-glass-input"
              placeholder="Open a new prediction market…"
              readOnly
              onFocus={() => router.push("/create")}
            />
            <button
              type="submit"
              className="rounded-full bg-white p-3 text-black transition-transform hover:scale-105"
              aria-label="Create market"
            >
              <ArrowRight size={20} />
            </button>
          </form>

          <p className="px-4 text-sm leading-relaxed text-white">
            Stake YES or NO in STT. After the deadline, Somnia&apos;s agent reads your source URL
            and validators reach consensus — winners claim on-chain.
          </p>

          <Link
            href="/create"
            className="liquid-glass inline-block rounded-full px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            Create a market
          </Link>
        </div>
      </section>

      <footer className="relative z-10 flex justify-center gap-4 pb-12">
        {[
          { href: "https://somnia-testnet.blockscout.com", label: "Blockscout", Icon: Globe },
          { href: "https://agents.testnet.somnia.network", label: "Agents", Icon: ExternalLink },
          { href: "https://somnia.network", label: "Somnia", Icon: Link2 },
        ].map(({ href, label, Icon }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={label}
            className="liquid-glass rounded-full p-4 text-white/80 transition-all hover:bg-white/5 hover:text-white"
          >
            <Icon size={20} />
          </a>
        ))}
      </footer>

      {/* Below fold — full app */}
      <section id="how" className="app-section px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-instrument text-3xl text-white md:text-4xl">How it works</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {[
              ["01", "Create", "Question, URL, and resolution rule."],
              ["02", "Stake", "Back YES or NO before the deadline."],
              ["03", "Resolve", "Somnia agent + validator consensus."],
              ["04", "Claim", "Winners paid; INVALID refunds all."],
            ].map(([n, title, body]) => (
              <li key={n} className="liquid-glass rounded-2xl p-5 text-left">
                <span className="text-xs text-white/50">{n}</span>
                <h3 className="mt-2 font-medium text-white">{title}</h3>
                <p className="mt-2 text-sm text-white/70">{body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="app-section border-t border-white/10 px-6 pb-24 pt-4">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="font-instrument text-3xl text-white">Live markets</h2>
              <p className="mt-2 max-w-md text-sm text-white/60">
                Loaded from your factory on Somnia. Legacy dev smoke tests are hidden.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => refresh()}
                disabled={loading}
                className="liquid-glass rounded-full px-5 py-2 text-sm text-white hover:bg-white/5 disabled:opacity-40"
              >
                {loading ? "Refreshing…" : "Refresh"}
              </button>
              <Link
                href="/create"
                className="liquid-glass rounded-full px-5 py-2 text-sm text-white hover:bg-white/5"
              >
                New market
              </Link>
            </div>
          </div>

          {connectError && (
            <p className="mb-6 rounded-2xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
              {connectError}
            </p>
          )}

          {!FACTORY_ADDRESS && (
            <p className="mb-6 rounded-2xl bg-amber-500/10 px-4 py-3 text-center text-sm text-amber-200">
              Factory address missing — check deployments/shannon.json or set NEXT_PUBLIC_FACTORY_ADDRESS
            </p>
          )}

          {error && (
            <p className="mb-6 rounded-2xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-200">
              {error}
            </p>
          )}

          {loading && markets.length === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="liquid-glass h-36 animate-pulse rounded-2xl" />
              ))}
            </div>
          )}

          {!loading && markets.length === 0 && !error && (
            <div className="liquid-glass rounded-2xl p-12 text-center">
              <p className="font-instrument text-2xl text-white">No markets yet</p>
              <p className="mt-3 text-sm text-white/60">
                Create one for your Agentathon demo — use &quot;Use demo example&quot; on the create
                page.
              </p>
              <Link
                href="/create"
                className="liquid-glass mt-6 inline-block rounded-full px-8 py-3 text-sm text-white hover:bg-white/5"
              >
                Create a market
              </Link>
            </div>
          )}

          {markets.length > 0 && (
            <ul className="grid gap-4 md:grid-cols-2">
              {markets.map((m) => (
                <li key={m.address}>
                  <MarketCard market={m} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </VerdictShell>
  );
}
