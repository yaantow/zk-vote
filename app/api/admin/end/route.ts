import { NextResponse } from "next/server";
import { JsonRpcProvider, Wallet, Contract } from "ethers";
import ZKVotingABI from "@/lib/blockchain/abi/ZKVoting.json";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = body;

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || "http://127.0.0.1:8545";
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
    const privateKey = process.env.ADMIN_PRIVATE_KEY;

    if (!contractAddress || !privateKey) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 }
      );
    }

    const provider = new JsonRpcProvider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);
    const contract = new Contract(contractAddress, ZKVotingABI.abi, wallet);

    console.log("Ending election...");
    const tx = await contract.endElection();
    const receipt = await tx.wait();
    
    return NextResponse.json({ success: true, txHash: receipt.hash });
  } catch (error: any) {
    console.error("Admin end failed:", error);
    return NextResponse.json(
      { error: error.reason || error.message || "End failed" },
      { status: 400 }
    );
  }
}
