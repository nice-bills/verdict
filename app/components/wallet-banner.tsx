"use client";

type WalletBannerProps = {
  connected: boolean;
  onConnect: () => void;
};

export function WalletBanner({ connected, onConnect }: WalletBannerProps) {
  if (connected) return null;

  return (
    <div className="liquid-glass mx-auto mb-8 max-w-md rounded-2xl p-6 text-center">
      <p className="text-sm text-white/80">
        Connect MetaMask on <strong className="text-white">Somnia testnet</strong> (chain 50312).
      </p>
      <button
        type="button"
        onClick={onConnect}
        className="liquid-glass mt-4 rounded-full px-6 py-2 text-sm font-medium text-white hover:bg-white/5"
      >
        Connect wallet
      </button>
    </div>
  );
}
