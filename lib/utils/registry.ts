/**
 * Shared voter registry — persisted to disk so it survives server restarts.
 *
 * The admin pre-registers NIDs with Poseidon commitments (secret = "0000").
 * After setupElection, the registry is frozen. Voters only look up their proof.
 *
 * Storage: .registry-data.json in the project root (git-ignored).
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";

const REGISTRY_FILE = join(process.cwd(), ".registry-data.json");

/** Ordered list of commitments (index = leaf position in Merkle tree) */
export const registeredCommitments: string[] = [];

/** Map of NID → commitment for fast lookup */
export const nidToCommitment: Map<string, string> = new Map();

/** Cached Merkle tree layers */
export let cachedTree: string[][] | null = null;

export function setCachedTree(tree: string[][]): void {
  cachedTree = tree;
}

/** Register an NID with its commitment (admin only, before election setup) */
export function registerVoter(nid: string, commitment: string): void {
  if (!nidToCommitment.has(nid)) {
    nidToCommitment.set(nid, commitment);
    registeredCommitments.push(commitment);
  }
}

/** Look up the commitment for a given NID */
export function getCommitmentByNid(nid: string): string | null {
  return nidToCommitment.get(nid) ?? null;
}

/** Persist the current registry to disk */
export function saveRegistryToDisk(): void {
  try {
    const data = {
      nids: Array.from(nidToCommitment.entries()).map(([nid, commitment]) => ({
        nid,
        commitment,
      })),
    };
    writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), "utf-8");
    console.log(`[registry] Saved ${data.nids.length} voters to disk`);
  } catch (err) {
    console.error("[registry] Failed to save to disk:", err);
  }
}

/** Load the registry from disk (called on cold start) */
export function loadRegistryFromDisk(): void {
  try {
    if (!existsSync(REGISTRY_FILE)) return;
    const raw = readFileSync(REGISTRY_FILE, "utf-8");
    const data = JSON.parse(raw) as { nids: { nid: string; commitment: string }[] };

    // Restore state
    registeredCommitments.length = 0;
    nidToCommitment.clear();
    cachedTree = null;

    for (const { nid, commitment } of data.nids) {
      nidToCommitment.set(nid, commitment);
      registeredCommitments.push(commitment);
    }
    console.log(`[registry] Loaded ${data.nids.length} voters from disk`);
  } catch (err) {
    console.error("[registry] Failed to load from disk:", err);
  }
}

/** Reset the registry (for re-setup) */
export function resetRegistry(): void {
  registeredCommitments.length = 0;
  nidToCommitment.clear();
  cachedTree = null;
  try {
    if (existsSync(REGISTRY_FILE)) {
      writeFileSync(REGISTRY_FILE, JSON.stringify({ nids: [] }, null, 2), "utf-8");
    }
  } catch {
    // ignore
  }
}
