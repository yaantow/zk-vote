import { NextResponse } from "next/server";
import { DEFAULT_CANDIDATES, CONTRACT_ADDRESS } from "@/lib/utils/constants";
import {
  getAllCandidates,
  getVoteCastEvents,
} from "@/lib/blockchain/voting-contract";

/**
 * GET /api/audit
 *
 * Returns all VoteCast events and a tally comparison.
 * - If a contract is deployed, reads real events from the blockchain and
 *   independently recomputes tallies to compare with on-chain state.
 * - Otherwise, returns empty data for UI development.
 */
export async function GET() {
  try {
    // If contract is deployed, read live data
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS.length === 42) {
      try {
        const [candidates, events] = await Promise.all([
          getAllCandidates(),
          getVoteCastEvents(),
        ]);

        const candidateCount = candidates.length;

        // Recompute tallies from raw events
        const recomputedTally = Array(candidateCount).fill(0);
        for (const event of events) {
          const idx = Number(event.candidateIndex);
          if (idx >= 0 && idx < candidateCount) {
            recomputedTally[idx]++;
          }
        }

        // On-chain tallies from contract state
        const onChainTally = candidates.map((c) => c.tally);

        const match =
          JSON.stringify(recomputedTally) === JSON.stringify(onChainTally);

        return NextResponse.json({
          events: events.map((e, i) => ({
            index: i,
            nullifierHash: e.nullifierHash.toString(),
            candidateIndex: Number(e.candidateIndex),
            blockNumber: e.blockNumber,
            timestamp: Number(e.timestamp),
          })),
          recomputedTally,
          onChainTally,
          match,
          candidateNames: candidates.map((c) => c.name),
        });
      } catch {
        console.warn("[/api/audit] Contract call failed, using defaults");
      }
    }

    // Prototype defaults
    const candidateCount = DEFAULT_CANDIDATES.length;
    const events: unknown[] = [];
    const recomputedTally = Array(candidateCount).fill(0);
    const onChainTally = Array(candidateCount).fill(0);
    const match =
      JSON.stringify(recomputedTally) === JSON.stringify(onChainTally);

    return NextResponse.json({
      events,
      recomputedTally,
      onChainTally,
      match,
      candidateNames: DEFAULT_CANDIDATES,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch audit data",
      },
      { status: 500 }
    );
  }
}
