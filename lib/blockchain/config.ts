/**
 * Blockchain configuration — contract addresses, chain config, ABI reference.
 */

import {
  POLYGON_AMOY_CHAIN_ID,
  POLYGON_AMOY_RPC,
  CONTRACT_ADDRESS,
} from "@/lib/utils/constants";

export const chainConfig = {
  chainId: POLYGON_AMOY_CHAIN_ID,
  chainIdHex: `0x${POLYGON_AMOY_CHAIN_ID.toString(16)}`,
  chainName: "Polygon Amoy Testnet",
  rpcUrls: [POLYGON_AMOY_RPC],
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  blockExplorerUrls: ["https://amoy.polygonscan.com"],
};

export const contractConfig = {
  address: CONTRACT_ADDRESS,
  // ABI is loaded from @/lib/blockchain/abi/ZKVoting.json at runtime
};
