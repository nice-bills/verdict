"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Menu, X } from "lucide-react";
import { AGENTS_URL } from "@/lib/constants";

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
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-20 px-6 py-6">
      <div className="liquid-glass mx-auto flex max-w-5xl items-center justify-between rounded-full px-6 py-3">
        <div className="flex items-center gap-4 md:gap-8">
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
        <div className="flex items-center gap-3 md:gap-4">
          <a
            href={AGENTS_URL}
            target="_blank"
            rel="noreferrer"
            className="hidden text-sm font-medium text-white/80 transition-colors hover:text-white sm:inline"
          >
            Receipts
          </a>
          <button
            type="button"
            onClick={onConnect}
            className="liquid-glass rounded-full px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/5 md:px-6"
          >
            {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect"}
          </button>
          <button
            type="button"
            className="liquid-glass rounded-full p-2 text-white md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          className="liquid-glass mx-auto mt-3 flex max-w-5xl flex-col gap-2 rounded-2xl p-4 md:hidden"
          aria-label="Mobile"
        >
          {LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
              onClick={() => setOpen(false)}
            >
              {label}
            </Link>
          ))}
          <a
            href={AGENTS_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
          >
            Agent receipts
          </a>
        </nav>
      )}
    </header>
  );
}
