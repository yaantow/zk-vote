"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface VoterState {
  isAuthenticated: boolean;
  nid: string | null;
  secret: string | null;
  commitment: string | null;
  merkleProof: string[] | null;
  merklePathIndices: number[] | null;
  walletAddress: string | null;

  setVoter: (data: Partial<VoterState>) => void;
  reset: () => void;
}

const initialState = {
  isAuthenticated: false,
  nid: null,
  secret: null,
  commitment: null,
  merkleProof: null,
  merklePathIndices: null,
  walletAddress: null,
};

export const useVoterStore = create<VoterState>()(
  persist(
    (set) => ({
      ...initialState,
      setVoter: (data) =>
        set((state) => ({ ...state, ...data })),
      reset: () => set(initialState),
    }),
    {
      name: "zk-vote-voter",
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        nid: state.nid,
        secret: state.secret,
        commitment: state.commitment,
        merkleProof: state.merkleProof,
        merklePathIndices: state.merklePathIndices,
        walletAddress: state.walletAddress,
      }),
    }
  )
);
