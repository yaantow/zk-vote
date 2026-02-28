/**
 * Typed contract helpers for interacting with the ZKVoting smart contract.
 */

import { Contract, type ContractTransactionResponse } from "ethers";
import { getReadProvider, connectWallet } from "./provider";
import { contractConfig } from "./config";
import ZKVotingABI from "./abi/ZKVoting.json";

/* ------------------------------------------------------------------ */
/*  Read-only contract                                                 */
/* ------------------------------------------------------------------ */

/**
 * Get a read-only contract instance (no wallet needed).
 */
export function getReadContract(): Contract {
  const provider = getReadProvider();
  return new Contract(contractConfig.address, ZKVotingABI.abi, provider);
}

/* ------------------------------------------------------------------ */
/*  Write contract (requires wallet)                                   */
/* ------------------------------------------------------------------ */

/**
 * Get a writable contract instance connected to the user's wallet.
 */
export async function getWriteContract(): Promise<Contract> {
  const { signer } = await connectWallet();
  return new Contract(contractConfig.address, ZKVotingABI.abi, signer);
}

/* ------------------------------------------------------------------ */
/*  Read helpers                                                       */
/* ------------------------------------------------------------------ */

export async function getElectionTitle(): Promise<string> {
  const contract = getReadContract();
  return contract.electionTitle();
}

export async function isElectionActive(): Promise<boolean> {
  const contract = getReadContract();
  return contract.electionActive();
}

export async function getMerkleRoot(): Promise<bigint> {
  const contract = getReadContract();
  return contract.merkleRoot();
}

export async function getCandidateCount(): Promise<number> {
  const contract = getReadContract();
  const count = await contract.getCandidateCount();
  return Number(count);
}

export async function getCandidateName(index: number): Promise<string> {
  const contract = getReadContract();
  return contract.getCandidateName(index);
}

export async function getCandidateTally(index: number): Promise<number> {
  const contract = getReadContract();
  const tally = await contract.getCandidateTally(index);
  return Number(tally);
}

export async function getTotalVotes(): Promise<number> {
  const contract = getReadContract();
  const total = await contract.totalVotes();
  return Number(total);
}

export async function isNullifierUsed(nullifier: bigint): Promise<boolean> {
  const contract = getReadContract();
  return contract.nullifierUsed(nullifier);
}

/**
 * Fetch all candidates with their names and tallies.
 */
export async function getAllCandidates(): Promise<
  { name: string; tally: number }[]
> {
  const count = await getCandidateCount();
  const results: { name: string; tally: number }[] = [];

  for (let i = 0; i < count; i++) {
    const [name, tally] = await Promise.all([
      getCandidateName(i),
      getCandidateTally(i),
    ]);
    results.push({ name, tally });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Write helpers                                                      */
/* ------------------------------------------------------------------ */

export interface ZKProof {
  a: [string, string];
  b: [[string, string], [string, string]];
  c: [string, string];
}

/**
 * Cast a vote by submitting a ZK proof on-chain.
 */
export async function castVote(
  proof: ZKProof,
  publicInputs: [string, string, string, string, string]
): Promise<ContractTransactionResponse> {
  const contract = await getWriteContract();

  const proofStruct = {
    a: { X: proof.a[0], Y: proof.a[1] },
    b: { X: proof.b[0], Y: proof.b[1] },
    c: { X: proof.c[0], Y: proof.c[1] },
  };

  return contract.castVote(proofStruct, publicInputs);
}

/**
 * Setup an election (admin only).
 */
export async function setupElection(
  title: string,
  candidates: string[],
  merkleRoot: bigint
): Promise<ContractTransactionResponse> {
  const contract = await getWriteContract();
  return contract.setupElection(title, candidates, merkleRoot);
}

/**
 * Start the election (admin only).
 */
export async function startElection(): Promise<ContractTransactionResponse> {
  const contract = await getWriteContract();
  return contract.startElection();
}

/**
 * End the election (admin only).
 */
export async function endElection(): Promise<ContractTransactionResponse> {
  const contract = await getWriteContract();
  return contract.endElection();
}

/* ------------------------------------------------------------------ */
/*  Event helpers                                                      */
/* ------------------------------------------------------------------ */

export interface VoteCastEvent {
  nullifierHash: string;
  candidateIndex: number;
  timestamp: number;
  blockNumber: number;
  transactionHash: string;
}

/**
 * Query all VoteCast events from the contract.
 */
export async function getVoteCastEvents(): Promise<VoteCastEvent[]> {
  const contract = getReadContract();
  const filter = contract.filters.VoteCast();
  const events = await contract.queryFilter(filter);

  return events.map((e) => {
    const parsed = contract.interface.parseLog({
      topics: e.topics as string[],
      data: e.data,
    });
    return {
      nullifierHash: parsed?.args[0]?.toString() ?? "",
      candidateIndex: Number(parsed?.args[1] ?? 0),
      timestamp: Number(parsed?.args[2] ?? 0),
      blockNumber: e.blockNumber,
      transactionHash: e.transactionHash,
    };
  });
}
