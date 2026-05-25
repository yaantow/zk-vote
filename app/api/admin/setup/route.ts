import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import ZKVotingABI from "@/lib/blockchain/abi/ZKVoting.json";
import { computeCommitmentAsync } from "@/lib/utils/hash";
import { buildMerkleTreeAsync } from "@/lib/utils/merkle-async";
import { getMerkleRoot } from "@/lib/utils/merkle";
import { MERKLE_DEPTH } from "@/lib/utils/constants";
import {
  registeredCommitments,
  registerVoter,
  resetRegistry,
  setCachedTree,
  saveRegistryToDisk,
} from "@/lib/utils/registry";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, candidates, voterNids, password } = body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!title || !candidates || !Array.isArray(candidates) || candidates.length < 2) {
      return NextResponse.json(
        { error: "Missing title or need at least 2 candidates" },
        { status: 400 }
      );
    }

    // Reset registry and rebuild from the provided NIDs
    resetRegistry();

    const nids: string[] = (voterNids || []).map((n: string) => n.trim()).filter(Boolean);
    for (const nid of nids) {
      // Commitment uses secret "0000" → BigInt("0000") = 0 in the circuit
      const commitment = await computeCommitmentAsync(nid, "0000");
      registerVoter(nid, commitment);
    }

    // Build the Merkle tree from commitments (or a placeholder leaf if no voters)
    const leaves = registeredCommitments.length > 0
      ? registeredCommitments
      : ["0x0000000000000000000000000000000000000000000000000000000000000001"];

    const tree = await buildMerkleTreeAsync(leaves, MERKLE_DEPTH);
    setCachedTree(tree);
    const merkleRoot = getMerkleRoot(tree);

    // Persist registry to disk so it survives server restarts
    saveRegistryToDisk();

    // Submit to blockchain
    const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || "http://127.0.0.1:8545";
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const privateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!contractAddress || !privateKey) {
      return NextResponse.json(
        { error: "Server misconfiguration: missing contract address or private key" },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, ZKVotingABI.abi, wallet);

    console.log(`[admin/setup] merkleRoot: ${merkleRoot}`);
    console.log(`[admin/setup] Registered ${nids.length} voters`);

    const tx = await contract.setupElection(title, candidates, BigInt(merkleRoot));
    const receipt = await tx.wait();

    return NextResponse.json({
      success: true,
      txHash: receipt.hash,
      merkleRoot,
      voterCount: nids.length,
    });
  } catch (error: any) {
    console.error("[admin/setup] Failed:", error);
    return NextResponse.json(
      { error: error.reason || error.message || "Setup failed" },
      { status: 400 }
    );
  }
}
