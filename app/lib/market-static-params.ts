import { listFactoryMarketAddresses } from "./market-on-chain";

/** Pre-render market pages at build time (GitHub Pages static export). */
export async function listMarketAddressesForStaticExport(): Promise<{ address: string }[]> {
  try {
    const addresses = await listFactoryMarketAddresses();
    return addresses.map((address) => ({ address: address.toLowerCase() }));
  } catch {
    return [];
  }
}
