import { ethers } from "hardhat";

/**
 * Setup script — call after deploying contracts.
 *
 * Sets up a demo election with default candidates and a mock Merkle root.
 * In production, the Merkle root would come from the actual voter registry.
 */
async function main() {
  const zkVotingAddress = process.env.ZK_VOTING_ADDRESS;
  if (!zkVotingAddress) {
    throw new Error("ZK_VOTING_ADDRESS not set in environment");
  }

  const [admin] = await ethers.getSigners();
  console.log("Setting up election with admin:", admin.address);

  const ZKVoting = await ethers.getContractFactory("ZKVoting");
  const zkVoting = ZKVoting.attach(zkVotingAddress);

  // Setup election
  const title = "Best Campus Facility";
  const candidates = ["Library", "Lab", "Gym", "Cafeteria"];

  // Placeholder Merkle root — replace with actual root from voter registration
  const merkleRoot = BigInt(
    "0x0000000000000000000000000000000000000000000000000000000000000001"
  );

  console.log("\n--- Setting up election ---");
  console.log("Title:", title);
  console.log("Candidates:", candidates.join(", "));

  const setupTx = await zkVoting.setupElection(title, candidates, merkleRoot);
  await setupTx.wait();
  console.log("Election setup complete!");

  // Start election
  console.log("\n--- Starting election ---");
  const startTx = await zkVoting.startElection();
  await startTx.wait();
  console.log("Election started!");

  // Verify
  const activeTitle = await zkVoting.electionTitle();
  const isActive = await zkVoting.electionActive();
  const count = await zkVoting.getCandidateCount();
  console.log("\n========================================");
  console.log("Election verified:");
  console.log("  Title:", activeTitle);
  console.log("  Active:", isActive);
  console.log("  Candidates:", Number(count));
  console.log("========================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
