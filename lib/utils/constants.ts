// App-wide constants

export const APP_NAME = "ZK-Vote Maldives";
export const APP_DESCRIPTION =
  "Decentralized Privacy-Preserving E-Voting for the Maldives";

// Blockchain
export const POLYGON_AMOY_CHAIN_ID = 80002;
export const POLYGON_AMOY_RPC =
  process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC ??
  "https://rpc-amoy.polygon.technology";
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ?? "";
export const ELECTION_ID =
  Number(process.env.NEXT_PUBLIC_ELECTION_ID) || 1;

// Merkle tree
export const MERKLE_DEPTH =
  Number(process.env.NEXT_PUBLIC_MERKLE_DEPTH) || 6; // 2^6 = 64 max voters

// Proof generation
export const PROOF_ARTIFACTS_PATH = "/zk";
export const PROVING_KEY_FILE = `${PROOF_ARTIFACTS_PATH}/proving-key.bin`;
export const ARTIFACTS_FILE = `${PROOF_ARTIFACTS_PATH}/artifacts.json`;

// Election defaults (used before contract is deployed)
export const DEFAULT_CANDIDATES = [
  "Ibrahim Mohamed Solih",
  "Mohamed Muizzu",
  "Ilyas Labeeb",
  "Qasim Ibrahim",
];

// Auto-refresh interval for results page (ms)
export const RESULTS_REFRESH_INTERVAL = 15_000;

// Offline queue DB name
export const OFFLINE_DB_NAME = "zk-vote-offline";
export const OFFLINE_STORE_NAME = "queued-votes";
