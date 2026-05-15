import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import ZKVotingABI from "@/lib/blockchain/abi/ZKVoting.json";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { proof, inputs } = body;

    if (!proof || !inputs) {
      return NextResponse.json(
        { error: "Missing proof or inputs" },
        { status: 400 }
      );
    }

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

    const proofStruct = {
      a: { X: proof.a[0], Y: proof.a[1] },
      b: { X: proof.b[0], Y: proof.b[1] },
      c: { X: proof.c[0], Y: proof.c[1] },
    };

    console.log("Submitting vote transaction...");
    const tx = await contract.castVote(proofStruct, inputs);
    console.log("Transaction hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt.hash);

    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (error: any) {
    console.error("Relayer vote submission failed:", error);
    
    // Extract revert reason if available
    let errorMessage = "Transaction failed";
    if (error.reason) {
      errorMessage = error.reason;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
