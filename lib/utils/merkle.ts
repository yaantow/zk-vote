/**
 * Merkle tree utilities for the voter registry.
 *
 * Builds a binary Merkle tree from voter commitment hashes and generates
 * inclusion proofs that can be passed to the ZoKrates circuit.
 */

import { poseidonHash } from "./hash";
import { MERKLE_DEPTH } from "./constants";

const ZERO_VALUE =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export interface MerkleProof {
  /** The sibling hashes along the path */
  path: string[];
  /** 0 = left, 1 = right — indicates which side the proof element is on */
  indices: number[];
  /** The root of the tree */
  root: string;
  /** The leaf's index in the tree */
  leafIndex: number;
}

/**
 * Build a complete Merkle tree from a list of leaf commitments.
 * Pads with ZERO_VALUE to reach 2^depth leaves.
 */
export function buildMerkleTree(
  leaves: string[],
  depth: number = MERKLE_DEPTH
): string[][] {
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
      nextLayer.push(poseidonHash(currentLayer[j], currentLayer[j + 1]));
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return layers;
}

/**
 * Get the Merkle root from a pre-built tree.
 */
export function getMerkleRoot(tree: string[][]): string {
  return tree[tree.length - 1][0];
}

/**
 * Generate a Merkle proof for a leaf at the given index.
 */
export function generateMerkleProof(
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
    indices.push(idx % 2); // 0 if current is on the left, 1 if on the right
    idx = Math.floor(idx / 2);
  }

  return {
    path,
    indices,
    root: getMerkleRoot(tree),
    leafIndex,
  };
}

/**
 * Verify a Merkle proof against a root.
 */
export function verifyMerkleProof(
  leaf: string,
  proof: MerkleProof
): boolean {
  let currentHash = leaf;

  for (let i = 0; i < proof.path.length; i++) {
    const left = proof.indices[i] === 0 ? currentHash : proof.path[i];
    const right = proof.indices[i] === 0 ? proof.path[i] : currentHash;
    currentHash = poseidonHash(left, right);
  }

  return currentHash === proof.root;
}
