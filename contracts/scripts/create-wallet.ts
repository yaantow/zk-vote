import { ethers } from "ethers";

async function main() {
  console.log("Generating a new random wallet...\n");
  
  const wallet = ethers.Wallet.createRandom();
  
  console.log("Wallet Address:", wallet.address);
  console.log("Private Key:", wallet.privateKey);
  console.log("\n⚠️  IMPORTANT:");
  console.log("1. Save this Private Key securely.");
  console.log("2. Copy the Private Key into your contracts/.env and root .env.local files.");
  console.log("3. Send testnet POL tokens to the Wallet Address using the Polygon Faucet before deploying.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
