/**
 * ZKP Benchmark Script — Node.js
 *
 * Runs N iterations of ZoKrates WASM init + Groth16 proof generation
 * using the same artifacts as the live app (/public/zk/).
 *
 * Usage:
 *   node scripts/benchmark-zkp.mjs [iterations]
 *
 * Output: prints a summary table and writes benchmark-results.csv
 *
 * Requirements: run from the repo root (pnpm install must be done).
 */

import { readFile, writeFile } from "fs/promises";
import { performance } from "perf_hooks";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const ITERATIONS = parseInt(process.argv[2] ?? "10", 10);
const ARTIFACTS_PATH = path.join(ROOT, "public/zk/artifacts.json");
const PROVING_KEY_PATH = path.join(ROOT, "public/zk/proving-key.bin");

// Dummy inputs — same structure as a real vote, all zeros
const DUMMY_INPUT = [
  "0",           // voterSecret
  "0",           // voterNid
  ["0","0","0","0","0","0"],  // merklePath[6]
  ["0","0","0","0","0","0"],  // merklePathIndices[6]
  "0",           // merkleRoot
  "0",           // nullifierHash
  "0",           // candidateIndex
  "4",           // maxCandidates
];

function computeStats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[Math.floor(n / 2)];
  const p95 = sorted[Math.min(Math.ceil(n * 0.95) - 1, n - 1)];
  const stddev = Math.sqrt(sorted.reduce((a, d) => a + (d - mean) ** 2, 0) / n);
  return {
    n,
    min: sorted[0].toFixed(2),
    max: sorted[n - 1].toFixed(2),
    mean: mean.toFixed(2),
    median: median.toFixed(2),
    p95: p95.toFixed(2),
    stddev: stddev.toFixed(2),
  };
}

async function main() {
  console.log(`\nZKP Benchmark — ${ITERATIONS} iteration(s)\n`);

  // Load artifacts once
  process.stdout.write("Loading artifacts… ");
  const rawArtifacts = JSON.parse(await readFile(ARTIFACTS_PATH, "utf8"));
  const programBytes = Uint8Array.from(atob(rawArtifacts.program), (c) => c.charCodeAt(0));
  const artifacts = { ...rawArtifacts, program: programBytes };
  const provingKey = new Uint8Array(await readFile(PROVING_KEY_PATH));
  console.log("done.\n");

  const { initialize } = await import("zokrates-js");

  const initTimes = [];
  const proofTimes = [];

  for (let i = 1; i <= ITERATIONS; i++) {
    process.stdout.write(`Run ${String(i).padStart(2)}/${ITERATIONS}  `);

    // Re-init provider each run (cold start)
    const t0 = performance.now();
    const zk = await initialize();
    const initMs = performance.now() - t0;
    initTimes.push(initMs);
    process.stdout.write(`init ${initMs.toFixed(0).padStart(5)} ms  `);

    const t1 = performance.now();
    const { witness } = zk.computeWitness(artifacts, DUMMY_INPUT);
    zk.generateProof(artifacts.program, witness, provingKey);
    const proofMs = performance.now() - t1;
    proofTimes.push(proofMs);
    console.log(`proof ${proofMs.toFixed(0).padStart(5)} ms  total ${(initMs + proofMs).toFixed(0).padStart(6)} ms`);
  }

  const iStats = computeStats(initTimes);
  const pStats = computeStats(proofTimes);
  const tStats = computeStats(initTimes.map((v, i) => v + proofTimes[i]));

  console.log(`
┌─────────────────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Phase               │    Mean  │  Median  │     P95  │  StdDev  │     Min  │     Max  │
├─────────────────────┼──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│ ZKP Init (WASM)     │ ${iStats.mean.padStart(6)} ms │ ${iStats.median.padStart(6)} ms │ ${iStats.p95.padStart(6)} ms │ ${iStats.stddev.padStart(6)} ms │ ${iStats.min.padStart(6)} ms │ ${iStats.max.padStart(6)} ms │
│ Proof Generation    │ ${pStats.mean.padStart(6)} ms │ ${pStats.median.padStart(6)} ms │ ${pStats.p95.padStart(6)} ms │ ${pStats.stddev.padStart(6)} ms │ ${pStats.min.padStart(6)} ms │ ${pStats.max.padStart(6)} ms │
│ Total               │ ${tStats.mean.padStart(6)} ms │ ${tStats.median.padStart(6)} ms │ ${tStats.p95.padStart(6)} ms │ ${tStats.stddev.padStart(6)} ms │ ${tStats.min.padStart(6)} ms │ ${tStats.max.padStart(6)} ms │
└─────────────────────┴──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘`);

  // Write CSV
  const csvPath = path.join(ROOT, "scripts", "benchmark-results.csv");
  const header = "run,zkp_init_ms,proof_ms,total_ms";
  const rows = initTimes.map((v, i) =>
    `${i + 1},${v.toFixed(2)},${proofTimes[i].toFixed(2)},${(v + proofTimes[i]).toFixed(2)}`
  );
  await writeFile(csvPath, [header, ...rows].join("\n"), "utf8");
  console.log(`\nResults saved to scripts/benchmark-results.csv\n`);
}

main().catch((err) => { console.error(err); process.exit(1); });
