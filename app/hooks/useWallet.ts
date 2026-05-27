"use client";

import { useCallback, useEffect, useState } from "react";
import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { somniaTestnet } from "@/lib/chain";

type EthereumProvider = Parameters<typeof custom>[0];

const CHAIN_HEX = `0x${somniaTestnet.id.toString(16)}`;

function getEthereum(): EthereumProvider | undefined {
  if (typeof window === "undefined") return undefined;
  return window.ethereum as EthereumProvider | undefined;
}

async function ensureSomniaChain(eth: EthereumProvider) {
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CHAIN_HEX }],
    });
  } catch (switchError: unknown) {
    const code = (switchError as { code?: number })?.code;
    if (code !== 4902) throw switchError;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: CHAIN_HEX,
          chainName: somniaTestnet.name,
          nativeCurrency: somniaTestnet.nativeCurrency,
          rpcUrls: somniaTestnet.rpcUrls.default.http,
          blockExplorerUrls: [somniaTestnet.blockExplorers!.default!.url],
        },
      ],
    });
  }
}

export function useWallet() {
  const [account, setAccount] = useState<Address | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    const eth = getEthereum();
    if (!eth) return;

    eth.request({ method: "eth_accounts" })
      .then((accounts) => {
        const first = (accounts as string[])[0];
        if (first) setAccount(first as Address);
      })
      .catch(() => {});

    const onAccounts = (accounts: unknown) => {
      const list = accounts as string[];
      setAccount(list[0] ? (list[0] as Address) : null);
    };

    const provider = eth as EthereumProvider & {
      on?(event: string, handler: (...args: unknown[]) => void): void;
      removeListener?(event: string, handler: (...args: unknown[]) => void): void;
    };
    provider.on?.("accountsChanged", onAccounts);
    return () => {
      provider.removeListener?.("accountsChanged", onAccounts);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = getEthereum();
    if (!eth) {
      throw new Error("Install MetaMask or another EVM wallet.");
    }
    setConnectError(null);
    await ensureSomniaChain(eth);
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

  return { account, connect, getWalletClient, connectError, setConnectError };
}
