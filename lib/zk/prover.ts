/**
 * Client-side ZKP proof generation logic.
 *
 * Loads pre-compiled circuit artifacts & proving key from /public/zk,
 * computes a witness, and generates a Groth16 proof — all in the browser.
 */

import { getZoKratesProvider } from "./zokrates";
import { PROVING_KEY_FILE, ARTIFACTS_FILE } from "@/lib/utils/constants";
import type { CompilationArtifacts, Proof } from "zokrates-js";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProofInput {
  voterSecret: string;
  voterNid: string;
  merklePath: string[];
  merklePathIndices: string[];
  merkleRoot: string;
  nullifierHash: string;
  candidateIndex: string;
  maxCandidates: string;
}

export type ProofResult = Proof;

/* ------------------------------------------------------------------ */
/*  Cached artefacts                                                   */
/* ------------------------------------------------------------------ */

let compiledArtifacts: CompilationArtifacts | null = null;
let provingKey: Uint8Array | null = null;

/**
 * Pre-load circuit artefacts and proving key from /public/zk.
 * Call once (e.g. on page load) so proof generation is fast.
 */
export async function loadArtifacts(): Promise<void> {
  if (compiledArtifacts && provingKey) return;

  const [artifactsRes, pkRes] = await Promise.all([
    fetch(ARTIFACTS_FILE),
    fetch(PROVING_KEY_FILE),
  ]);

  if (!artifactsRes.ok) {
    throw new Error(
      `Failed to load circuit artifacts from ${ARTIFACTS_FILE}`
    );
  }
  if (!pkRes.ok) {
    throw new Error(
      `Failed to load proving key from ${PROVING_KEY_FILE}`
    );
  }

  // artifacts.json stores the program as a base64 string (JSON cannot hold raw bytes).
  // zokrates-js requires CompilationArtifacts.program to be a Uint8Array — decode it here.
  const raw = await artifactsRes.json();
  const programBytes = Uint8Array.from(atob(raw.program), (c) => c.charCodeAt(0));
  compiledArtifacts = { ...raw, program: programBytes };
  provingKey = new Uint8Array(await pkRes.arrayBuffer());
}

/* ------------------------------------------------------------------ */
/*  Proof generation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Generate a Groth16 proof for the given inputs.
 */
export async function generateProof(
  input: ProofInput
): Promise<ProofResult> {
  const zk = await getZoKratesProvider();

  if (!compiledArtifacts || !provingKey) {
    await loadArtifacts();
  }

  if (!compiledArtifacts || !provingKey) {
    throw new Error("ZoKrates artifacts not loaded.");
  }

  // Normalize all values to proper decimal field element strings.
  // ZoKrates expects decimal bigint strings — "0000" must become "0", hex must become decimal, etc.
  const toField = (v: string) => BigInt(v).toString();

  // Build the flat argument list expected by the compiled circuit.
  // Order must exactly match the circuit's main() parameter order:
  //   voterSecret, voterNid, merklePath[6], merklePathIndices[6],
  //   merkleRoot, nullifierHash, candidateIndex, maxCandidates
  // NOTE: field[N] arrays must be passed as nested JS arrays, NOT spread.
  const args = [
    toField(input.voterSecret),
    toField(input.voterNid),
    input.merklePath.map(toField),         // field[6] — array, not spread
    input.merklePathIndices.map(toField),  // field[6] — array, not spread
    toField(input.merkleRoot),
    toField(input.nullifierHash),
    toField(input.candidateIndex),
    toField(input.maxCandidates),
  ];

  console.log("[ZK] computeWitness args:", args);

  // Compute witness
  let witness: Uint8Array;
  try {
    const result = zk.computeWitness(compiledArtifacts, args);
    witness = result.witness;
    console.log("[ZK] Witness computed successfully");
  } catch (err) {
    console.error("[ZK] computeWitness failed:", err);
    throw new Error(`Witness computation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Generate proof
  console.log("[ZK] Generating Groth16 proof...");
  const proof = zk.generateProof(
    compiledArtifacts.program,
    witness,
    provingKey
  );
  console.log("[ZK] Proof generated:", proof.proof);

  return proof;
}
