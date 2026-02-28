/**
 * Hash helpers — lightweight Poseidon-like hashing.
 *
 * In production the Poseidon hash that matches the ZoKrates circuit is required.
 * For the prototype we use ethers.js keccak256 as a stand-in until the real
 * Poseidon WASM is integrated from the ZoKrates provider.
 */

import { keccak256, AbiCoder, toBeHex } from "ethers";

const coder = new AbiCoder();

/**
 * Hash two field elements together (Poseidon placeholder).
 * Returns a BigInt-compatible hex string (uint256).
 */
export function poseidonHash(a: string, b: string): string {
  const packed = coder.encode(
    ["uint256", "uint256"],
    [BigInt(a), BigInt(b)]
  );
  return keccak256(packed);
}

/**
 * Compute voter commitment = Hash(nid, secret)
 */
export function computeCommitment(nid: string, secret: string): string {
  // Convert NID string (e.g. "A123456") to a numeric field element
  const nidField = nidToField(nid);
  const secretField = BigInt(secret).toString();
  return poseidonHash(nidField, secretField);
}

/**
 * Compute nullifier hash = Hash(secret, electionId)
 */
export function computeNullifier(
  secret: string,
  electionId: number = 1
): string {
  return poseidonHash(secret, electionId.toString());
}

/**
 * Convert an alphanumeric NID (e.g. "A123456") to a numeric field element.
 * Uses simple encoding: each char → its UTF-16 code, concatenated.
 */
export function nidToField(nid: string): string {
  let result = BigInt(0);
  for (let i = 0; i < nid.length; i++) {
    result = result * BigInt(256) + BigInt(nid.charCodeAt(i));
  }
  return result.toString();
}

/**
 * Convert a hex hash to a BigInt string (for circuit inputs).
 */
export function hashToBigInt(hash: string): string {
  return BigInt(hash).toString();
}
