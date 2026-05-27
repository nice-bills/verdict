"use client";

import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { MarketCard } from "@/components/market-card";
import { HowItWorks } from "@/components/how-it-works";
import { WalletBanner } from "@/components/wallet-banner";
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
      /* WalletBanner surfaces connect on other pages */
    }
  }

  return (
    <>
      <SiteNav account={account} onConnect={handleConnect} />

      <section className="hero-marquee fade-rise">
        <h1 className="display-serif display-xxl">Ask the chain.</h1>
        <p className="hero-marquee__lede">
          Prediction markets on Somnia — resolved by validator consensus, not a multisig.
        </p>
        <div className="hero-marquee__cta">
          <Link href="/create" className="glass-btn">
            Open a market
          </Link>
          {markets[0] && (
            <Link href={`/market/${markets[0].address}`} className="glass-btn glass-btn--ghost">
              View live market
            </Link>
          )}
        </div>
      </section>

      <hr className="rule-thick" />

      <WalletBanner connected={Boolean(account)} onConnect={handleConnect} />

      <HowItWorks />

      <main className="page-gutter ecosystem fade-rise fade-rise-3">
        <header className="ecosystem__head">
          <div>
            <h2 className="display-serif ecosystem__title">Live markets</h2>
            <p className="ecosystem__lede">
              Questions and pools are read from the factory on Somnia testnet.
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
            Set NEXT_PUBLIC_FACTORY_ADDRESS in app/.env.local (see deployments/shannon.json).
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
            <p className="empty-state__body">Create the first market on Somnia testnet.</p>
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
          <span>Verdict · Somnia Agentathon</span>
          <a
            href="https://agents.testnet.somnia.network"
            target="_blank"
            rel="noreferrer"
            className="foot-stmt__link"
          >
            Agent receipts
          </a>
        </div>
      </footer>
    </>
  );
}
