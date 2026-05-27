"use client";

import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { MarketCard } from "@/components/market-card";
import { GlassButton } from "@/components/glass";
import { useWallet } from "@/hooks/useWallet";
import { useMarketSummaries } from "@/hooks/useMarketSummaries";
import { FACTORY_ADDRESS } from "@/lib/contracts";

export default function Home() {
  const { account, connect } = useWallet();
  const { markets, loading, error, refresh } = useMarketSummaries();

  async function handleConnect() {
    try {
      await connect();
    } catch {
      /* surfaced on create / market pages */
    }
  }

  return (
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <section className="hero-marquee fade-rise">
        <h1 className="display-serif display-xxl">On-chain prediction markets.</h1>
      </section>

      <hr className="rule-thick" />

      <main className="page-gutter ecosystem fade-rise fade-rise-1">
        <header className="ecosystem__head">
          <div>
            <h2 className="display-serif ecosystem__title">Live markets</h2>
            <p className="ecosystem__lede">
              Stake STT on outcomes. After the deadline, Somnia&apos;s agent resolves from your
              source URL.
            </p>
          </div>
          <div className="ecosystem__actions">
            <GlassButton type="button" onClick={() => refresh()} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </GlassButton>
            <Link href="/create" className="glass-btn">
              New market
            </Link>
          </div>
        </header>

        {!FACTORY_ADDRESS && (
          <p className="banner-warn">
            Configure <code>NEXT_PUBLIC_FACTORY_ADDRESS</code> in <code>app/.env.local</code>
          </p>
        )}

        {error && <p className="banner-error">{error}</p>}

        {loading && markets.length === 0 && (
          <div className="market-grid">
            {[1, 2].map((i) => (
              <div key={i} className="glass-panel market-card market-card--skeleton" />
            ))}
          </div>
        )}

        {!loading && markets.length === 0 && !error && (
          <div className="empty-state glass-panel">
            <p className="display-serif empty-state__title">No markets yet</p>
            <p className="empty-state__body">
              Be the first to open a question on Somnia testnet.
            </p>
            <Link href="/create" className="glass-btn">
              Create a market
            </Link>
          </div>
        )}

        {markets.length > 0 && (
          <ul className="market-grid">
            {markets.map((m) => (
              <li key={m.address}>
                <MarketCard market={m} />
              </li>
            ))}
          </ul>
        )}
      </main>

      <footer className="foot-stmt page-gutter">
        <p className="foot-stmt__line display-serif">
          Stakes lock in. Agents resolve. Winners claim.
        </p>
        <div className="foot-stmt__meta">
          <span>Verdict · Somnia testnet</span>
          <a
            href="https://somnia-testnet.blockscout.com"
            target="_blank"
            rel="noreferrer"
            className="foot-stmt__link"
          >
            Blockscout
          </a>
        </div>
      </footer>
    </>
  );
}
