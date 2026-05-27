"use client";

import Link from "next/link";
import { GlassButton } from "@/components/glass";

type SiteNavProps = {
  account?: `0x${string}` | null;
  onConnect: () => void;
};

export function SiteNav({ account, onConnect }: SiteNavProps) {
  return (
    <header className="fade-rise mx-auto flex w-full max-w-5xl items-center justify-between gap-6 px-6 py-8">
      <Link href="/" className="display-serif text-2xl text-[var(--color-ink)]">
        Verdict
      </Link>

      <nav className="hidden items-center gap-8 text-sm text-[var(--color-ink-body)] sm:flex">
        <Link href="/" className="transition hover:text-[var(--color-ink)]">
          Markets
        </Link>
        <a
          href="https://somnia-testnet.blockscout.com"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-[var(--color-ink)]"
        >
          Explorer
        </a>
        <a
          href="https://agents.testnet.somnia.network"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-[var(--color-ink)]"
        >
          Receipts
        </a>
      </nav>

      <GlassButton type="button" onClick={onConnect} className="!min-h-[40px] !px-5 !text-xs">
        {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect wallet"}
      </GlassButton>
    </header>
  );
}
