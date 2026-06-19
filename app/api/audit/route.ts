import { NextResponse } from "next/server";
import { DEFAULT_CANDIDATES, CONTRACT_ADDRESS } from "@/lib/utils/constants";
import { getAllCandidates } from "@/lib/blockchain/voting-contract";

export async function GET() {
  try {
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS.length === 42) {
      try {
        const candidates = await getAllCandidates();
        return NextResponse.json({
          onChainTally: candidates.map((c) => c.tally),
          candidateNames: candidates.map((c) => c.name),
        });
      } catch (err) {
        console.warn("[/api/audit] Contract call failed, using defaults:", err);
      }
    }

    return NextResponse.json({
      onChainTally: Array(DEFAULT_CANDIDATES.length).fill(0),
      candidateNames: DEFAULT_CANDIDATES,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch audit data" },
      { status: 500 }
    );
  }
}
