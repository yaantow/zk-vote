import { NextRequest, NextResponse } from "next/server";
import { computeCommitment } from "@/lib/utils/hash";
import {
  buildMerkleTree,
  generateMerkleProof,
  getMerkleRoot,
} from "@/lib/utils/merkle";
import { MERKLE_DEPTH } from "@/lib/utils/constants";

/**
 * In-memory voter registry for the prototype.
 * In production this would be backed by the smart contract's Merkle root.
 */
const registeredCommitments: string[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nid, commitment } = body;

    if (!nid || !commitment) {
      return NextResponse.json(
        { error: "Missing nid or commitment" },
        { status: 400 }
      );
    }

    // Add commitment to the registry if not already present
    if (!registeredCommitments.includes(commitment)) {
      registeredCommitments.push(commitment);
    }

    // Build the Merkle tree with all registered commitments
    const tree = buildMerkleTree(registeredCommitments, MERKLE_DEPTH);
    const leafIndex = registeredCommitments.indexOf(commitment);
    const proof = generateMerkleProof(tree, leafIndex, MERKLE_DEPTH);
    const root = getMerkleRoot(tree);

    return NextResponse.json({
      success: true,
      merkleProof: proof.path,
      merklePathIndices: proof.indices,
      merkleRoot: root,
      leafIndex,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Registration failed",
      },
      { status: 500 }
    );
  }
}
