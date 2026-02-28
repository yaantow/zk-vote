"use client";

import { create } from "zustand";

export interface ElectionState {
  title: string;
  candidates: string[];
  merkleRoot: string;
  isActive: boolean;
  contractAddress: string;
  totalVotes: number;
  tallies: number[];

  setElection: (data: Partial<ElectionState>) => void;
  reset: () => void;
}

const initialState: Omit<ElectionState, "setElection" | "reset"> = {
  title: "",
  candidates: [],
  merkleRoot: "",
  isActive: false,
  contractAddress: "",
  totalVotes: 0,
  tallies: [],
};

export const useElectionStore = create<ElectionState>()((set) => ({
  ...initialState,
  setElection: (data) =>
    set((state) => ({ ...state, ...data })),
  reset: () => set(initialState),
}));
