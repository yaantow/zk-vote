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

  compiledArtifacts = await artifactsRes.json();
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

  // Build the flat argument list expected by the compiled circuit
  const args: string[] = [
    input.voterSecret,
    input.voterNid,
    ...input.merklePath,
    ...input.merklePathIndices,
    input.merkleRoot,
    input.nullifierHash,
    input.candidateIndex,
    input.maxCandidates,
  ];

  // Compute witness
  const { witness } = zk.computeWitness(compiledArtifacts, args);

  // Generate proof
  const proof = zk.generateProof(
    compiledArtifacts.program,
    witness,
    provingKey
  );

  return proof;
}
