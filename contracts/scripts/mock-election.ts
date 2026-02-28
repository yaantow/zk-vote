/**
 * Mock Election Simulator — N=50 participants
 *
 * Simulates a realistic election with:
 * - 50 voters casting votes across 4 candidates
 * - 5 double-vote attempts (should all be rejected)
 * - Performance metrics collection (gas usage, timing)
 * - Final audit: recompute tallies from events
 *
 * Uses MockVerifier to bypass ZKP pairing checks.
 *
 * Run: cd contracts && npx hardhat run scripts/mock-election.ts
 */

import hre from "hardhat";

interface PerformanceMetrics {
  deploymentGas: bigint;
  setupGas: bigint;
  startGas: bigint;
  voteGasTotal: bigint;
  voteGasMin: bigint;
  voteGasMax: bigint;
  voteGasAvg: bigint;
  endGas: bigint;
  totalTime: number;
  votingTime: number;
  avgVoteTime: number;
}

async function main() {
  const startTime = Date.now();

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  ZK-Vote Maldives — Mock Election (N=50)        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const signers = await hre.ethers.getSigners();
  const admin = signers[0];
  // Hardhat default gives 20 signers. We'll reuse addresses for 50 voters.
  // Each voter gets a unique nullifier, so the contract sees them as distinct.

  const N = 50;
  const DOUBLE_VOTE_ATTEMPTS = 5;
  const candidates = ["Ibrahim Mohamed Solih", "Mohamed Muizzu", "Ilyas Labeeb", "Qasim Ibrahim"];

  console.log(`  Admin: ${admin.address}`);
  console.log(`  Signers available: ${signers.length}`);
  console.log(`  Voters to simulate: ${N}`);
  console.log(`  Double-vote attempts: ${DOUBLE_VOTE_ATTEMPTS}\n`);

  // ═══════════════════════════════════════════════════════════════
  //  Deploy
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Phase 1: Deploy ━━━");

  const MockVerifierFactory = await hre.ethers.getContractFactory("MockVerifier");
  const verifier = await MockVerifierFactory.deploy();
  const deployVerifierTx = verifier.deploymentTransaction();
  await verifier.waitForDeployment();
  const verifierReceipt = deployVerifierTx ? await deployVerifierTx.wait() : null;
  const verifierGas = verifierReceipt?.gasUsed ?? 0n;

  const VotingFactory = await hre.ethers.getContractFactory("ZKVoting");
  const voting = await VotingFactory.deploy(await verifier.getAddress());
  const deployVotingTx = voting.deploymentTransaction();
  await voting.waitForDeployment();
  const votingReceipt = deployVotingTx ? await deployVotingTx.wait() : null;
  const votingGas = votingReceipt?.gasUsed ?? 0n;
  const deploymentGas = verifierGas + votingGas;

  console.log(`  Verifier gas: ${verifierGas}`);
  console.log(`  ZKVoting gas: ${votingGas}`);
  console.log(`  Total deployment gas: ${deploymentGas}\n`);

  // ═══════════════════════════════════════════════════════════════
  //  Setup election
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Phase 2: Setup Election ━━━");

  const merkleRoot = 9999999n;
  const setupTx = await voting.setupElection(
    "Mock Election — N=50 Test",
    candidates,
    merkleRoot
  );
  const setupReceipt = await setupTx.wait();
  const setupGas = setupReceipt?.gasUsed ?? 0n;
  console.log(`  Setup gas: ${setupGas}`);

  const startTx = await voting.startElection();
  const startReceipt = await startTx.wait();
  const startGas = startReceipt?.gasUsed ?? 0n;
  console.log(`  Start gas: ${startGas}\n`);

  // ═══════════════════════════════════════════════════════════════
  //  Cast 50 votes
  // ═══════════════════════════════════════════════════════════════
  console.log(`━━━ Phase 3: Cast ${N} votes ━━━`);

  const mockProof = {
    a: { X: 1n, Y: 2n },
    b: { X: [1n, 2n], Y: [3n, 4n] },
    c: { X: 1n, Y: 2n },
  };

  const expectedTallies = new Array(candidates.length).fill(0);
  const voteGasUsages: bigint[] = [];
  const voteTimes: number[] = [];

  // Random vote distribution (weighted toward Library and Lab)
  const weights = [35, 30, 20, 15]; // percentage weights
  function getRandomCandidate(): number {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (rand < cumulative) return i;
    }
    return candidates.length - 1;
  }

  const votingStartTime = Date.now();

  for (let i = 0; i < N; i++) {
    const signer = signers[i % signers.length]; // Reuse signers with unique nullifiers
    const candidateIdx = getRandomCandidate();
    const nullifier = BigInt(2000 + i);

    const publicInputs: [bigint, bigint, bigint, bigint, bigint] = [
      merkleRoot,
      nullifier,
      BigInt(candidateIdx),
      BigInt(candidates.length),
      1n,
    ];

    const voteStart = Date.now();
    const voterContract = voting.connect(signer);
    const tx = await voterContract.castVote(mockProof, publicInputs);
    const receipt = await tx.wait();
    const voteTime = Date.now() - voteStart;

    const gasUsed = receipt?.gasUsed ?? 0n;
    voteGasUsages.push(gasUsed);
    voteTimes.push(voteTime);
    expectedTallies[candidateIdx]++;

    if ((i + 1) % 10 === 0) {
      console.log(`  ${i + 1}/${N} votes cast...`);
    }
  }

  const votingEndTime = Date.now();
  const votingTime = votingEndTime - votingStartTime;

  console.log(`  All ${N} votes cast in ${votingTime}ms\n`);

  // ═══════════════════════════════════════════════════════════════
  //  Double-vote attempts
  // ═══════════════════════════════════════════════════════════════
  console.log(`━━━ Phase 4: Double-vote attempts (${DOUBLE_VOTE_ATTEMPTS}) ━━━`);

  let doubleVoteRejections = 0;

  for (let i = 0; i < DOUBLE_VOTE_ATTEMPTS; i++) {
    const signer = signers[i % signers.length];
    const reusedNullifier = BigInt(2000 + i); // Same nullifier as voter i

    try {
      const voterContract = voting.connect(signer);
      await voterContract.castVote(mockProof, [
        merkleRoot,
        reusedNullifier,
        0n,
        BigInt(candidates.length),
        1n,
      ]);
      console.log(`  ❌ Double vote ${i + 1} was NOT rejected!`);
    } catch {
      doubleVoteRejections++;
    }
  }

  console.log(
    `  ${doubleVoteRejections}/${DOUBLE_VOTE_ATTEMPTS} double votes rejected — ` +
      (doubleVoteRejections === DOUBLE_VOTE_ATTEMPTS
        ? "✅ All rejected"
        : "❌ Some passed through!") +
      "\n"
  );

  // ═══════════════════════════════════════════════════════════════
  //  End election
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Phase 5: End election ━━━");

  const endTx = await voting.endElection();
  const endReceipt = await endTx.wait();
  const endGas = endReceipt?.gasUsed ?? 0n;
  console.log(`  End gas: ${endGas}\n`);

  // ═══════════════════════════════════════════════════════════════
  //  Audit
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Phase 6: Audit ━━━");

  const filter = voting.filters.VoteCast();
  const events = await voting.queryFilter(filter);

  console.log(`  Events found: ${events.length}`);

  const recomputedTallies = new Array(candidates.length).fill(0);
  const seenNullifiers = new Set<string>();
  let duplicateNullifiers = 0;

  for (const event of events) {
    const parsed = voting.interface.parseLog({
      topics: event.topics as string[],
      data: event.data,
    });
    if (!parsed) continue;

    const nullHash = (parsed.args[0] as bigint).toString();
    const candidateIdx = Number(parsed.args[1]);

    if (seenNullifiers.has(nullHash)) {
      duplicateNullifiers++;
    } else {
      seenNullifiers.add(nullHash);
    }

    if (candidateIdx >= 0 && candidateIdx < candidates.length) {
      recomputedTallies[candidateIdx]++;
    }
  }

  // Compare tallies
  let tallyMatch = true;
  console.log("\n  Tally Comparison:");
  console.log("  " + "─".repeat(55));
  console.log(
    `  ${"Candidate".padEnd(15)} ${"Expected".padStart(10)} ${"On-Chain".padStart(10)} ${"Events".padStart(10)} ${"Match".padStart(7)}`
  );
  console.log("  " + "─".repeat(55));

  for (let i = 0; i < candidates.length; i++) {
    const onChain = Number(await voting.getCandidateTally(i));
    const fromEvents = recomputedTallies[i];
    const expected = expectedTallies[i];
    const match = onChain === fromEvents && onChain === expected;
    if (!match) tallyMatch = false;

    console.log(
      `  ${candidates[i].padEnd(15)} ${String(expected).padStart(10)} ${String(onChain).padStart(10)} ${String(fromEvents).padStart(10)} ${match ? "  ✅" : "  ❌"}`
    );
  }

  console.log("  " + "─".repeat(55));
  const totalOnChain = Number(await voting.totalVotes());
  const totalEvents = recomputedTallies.reduce((a: number, b: number) => a + b, 0);
  const totalExpected = expectedTallies.reduce((a: number, b: number) => a + b, 0);
  console.log(
    `  ${"TOTAL".padEnd(15)} ${String(totalExpected).padStart(10)} ${String(totalOnChain).padStart(10)} ${String(totalEvents).padStart(10)} ${totalOnChain === totalEvents && totalOnChain === totalExpected ? "  ✅" : "  ❌"}`
  );

  console.log(
    `\n  Audit result: ${tallyMatch && duplicateNullifiers === 0 ? "✅ PASS" : "❌ FAIL"}`
  );
  console.log(`  Duplicate nullifiers in events: ${duplicateNullifiers}\n`);

  // ═══════════════════════════════════════════════════════════════
  //  Performance metrics
  // ═══════════════════════════════════════════════════════════════
  console.log("━━━ Phase 7: Performance Metrics ━━━\n");

  const voteGasTotal = voteGasUsages.reduce((a, b) => a + b, 0n);
  const voteGasMin = voteGasUsages.reduce((a, b) => (a < b ? a : b));
  const voteGasMax = voteGasUsages.reduce((a, b) => (a > b ? a : b));
  const voteGasAvg = voteGasTotal / BigInt(N);

  const metrics: PerformanceMetrics = {
    deploymentGas,
    setupGas,
    startGas,
    voteGasTotal,
    voteGasMin,
    voteGasMax,
    voteGasAvg,
    endGas,
    totalTime: Date.now() - startTime,
    votingTime,
    avgVoteTime: votingTime / N,
  };

  console.log("  Gas Usage:");
  console.log(`    Deployment (total):    ${metrics.deploymentGas}`);
  console.log(`    Election setup:        ${metrics.setupGas}`);
  console.log(`    Election start:        ${metrics.startGas}`);
  console.log(`    Vote (total):          ${metrics.voteGasTotal}`);
  console.log(`    Vote (min):            ${metrics.voteGasMin}`);
  console.log(`    Vote (max):            ${metrics.voteGasMax}`);
  console.log(`    Vote (avg):            ${metrics.voteGasAvg}`);
  console.log(`    Election end:          ${metrics.endGas}`);
  console.log();
  console.log("  Timing:");
  console.log(`    Total test time:       ${metrics.totalTime}ms`);
  console.log(`    Voting phase:          ${metrics.votingTime}ms`);
  console.log(`    Avg vote time:         ${metrics.avgVoteTime.toFixed(1)}ms`);
  console.log();

  // ═══════════════════════════════════════════════════════════════
  //  Summary
  // ═══════════════════════════════════════════════════════════════
  const allPassed =
    tallyMatch &&
    duplicateNullifiers === 0 &&
    doubleVoteRejections === DOUBLE_VOTE_ATTEMPTS &&
    totalOnChain === N;

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║          MOCK ELECTION RESULTS                  ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Voters:                 ${String(N).padStart(3)}                    ║`);
  console.log(`║  Votes cast:             ${String(totalOnChain).padStart(3)}                    ║`);
  console.log(`║  Double votes rejected:  ${doubleVoteRejections}/${DOUBLE_VOTE_ATTEMPTS}                    ║`);
  console.log(`║  Tally accuracy:         ${tallyMatch ? "100%" : "FAIL"}                   ║`);
  console.log(`║  Duplicate nullifiers:   ${duplicateNullifiers}                      ║`);
  console.log(`║  Audit:                  ${tallyMatch ? "PASS" : "FAIL"}                   ║`);
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`║  Overall: ${allPassed ? "✅ ALL CHECKS PASSED" : "❌ SOME CHECKS FAILED"}                  ║`);
  console.log("╚══════════════════════════════════════════════════╝\n");

  if (!allPassed) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("\n❌ Mock Election Failed:", error);
  process.exit(1);
});
