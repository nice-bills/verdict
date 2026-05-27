"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe } from "lucide-react";

type LiquidNavProps = {
  account?: `0x${string}` | null;
  onConnect: () => void;
};

const LINKS = [
  { href: "/", label: "Markets" },
  { href: "/create", label: "Create" },
  { href: "/#how", label: "How it works" },
] as const;

export function LiquidNav({ account, onConnect }: LiquidNavProps) {
  const pathname = usePathname();

  return (
    <header className="relative z-20 px-6 py-6">
      <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-white">
            <Globe size={24} aria-hidden />
            Verdict
          </Link>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Primary">
            {LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`text-sm font-medium transition-colors ${
                  pathname === href || (href === "/" && pathname === "/")
                    ? "text-white"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://agents.testnet.somnia.network"
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline"
          >
            Receipts
          </a>
          <button
            type="button"
            onClick={onConnect}
            className="liquid-glass rounded-full px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5"
          >
            {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect"}
          </button>
        </div>
      </div>
    </header>
  );
}
