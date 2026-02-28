/**
 * Async Merkle tree utilities using real Poseidon hash.
 *
 * This module mirrors the API of merkle.ts but uses the async Poseidon hash
 * from circomlibjs, producing hashes that match the ZoKrates circuit.
 *
 * Use this module for any Merkle operations that feed into ZKP generation.
 * The sync merkle.ts (keccak256) is still used by the in-memory /api/register
 * route for prototype UI testing.
 */

import { poseidonHashAsync } from "./hash";
import { MERKLE_DEPTH } from "./constants";

const ZERO_VALUE = "0";

export interface MerkleProof {
  /** The sibling hashes along the path (decimal field element strings) */
  path: string[];
  /** 0 = left, 1 = right — indicates which side the proof element is on */
  indices: number[];
  /** The root of the tree (decimal field element string) */
  root: string;
  /** The leaf's index in the tree */
  leafIndex: number;
}

/**
 * Build a complete Merkle tree from a list of leaf commitments using Poseidon.
 * Pads with zero values to reach 2^depth leaves.
 * Returns layers from bottom (leaves) to top (root).
 */
export async function buildPoseidonMerkleTree(
  leaves: string[],
  depth: number = MERKLE_DEPTH
): Promise<string[][]> {
  const width = 2 ** depth;
  // Pad leaves to fill the tree
  const paddedLeaves = [...leaves];
  while (paddedLeaves.length < width) {
    paddedLeaves.push(ZERO_VALUE);
  }

  const layers: string[][] = [paddedLeaves];

  let currentLayer = paddedLeaves;
  for (let i = 0; i < depth; i++) {
    const nextLayer: string[] = [];
    for (let j = 0; j < currentLayer.length; j += 2) {
      const hash = await poseidonHashAsync(
        currentLayer[j],
        currentLayer[j + 1]
      );
      nextLayer.push(hash);
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return layers;
}

/**
 * Get the Merkle root from a pre-built tree.
 */
export function getPoseidonMerkleRoot(tree: string[][]): string {
  return tree[tree.length - 1][0];
}

/**
 * Generate a Merkle proof for a leaf at the given index.
 */
export function generatePoseidonMerkleProof(
  tree: string[][],
  leafIndex: number,
  depth: number = MERKLE_DEPTH
): MerkleProof {
  const path: string[] = [];
  const indices: number[] = [];
  let idx = leafIndex;

  for (let i = 0; i < depth; i++) {
    const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
    path.push(tree[i][siblingIdx]);
    indices.push(idx % 2);
    idx = Math.floor(idx / 2);
  }

  return {
    path,
    indices,
    root: getPoseidonMerkleRoot(tree),
    leafIndex,
  };
}

/**
 * Verify a Merkle proof against a root using async Poseidon.
 */
export async function verifyPoseidonMerkleProof(
  leaf: string,
  proof: MerkleProof
): Promise<boolean> {
  let currentHash = leaf;

  for (let i = 0; i < proof.path.length; i++) {
    const left =
      proof.indices[i] === 0 ? currentHash : proof.path[i];
    const right =
      proof.indices[i] === 0 ? proof.path[i] : currentHash;
    currentHash = await poseidonHashAsync(left, right);
  }

  return currentHash === proof.root;
}
