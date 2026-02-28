import { NextResponse } from "next/server";
import { DEFAULT_CANDIDATES, CONTRACT_ADDRESS } from "@/lib/utils/constants";
import {
  getElectionTitle,
  isElectionActive,
  getMerkleRoot,
  getAllCandidates,
  getTotalVotes,
} from "@/lib/blockchain/voting-contract";

/**
 * GET /api/election
 *
 * Returns current election metadata.
 * - If a contract is deployed (CONTRACT_ADDRESS is set), reads live on-chain data.
 * - Otherwise, returns prototype defaults for UI development.
 */
export async function GET() {
  try {
    // If contract is deployed, read live data from chain
    if (CONTRACT_ADDRESS && CONTRACT_ADDRESS.length === 42) {
      try {
        const [title, active, root, candidates, totalVotes] =
          await Promise.all([
            getElectionTitle(),
            isElectionActive(),
            getMerkleRoot(),
            getAllCandidates(),
            getTotalVotes(),
          ]);

        return NextResponse.json({
          title,
          candidates: candidates.map((c) => c.name),
          merkleRoot: root.toString(),
          isActive: active,
          contractAddress: CONTRACT_ADDRESS,
          totalVotes,
          tallies: candidates.map((c) => c.tally),
        });
      } catch {
        // Contract call failed — fall through to defaults
        console.warn(
          "[/api/election] Contract call failed, using defaults"
        );
      }
    }

    // Prototype defaults
    const data = {
      title: "Best Campus Facility",
      candidates: DEFAULT_CANDIDATES,
      merkleRoot: "0x0",
      isActive: true,
      contractAddress:
        CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
      totalVotes: 0,
      tallies: DEFAULT_CANDIDATES.map(() => 0),
    };

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to fetch election data",
      },
      { status: 500 }
    );
  }
}
