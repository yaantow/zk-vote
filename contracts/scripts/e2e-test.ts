/**
 * End-to-End Integration Test
 *
 * Simulates a complete election lifecycle on a local Hardhat node:
 * 1. Deploy Verifier + ZKVoting contracts
 * 2. Setup election with candidates
 * 3. Start election
 * 4. Simulate N voters casting votes (with mock proof — bypasses ZKP verification)
 * 5. Attempt double-voting (should revert)
 * 6. Attempt invalid candidate (should revert)
 * 7. End election
 * 8. Verify tallies match expected results
 * 9. Verify VoteCast events are emitted correctly
 * 10. Audit: recompute tallies from events and compare
 *
 * NOTE: Since the Verifier has a placeholder VK, real ZKP verification is bypassed.
 *       The `verifyTx` always returns true with the placeholder, allowing us to test
 *       the voting logic end-to-end. After trusted setup, this test can use real proofs.
 *
 * Run: cd contracts && npx hardhat run scripts/e2e-test.ts
 */

import hre from "hardhat";

interface VoteCastEvent {
  nullifierHash: bigint;
  candidateIndex: bigint;
  timestamp: bigint;
}

async function main() {
  const startTime = Date.now();

  console.log("\n╔══════════════════════════════════════════════╗");
  console.log("║  ZK-Vote Maldives — E2E Integration Test    ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const [admin, ...voters] = await hre.ethers.getSigners();
  const N = Math.min(voters.length, 10); // Use up to 10 voters

  console.log(`Admin: ${admin.address}`);
  console.log(`Voters available: ${voters.length}, using: ${N}\n`);

  // ═══════════════════════════════════════════════════════════════
  //  Step 1: Deploy contracts
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Step 1: Deploy contracts ━━━");

  // Use MockVerifier that always returns true (bypasses ZKP pairing checks)
  // Real Verifier requires trusted setup output — not yet available
  const VerifierFactory = await hre.ethers.getContractFactory("MockVerifier");
  const verifier = await VerifierFactory.deploy();
  await verifier.waitForDeployment();
  const verifierAddr = await verifier.getAddress();
  console.log(`  MockVerifier deployed: ${verifierAddr}`);

  const VotingFactory = await hre.ethers.getContractFactory("ZKVoting");
  const voting = await VotingFactory.deploy(verifierAddr);
  await voting.waitForDeployment();
  const votingAddr = await voting.getAddress();
  console.log(`  ZKVoting deployed: ${votingAddr}`);

  // Verify admin
  const contractAdmin = await voting.admin();
  assert(contractAdmin === admin.address, "Admin mismatch");
  console.log("  ✅ Admin verified\n");

  // ═══════════════════════════════════════════════════════════════
  //  Step 2: Setup election
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Step 2: Setup election ━━━");

  const candidates = ["Library", "Lab", "Gym", "Cafeteria"];
  const merkleRoot = 12345678n; // Placeholder root for testing

  await voting.setupElection(
    "Best Campus Facility — E2E Test",
    candidates,
    merkleRoot
  );

  const title = await voting.electionTitle();
  const count = await voting.getCandidateCount();
  console.log(`  Title: ${title}`);
  console.log(`  Candidates: ${count}`);
  for (let i = 0; i < Number(count); i++) {
    console.log(`    [${i}] ${await voting.getCandidateName(i)}`);
  }
  assert(Number(count) === candidates.length, "Candidate count mismatch");
  console.log("  ✅ Election setup verified\n");

  // ═══════════════════════════════════════════════════════════════
  //  Step 3: Start election
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Step 3: Start election ━━━");

  const startTx = await voting.startElection();
  const startReceipt = await startTx.wait();
  console.log(`  Tx: ${startReceipt?.hash}`);

  const isActive = await voting.electionActive();
  assert(isActive === true, "Election should be active");
  console.log("  ✅ Election started\n");

  // ═══════════════════════════════════════════════════════════════
  //  Step 4: Cast votes
  // ═══════════════════════════════════════════════════════════════
  console.log(`━━━ Step 4: Cast ${N} votes ━━━`);

  // Track expected tallies
  const expectedTallies = [0, 0, 0, 0];
  const usedNullifiers: bigint[] = [];

  // Mock proof (placeholder verifier always returns true)
  const mockProof = {
    a: { X: 1n, Y: 2n },
    b: { X: [1n, 2n], Y: [3n, 4n] },
    c: { X: 1n, Y: 2n },
  };

  for (let i = 0; i < N; i++) {
    const voter = voters[i];
    const candidateIdx = i % candidates.length; // Distribute votes evenly
    const nullifier = BigInt(1000 + i); // Unique nullifier per voter

    const publicInputs: [bigint, bigint, bigint, bigint, bigint] = [
      merkleRoot,
      nullifier,
      BigInt(candidateIdx),
      BigInt(candidates.length),
      1n,
    ];

    const voterContract = voting.connect(voter);
    const tx = await voterContract.castVote(mockProof, publicInputs);
    await tx.wait();

    expectedTallies[candidateIdx]++;
    usedNullifiers.push(nullifier);

    console.log(
      `  Voter ${i + 1}/${N} → ${candidates[candidateIdx]} (nullifier: ${nullifier})`
    );
  }

  // Verify tallies
  for (let i = 0; i < candidates.length; i++) {
    const tally = await voting.getCandidateTally(i);
    assert(
      Number(tally) === expectedTallies[i],
      `Tally mismatch for ${candidates[i]}: expected ${expectedTallies[i]}, got ${tally}`
    );
  }

  const totalVotes = await voting.totalVotes();
  assert(Number(totalVotes) === N, `Total votes mismatch: expected ${N}, got ${totalVotes}`);
  console.log(`  Total votes: ${totalVotes}`);
  console.log("  ✅ All votes cast and tallies verified\n");

  // ═══════════════════════════════════════════════════════════════
  //  Step 5: Test double-voting prevention
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Step 5: Test double-voting prevention ━━━");

  const doubleVoter = voters[0];
  const doubleNullifier = usedNullifiers[0]; // Same nullifier as voter 0

  try {
    const dvContract = voting.connect(doubleVoter);
    await dvContract.castVote(mockProof, [
      merkleRoot,
      doubleNullifier,
      0n,
      BigInt(candidates.length),
      1n,
    ]);
    console.log("  ❌ FAIL: Double vote should have reverted!");
    process.exit(1);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    assert(message.includes("Already voted"), `Unexpected error: ${message}`);
    console.log("  ✅ Double vote correctly rejected\n");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Step 6: Test invalid candidate index
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Step 6: Test invalid candidate index ━━━");

  try {
    const badVoter = voters[N]; // A new voter who hasn't voted
    const badContract = voting.connect(badVoter);
    await badContract.castVote(mockProof, [
      merkleRoot,
      BigInt(9999), // Fresh nullifier
      BigInt(99), // Invalid candidate index
      BigInt(candidates.length),
      1n,
    ]);
    console.log("  ❌ FAIL: Invalid candidate should have reverted!");
    process.exit(1);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    assert(
      message.includes("Invalid candidate"),
      `Unexpected error: ${message}`
    );
    console.log("  ✅ Invalid candidate correctly rejected\n");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Step 7: End election
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Step 7: End election ━━━");

  const endTx = await voting.endElection();
  await endTx.wait();

  const isActiveAfterEnd = await voting.electionActive();
  assert(isActiveAfterEnd === false, "Election should be ended");
  console.log("  ✅ Election ended\n");

  // Verify voting after election ends is rejected
  try {
    const lateVoter = voters[N];
    const lateContract = voting.connect(lateVoter);
    await lateContract.castVote(mockProof, [
      merkleRoot,
      BigInt(8888),
      0n,
      BigInt(candidates.length),
      1n,
    ]);
    console.log("  ❌ FAIL: Late vote should have reverted!");
    process.exit(1);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    assert(
      message.includes("Election not active"),
      `Unexpected error: ${message}`
    );
    console.log("  ✅ Late vote correctly rejected\n");
  }

  // ═══════════════════════════════════════════════════════════════
  //  Step 8: Audit — recompute tallies from events
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Step 8: Audit — verify tallies from events ━━━");

  const filter = voting.filters.VoteCast();
  const events = await voting.queryFilter(filter);

  console.log(`  Found ${events.length} VoteCast events`);
  assert(events.length === N, `Event count mismatch: expected ${N}, got ${events.length}`);

  // Recompute tallies from events
  const recomputedTallies = [0, 0, 0, 0];
  const seenNullifiers = new Set<string>();

  for (const event of events) {
    const parsed = voting.interface.parseLog({
      topics: event.topics as string[],
      data: event.data,
    });
    if (!parsed) continue;

    const nullifierHash = parsed.args[0] as bigint;
    const candidateIndex = Number(parsed.args[1]);

    // Check for duplicate nullifiers in events
    const nullKey = nullifierHash.toString();
    assert(
      !seenNullifiers.has(nullKey),
      `Duplicate nullifier in events: ${nullKey}`
    );
    seenNullifiers.add(nullKey);

    if (candidateIndex >= 0 && candidateIndex < candidates.length) {
      recomputedTallies[candidateIndex]++;
    }
  }

  // Compare recomputed vs on-chain
  let allMatch = true;
  console.log("\n  Tally Comparison:");
  console.log("  " + "─".repeat(50));
  console.log(
    `  ${"Candidate".padEnd(15)} ${"On-Chain".padStart(10)} ${"Recomputed".padStart(12)} ${"Match".padStart(7)}`
  );
  console.log("  " + "─".repeat(50));

  for (let i = 0; i < candidates.length; i++) {
    const onChain = Number(await voting.getCandidateTally(i));
    const recomputed = recomputedTallies[i];
    const match = onChain === recomputed;
    if (!match) allMatch = false;

    console.log(
      `  ${candidates[i].padEnd(15)} ${String(onChain).padStart(10)} ${String(recomputed).padStart(12)} ${match ? "  ✅" : "  ❌"}`
    );
  }
  console.log("  " + "─".repeat(50));

  const finalTotal = Number(await voting.totalVotes());
  const eventsTotal = recomputedTallies.reduce((a, b) => a + b, 0);
  console.log(
    `  ${"TOTAL".padEnd(15)} ${String(finalTotal).padStart(10)} ${String(eventsTotal).padStart(12)} ${finalTotal === eventsTotal ? "  ✅" : "  ❌"}`
  );

  assert(allMatch, "Tally mismatch detected!");
  assert(finalTotal === eventsTotal, "Total vote count mismatch!");
  console.log("\n  ✅ AUDIT PASSED — All tallies match!\n");

  // ═══════════════════════════════════════════════════════════════
  //  Summary
  // ═══════════════════════════════════════════════════════════════
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║          E2E TEST RESULTS SUMMARY           ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  Contracts deployed:          ✅              ║`);
  console.log(`║  Election setup:              ✅              ║`);
  console.log(`║  Election started:            ✅              ║`);
  console.log(`║  ${String(N).padStart(2)} votes cast successfully:  ✅              ║`);
  console.log(`║  Double-vote rejected:        ✅              ║`);
  console.log(`║  Invalid candidate rejected:  ✅              ║`);
  console.log(`║  Election ended:              ✅              ║`);
  console.log(`║  Late vote rejected:          ✅              ║`);
  console.log(`║  Audit tallies match:         ✅              ║`);
  console.log(`║  No duplicate nullifiers:     ✅              ║`);
  console.log("╠══════════════════════════════════════════════╣");
  console.log(`║  All checks passed in ${elapsed}s              ║`);
  console.log("╚══════════════════════════════════════════════╝\n");
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`\n  ❌ ASSERTION FAILED: ${message}\n`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ E2E Test Failed:", error);
  process.exit(1);
});
