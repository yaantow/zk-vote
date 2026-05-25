import { NextRequest, NextResponse } from "next/server";
import { generateMerkleProof, getMerkleRoot } from "@/lib/utils/merkle";
import { MERKLE_DEPTH } from "@/lib/utils/constants";
import {
  registeredCommitments,
  cachedTree,
  getCommitmentByNid,
  loadRegistryFromDisk,
  setCachedTree,
} from "@/lib/utils/registry";
import { buildMerkleTreeAsync } from "@/lib/utils/merkle-async";

/**
 * POST /api/register
 *
 * Voter lookup endpoint. Given a voter's NID, returns their Merkle proof
 * from the admin-registered tree. Does NOT modify the tree.
 *
 * The voter's secret pin is NEVER sent to the server — it stays client-side
 * and is only used in ZK proof generation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nid } = body;

    if (!nid) {
      return NextResponse.json(
        { error: "Missing nid" },
        { status: 400 }
      );
    }

    // If registry is empty (e.g. after server restart), load from disk
    if (registeredCommitments.length === 0) {
      loadRegistryFromDisk();
    }

    // Look up this voter's commitment from the admin-registered tree
    const commitment = getCommitmentByNid(nid.trim());
    if (!commitment) {
      return NextResponse.json(
        {
          error:
            "Your NID is not registered. Ask the election admin to include it, then re-run election setup.",
        },
        { status: 404 }
      );
    }

    // Use the cached tree if available, otherwise rebuild from stored commitments
    let tree = cachedTree;
    if (!tree) {
      tree = await buildMerkleTreeAsync(registeredCommitments, MERKLE_DEPTH);
      setCachedTree(tree);
    }

    const leafIndex = registeredCommitments.indexOf(commitment);
    const proof = generateMerkleProof(tree, leafIndex, MERKLE_DEPTH);
    const root = getMerkleRoot(tree);

    return NextResponse.json({
      success: true,
      commitment,
      merkleProof: proof.path,
      merklePathIndices: proof.indices,
      merkleRoot: root,
      leafIndex,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Lookup failed",
      },
      { status: 500 }
    );
  }
}
