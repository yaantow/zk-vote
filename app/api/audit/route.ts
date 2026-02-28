import { NextResponse } from "next/server";
import { DEFAULT_CANDIDATES } from "@/lib/utils/constants";

/**
 * GET /api/audit
 *
 * Returns all VoteCast events and a tally comparison.
 * In the prototype this returns empty data; once the contract is
 * deployed, it will read events from the blockchain.
 */
export async function GET() {
  try {
    // When contract is deployed:
    // const events = await getVoteCastEvents();
    // const recomputed = recomputeTallyFromEvents(events, candidateCount);
    // const onChain = await Promise.all(candidates.map((_, i) => getCandidateTally(i)));

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
