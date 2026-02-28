"use client";

import { create } from "zustand";

export type ProofStatus =
  | "idle"
  | "initializing"
  | "computing"
  | "proving"
  | "submitting"
  | "done"
  | "error";

export interface ProofState {
  selectedCandidate: number | null;
  proofStatus: ProofStatus;
  proof: unknown | null;
  txHash: string | null;
  error: string | null;

  setCandidate: (index: number) => void;
  setStatus: (status: ProofStatus) => void;
  setProof: (proof: unknown) => void;
  setTxHash: (hash: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

const initialState = {
  selectedCandidate: null,
  proofStatus: "idle" as ProofStatus,
  proof: null,
  txHash: null,
  error: null,
};

export const useProofStore = create<ProofState>()((set) => ({
  ...initialState,
  setCandidate: (index) => set({ selectedCandidate: index }),
  setStatus: (status) => set({ proofStatus: status }),
  setProof: (proof) => set({ proof }),
  setTxHash: (hash) => set({ txHash: hash }),
  setError: (error) => set({ error, proofStatus: "error" }),
  reset: () => set(initialState),
}));
