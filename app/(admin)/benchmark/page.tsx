"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Download, CheckCircle2 } from "lucide-react";

interface BenchmarkRun {
  run: number;
  zkpInitMs: number;
  proofMs: number;
  totalMs: number;
}

function stats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / n;
  const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];
  const p95 = sorted[Math.min(Math.ceil(n * 0.95) - 1, n - 1)];
  const stddev = Math.sqrt(sorted.reduce((a, d) => a + (d - mean) ** 2, 0) / n);
  return {
    min: sorted[0].toFixed(0),
    max: sorted[n - 1].toFixed(0),
    mean: mean.toFixed(0),
    median: median.toFixed(0),
    p95: p95.toFixed(0),
    stddev: stddev.toFixed(0),
  };
}

export default function BenchmarkPage() {
  const [iterations, setIterations] = useState(10);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [runs, setRuns] = useState<BenchmarkRun[]>([]);
  const [saved, setSaved] = useState(false);

  const runBenchmark = async () => {
    setRunning(true);
    setProgress([]);
    setRuns([]);
    setSaved(false);

    const log = (msg: string) => setProgress((p) => [...p, msg]);
    const results: BenchmarkRun[] = [];

    try {
      log("Loading ZK artifacts…");
      const { loadArtifacts } = await import("@/lib/zk/prover");
      await loadArtifacts();
      log("Artifacts loaded.");

      // Build valid inputs: single dummy voter in a Merkle tree
      log("Computing valid circuit inputs…");
      const { nidToField, computeNullifierAsync, poseidonHashAsync } = await import("@/lib/utils/hash");
      const { buildMerkleTree, generateMerkleProof, getMerkleRoot } = await import("@/lib/utils/merkle");
      const { MERKLE_DEPTH, ELECTION_ID } = await import("@/lib/utils/constants");

      const DUMMY_NID = "A000000";
      const DUMMY_SECRET = "0000";
      const nidField = nidToField(DUMMY_NID);
      const commitment = await poseidonHashAsync(nidField, DUMMY_SECRET);
      const nullifierHash = await computeNullifierAsync(DUMMY_SECRET, ELECTION_ID);
      const tree = buildMerkleTree([commitment], MERKLE_DEPTH);
      const merkleProof = generateMerkleProof(tree, 0, MERKLE_DEPTH);

      const dummyInput = {
        voterSecret: DUMMY_SECRET,
        voterNid: nidField,
        merklePath: merkleProof.path.map((p) => BigInt(p).toString()),
        merklePathIndices: merkleProof.indices.map(String),
        merkleRoot: BigInt(getMerkleRoot(tree)).toString(),
        nullifierHash,
        candidateIndex: "0",
        maxCandidates: "4",
      };
      log("Inputs ready.");

      for (let i = 1; i <= iterations; i++) {
        log(`Run ${i}/${iterations} — initialising ZoKrates…`);

        // Always reinitialise the WASM provider for each run to measure cold init
        const { resetProvider, getZoKratesProvider } = await import("@/lib/zk/zokrates");
        resetProvider();

        const t0 = performance.now();
        await getZoKratesProvider();
        const zkpInitMs = Math.round(performance.now() - t0);

        log(`  Init: ${zkpInitMs} ms — generating proof…`);

        const t1 = performance.now();
        const { generateProof } = await import("@/lib/zk/prover");
        await generateProof(dummyInput);
        const proofMs = Math.round(performance.now() - t1);

        const totalMs = zkpInitMs + proofMs;
        log(`  Proof: ${proofMs} ms | Total: ${totalMs} ms ✓`);

        results.push({ run: i, zkpInitMs, proofMs, totalMs });
        setRuns([...results]);
      }

      log("Benchmark complete.");

      // Save to /api/metrics
      const metrics = results.flatMap((r) => [
        { id: crypto.randomUUID(), category: "zkp-init", label: "ZoKrates WASM initialization (benchmark)", durationMs: r.zkpInitMs, timestamp: new Date().toISOString(), metadata: { run: r.run, source: "benchmark" } },
        { id: crypto.randomUUID(), category: "zkp-proof", label: "Groth16 proof generation (benchmark)", durationMs: r.proofMs, timestamp: new Date().toISOString(), metadata: { run: r.run, source: "benchmark" } },
      ]);
      await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metrics),
      });
      setSaved(true);
      log("Results saved to /api/metrics ✓");
    } catch (err) {
      log(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  const exportCSV = () => {
    const header = "Run,ZKP Init (ms),Proof (ms),Total (ms)";
    const rows = runs.map((r) => `${r.run},${r.zkpInitMs},${r.proofMs},${r.totalMs}`);
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zkp-benchmark-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const initTimes = runs.map((r) => r.zkpInitMs);
  const proofTimes = runs.map((r) => r.proofMs);
  const totalTimes = runs.map((r) => r.totalMs);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">ZKP Benchmark</h1>
            <p className="text-xs text-muted-foreground">
              Controlled in-browser timing — same code path as live voters
            </p>
          </div>
        </div>
        {runs.length > 0 && (
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        )}
      </div>

      {/* Config */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex items-center gap-2 text-sm">
            <label htmlFor="iters" className="text-muted-foreground">Iterations:</label>
            <input
              id="iters"
              type="number"
              min={1}
              max={50}
              value={iterations}
              onChange={(e) => setIterations(Math.max(1, Math.min(50, Number(e.target.value))))}
              className="w-16 rounded-md border border-input bg-background px-2 py-1 text-sm text-center"
              disabled={running}
            />
          </div>
          <Button onClick={runBenchmark} disabled={running} size="sm">
            <Play className="mr-1.5 h-3.5 w-3.5" />
            {running ? "Running…" : "Run Benchmark"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-500">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved to metrics
            </span>
          )}
        </CardContent>
      </Card>

      {/* Summary stats */}
      {runs.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "ZKP Init", s: stats(initTimes) },
            { label: "Proof Generation", s: stats(proofTimes) },
            { label: "Total", s: stats(totalTimes) },
          ].map(({ label, s }) => (
            <Card key={label}>
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="text-2xl font-bold">{s.mean} ms</div>
                <div className="text-xs text-muted-foreground mt-0.5">mean</div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>Median</span><span className="text-foreground font-medium">{s.median} ms</span>
                  <span>P95</span><span className="text-foreground font-medium">{s.p95} ms</span>
                  <span>StdDev</span><span className="text-foreground font-medium">{s.stddev} ms</span>
                  <span>Min / Max</span><span className="text-foreground font-medium">{s.min} / {s.max}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Log + per-run table side by side */}
      {(progress.length > 0 || runs.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {/* Log */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs">Log</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-64 overflow-y-auto px-4 pb-3 font-mono text-xs space-y-0.5">
                {progress.map((line, i) => (
                  <div key={i} className="text-muted-foreground">{line}</div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Per-run table */}
          {runs.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs">Per-run Results</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background border-b">
                      <tr className="text-muted-foreground">
                        <th className="px-4 py-1.5 text-left">Run</th>
                        <th className="px-3 py-1.5 text-right">Init</th>
                        <th className="px-3 py-1.5 text-right">Proof</th>
                        <th className="px-4 py-1.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((r) => (
                        <tr key={r.run} className="border-b last:border-0">
                          <td className="px-4 py-1.5 text-muted-foreground">{r.run}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{r.zkpInitMs}</td>
                          <td className="px-3 py-1.5 text-right font-mono">{r.proofMs}</td>
                          <td className="px-4 py-1.5 text-right font-mono">{r.totalMs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
