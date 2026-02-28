/**
 * ethers.js provider + signer helpers.
 *
 * Provides hooks for connecting to MetaMask and obtaining a provider / signer.
 */

import { BrowserProvider, JsonRpcProvider } from "ethers";
import { chainConfig } from "./config";

/* ------------------------------------------------------------------ */
/*  Read-only provider (no wallet required)                            */
/* ------------------------------------------------------------------ */

let readProvider: JsonRpcProvider | null = null;

/**
 * Get a read-only JSON-RPC provider for Polygon Amoy.
 * Used for reading contract state without a wallet.
 */
export function getReadProvider(): JsonRpcProvider {
  if (!readProvider) {
    readProvider = new JsonRpcProvider(chainConfig.rpcUrls[0]);
  }
  return readProvider;
}

/* ------------------------------------------------------------------ */
/*  MetaMask / browser wallet                                          */
/* ------------------------------------------------------------------ */

declare global {
  interface Window {
    ethereum?: Record<string, unknown> & {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      isMetaMask?: boolean;
      on: (event: string, cb: (...args: unknown[]) => void) => void;
      removeListener: (event: string, cb: (...args: unknown[]) => void) => void;
    };
  }
}

/**
 * Check if MetaMask (or another injected wallet) is available.
 */
export function isWalletAvailable(): boolean {
  return typeof window !== "undefined" && !!window.ethereum;
}

/**
 * Request MetaMask connection and return a BrowserProvider + signer.
 * Also ensures the user is on the correct network.
 */
export async function connectWallet(): Promise<{
  provider: BrowserProvider;
  signer: Awaited<ReturnType<BrowserProvider["getSigner"]>>;
  address: string;
}> {
  if (!isWalletAvailable()) {
    throw new Error(
      "MetaMask is not installed. Please install the MetaMask browser extension."
    );
  }

  const ethereum = window.ethereum!;

  // Request accounts
  await ethereum.request({ method: "eth_requestAccounts" });

  // Switch / add the Polygon Amoy network
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainConfig.chainIdHex }],
    });
  } catch (switchError: unknown) {
    // If the chain hasn't been added, add it
    if ((switchError as { code?: number })?.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: chainConfig.chainIdHex,
            chainName: chainConfig.chainName,
            rpcUrls: chainConfig.rpcUrls,
            nativeCurrency: chainConfig.nativeCurrency,
            blockExplorerUrls: chainConfig.blockExplorerUrls,
          },
        ],
      });
    } else {
      throw switchError;
    }
  }

  const provider = new BrowserProvider(ethereum as never);
  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
}

/**
 * Get the currently connected address, or null.
 */
export async function getConnectedAddress(): Promise<string | null> {
  if (!isWalletAvailable()) return null;
  try {
    const provider = new BrowserProvider(window.ethereum as never);
    const signer = await provider.getSigner();
    return await signer.getAddress();
  } catch {
    return null;
  }
}
