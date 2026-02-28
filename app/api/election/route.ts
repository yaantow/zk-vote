import { NextResponse } from "next/server";
import { DEFAULT_CANDIDATES, CONTRACT_ADDRESS } from "@/lib/utils/constants";

/**
 * GET /api/election
 *
 * Returns current election metadata. In the prototype this uses defaults;
 * once the contract is deployed on Polygon Amoy, it will read from-chain.
 */
export async function GET() {
  try {
    // When contract is deployed, read live data:
    // const contract = getReadContract();
    // const title = await contract.electionTitle();
    // ...

    // Prototype defaults
    const data = {
      title: "Best Campus Facility",
      candidates: DEFAULT_CANDIDATES,
      merkleRoot: "0x0",
      isActive: true,
      contractAddress: CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
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
