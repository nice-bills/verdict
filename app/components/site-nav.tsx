"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GlassButton } from "@/components/glass";

type SiteNavProps = {
  account?: `0x${string}` | null;
  onConnect: () => void;
};

const LINKS = [
  { href: "/", label: "Markets" },
  { href: "/create", label: "Create" },
] as const;

export function SiteNav({ account, onConnect }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <nav className="nav-pill" aria-label="Primary">
      <Link href="/" className="nav-pill__wordmark display-serif">
        Verdict
      </Link>
      <ul className="nav-pill__links">
        {LINKS.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className={pathname === href ? "nav-pill__link--active" : undefined}
            >
              {label}
            </Link>
          </li>
        ))}
        <li>
          <a
            href="https://agents.testnet.somnia.network"
            target="_blank"
            rel="noreferrer"
          >
            Receipts
          </a>
        </li>
      </ul>
      <GlassButton type="button" onClick={onConnect} className="nav-pill__cta">
        {account ? `${account.slice(0, 6)}…${account.slice(-4)}` : "Connect"}
      </GlassButton>
    </nav>
  );
}
