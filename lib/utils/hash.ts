/**
 * Hash helpers — Poseidon hashing matching the ZoKrates circuit.
 *
 * Uses circomlibjs Poseidon implementation which matches the
 * ZoKrates Poseidon hash (both use the iden3 Poseidon standard
 * over the BN128 scalar field).
 *
 * The Poseidon hasher is initialised lazily (async) and cached.
 * All hash functions are now async since Poseidon requires WASM init.
 *
 * A synchronous keccak256 fallback is available via `poseidonHashSync()`
 * for cases where async is not feasible (e.g. Merkle tree building in
 * the in-memory registration API). The fallback produces different hashes
 * that won't match the circuit — acceptable for prototype UI testing
 * without a deployed contract.
 */

import { keccak256, AbiCoder } from "ethers";

// circomlibjs is a CommonJS module — dynamic import for ESM compat
let poseidonInstance: ((inputs: bigint[]) => Uint8Array) | null = null;
let poseidonF: { toString: (v: Uint8Array, radix: number) => string } | null =
  null;

const coder = new AbiCoder();

/**
 * Initialise the Poseidon hasher (lazy, cached).
 */
async function getPoseidon() {
  if (poseidonInstance && poseidonF) return { poseidon: poseidonInstance, F: poseidonF };

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const circomlibjs = await import("circomlibjs");
  const poseidon = await circomlibjs.buildPoseidon();
  poseidonInstance = poseidon;
  poseidonF = poseidon.F;
  return { poseidon, F: poseidon.F };
}

/* ------------------------------------------------------------------ */
/*  Async Poseidon (preferred — matches ZoKrates circuit)              */
/* ------------------------------------------------------------------ */

/**
 * Hash two field elements together using Poseidon.
 * Returns a decimal string representation of the hash (field element).
 */
export async function poseidonHashAsync(a: string, b: string): Promise<string> {
  const { poseidon, F } = await getPoseidon();
  const hash = poseidon([BigInt(a), BigInt(b)]);
  return F.toString(hash, 10);
}

/**
 * Compute voter commitment = Poseidon(nid, secret) — async version.
 */
export async function computeCommitmentAsync(
  nid: string,
  secret: string
): Promise<string> {
  const nidField = nidToField(nid);
  const secretField = BigInt(secret).toString();
  return poseidonHashAsync(nidField, secretField);
}

/**
 * Compute nullifier hash = Poseidon(secret, electionId) — async version.
 */
export async function computeNullifierAsync(
  secret: string,
  electionId: number = 1
): Promise<string> {
  return poseidonHashAsync(secret, electionId.toString());
}

/* ------------------------------------------------------------------ */
/*  Sync fallback (keccak256 — for prototype/testing only)             */
/* ------------------------------------------------------------------ */

/**
 * Hash two field elements together (keccak256 fallback).
 * Returns a hex string. Does NOT match the ZoKrates circuit.
 * Used only when async Poseidon is not feasible.
 */
export function poseidonHash(a: string, b: string): string {
  const packed = coder.encode(
    ["uint256", "uint256"],
    [BigInt(a), BigInt(b)]
  );
  return keccak256(packed);
}

/**
 * Compute voter commitment = Hash(nid, secret) — sync fallback.
 */
export function computeCommitment(nid: string, secret: string): string {
  const nidField = nidToField(nid);
  const secretField = BigInt(secret).toString();
  return poseidonHash(nidField, secretField);
}

/**
 * Compute nullifier hash = Hash(secret, electionId) — sync fallback.
 */
export function computeNullifier(
  secret: string,
  electionId: number = 1
): string {
  return poseidonHash(secret, electionId.toString());
}

/* ------------------------------------------------------------------ */
/*  Shared utilities                                                   */
/* ------------------------------------------------------------------ */

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
