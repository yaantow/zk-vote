import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "POL");

  // 1. Deploy Verifier
  console.log("\n--- Deploying Verifier ---");
  const Verifier = await ethers.getContractFactory("Verifier");
  const verifier = await Verifier.deploy();
  await verifier.waitForDeployment();
  const verifierAddress = await verifier.getAddress();
  console.log("Verifier deployed to:", verifierAddress);

  // 2. Deploy ZKVoting with Verifier address
  console.log("\n--- Deploying ZKVoting ---");
  const ZKVoting = await ethers.getContractFactory("ZKVoting");
  const zkVoting = await ZKVoting.deploy(verifierAddress);
  await zkVoting.waitForDeployment();
  const zkVotingAddress = await zkVoting.getAddress();
  console.log("ZKVoting deployed to:", zkVotingAddress);

  // Summary
  console.log("\n========================================");
  console.log("Deployment complete!");
  console.log("========================================");
  console.log("Verifier:", verifierAddress);
  console.log("ZKVoting:", zkVotingAddress);
  console.log("\nUpdate your .env files:");
  console.log(`  NEXT_PUBLIC_CONTRACT_ADDRESS=${zkVotingAddress}`);
  console.log(`  VERIFIER_ADDRESS=${verifierAddress}`);
  console.log(`  ZK_VOTING_ADDRESS=${zkVotingAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
