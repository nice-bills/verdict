import { AGENTS_EXPLORER_URL, somniaTestnet } from "./chain";

export const MIN_STAKE_STT = "0.001";

export const BLOCKSCOUT_URL =
  somniaTestnet.blockExplorers?.default?.url ?? "https://somnia-testnet.blockscout.com";

export const AGENTS_URL = AGENTS_EXPLORER_URL;

export const POLL_MARKET_MS = 5_000;
export const POLL_MARKETS_MS = 8_000;

export function blockscoutTxUrl(hash: string) {
  return `${BLOCKSCOUT_URL}/tx/${hash}`;
}

export function blockscoutAddressUrl(address: string) {
  return `${BLOCKSCOUT_URL}/address/${address}`;
}
