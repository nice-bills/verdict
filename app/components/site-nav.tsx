"use client";

import Link from "next/link";

type SiteNavProps = {
  account?: `0x${string}` | null;
  onConnect: () => void;
};

export function SiteNav({ account, onConnect }: SiteNavProps) {
  return (
    <nav className="verdict-rise mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-6">
      <Link href="/" className="verdict-display text-xl text-[var(--color-ink)]">
        Verdict
      </Link>
      <div className="verdict-pill flex items-center gap-1 px-2 py-1.5 text-sm">
        <Link
          href="/"
          className="rounded-full px-3 py-1.5 text-[var(--color-ink-muted)] transition hover:bg-[oklch(100%_0_0/0.08)] hover:text-[var(--color-ink)]"
        >
          Markets
        </Link>
        <a
          href="https://somnia-testnet.blockscout.com"
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-3 py-1.5 text-[var(--color-ink-muted)] transition hover:bg-[oklch(100%_0_0/0.08)] hover:text-[var(--color-ink)]"
        >
          Explorer
        </a>
        <a
          href="https://agents.testnet.somnia.network"
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-3 py-1.5 text-[var(--color-ink-muted)] transition hover:bg-[oklch(100%_0_0/0.08)] hover:text-[var(--color-ink)]"
        >
          Agent receipts
        </a>
        <button
          type="button"
          onClick={onConnect}
          className="verdict-btn verdict-btn-primary ml-1 !py-2 !text-xs"
        >
          {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect"}
        </button>
      </div>
    </nav>
  );
}
