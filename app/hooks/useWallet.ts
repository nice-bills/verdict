"use client";

import { useCallback, useState } from "react";
import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { somniaTestnet } from "@/lib/chain";

type EthereumProvider = Parameters<typeof custom>[0];

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return window.ethereum as EthereumProvider | undefined;
}

export function useWallet() {
  const [account, setAccount] = useState<Address | null>(null);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      throw new Error("Install MetaMask or another EVM wallet.");
    }
    const wallet = createWalletClient({
      chain: somniaTestnet,
      transport: custom(eth),
    });
    const [addr] = await wallet.requestAddresses();
    setAccount(addr);
    return addr;
  }, []);

  const getWalletClient = useCallback((): WalletClient => {
    const eth = getEthereum();
    if (!eth) throw new Error("No wallet found");
    if (!account) throw new Error("Connect wallet first");
    return createWalletClient({
      account,
      chain: somniaTestnet,
      transport: custom(eth),
    });
  }, [account]);

  return { account, connect, getWalletClient };
}
