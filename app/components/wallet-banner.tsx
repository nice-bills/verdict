"use client";

import { GlassButton, GlassPanel } from "@/components/glass";

type WalletBannerProps = {
  connected: boolean;
  onConnect: () => void;
};

export function WalletBanner({ connected, onConnect }: WalletBannerProps) {
  if (connected) return null;

  return (
    <GlassPanel className="wallet-banner fade-rise fade-rise-1">
      <p className="wallet-banner__text">
        Connect MetaMask on <strong>Somnia testnet</strong> (chain 50312) to create markets and
        stake.
      </p>
      <GlassButton type="button" onClick={onConnect}>
        Connect wallet
      </GlassButton>
    </GlassPanel>
  );
}
