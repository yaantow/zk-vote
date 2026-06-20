"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProofStatus } from "@/components/ProofStatus";
import { useVoterStore } from "@/lib/store/voter-store";
import { useElectionStore } from "@/lib/store/election-store";
import { useProofStore } from "@/lib/store/proof-store";
import { nidToField, computeNullifierAsync } from "@/lib/utils/hash";
import { queueVote } from "@/lib/utils/offline-queue";
import { startTimer, getAllMetrics, clearMetrics } from "@/lib/utils/performance";
import { ELECTION_ID } from "@/lib/utils/constants";
import type { ZKProof } from "@/lib/blockchain/voting-contract";
import { CheckCircle2, BarChart3, ClipboardList } from "lucide-react";

export default function ConfirmPage() {
  const router = useRouter();
  const voter = useVoterStore();
  const election = useElectionStore();
  const proof = useProofStore();

  const candidates =
    election.candidates.length > 0
      ? election.candidates
      : ["Ibrahim Mohamed Solih", "Mohamed Muizzu", "Ilyas Labeeb", "Qasim Ibrahim"];

  const candidateName =
    proof.selectedCandidate !== null
      ? candidates[proof.selectedCandidate]
      : "Unknown";

  // Guard
  useEffect(() => {
    if (!voter.isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (proof.selectedCandidate === null) {
      router.replace("/vote");
    }
  }, [voter.isAuthenticated, proof.selectedCandidate, router]);

  // Ref guard prevents double-firing from React Strict Mode's double-effect invocation.
  // Unlike proof.proofStatus (stale inside useCallback with [] deps), a ref is always current.
  const hasStarted = useRef(false);

  const runProofGeneration = useCallback(async () => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    try {
      // Step 1: Initialize ZoKrates
      proof.setStatus("initializing");
      const zkInitTimer = startTimer("zkp-init", "ZoKrates WASM initialization");
      const { getZoKratesProvider } = await import("@/lib/zk/zokrates");
      await getZoKratesProvider();
      zkInitTimer.stop();

      // Step 2: Compute witness inputs
      proof.setStatus("computing");
      const nidField = nidToField(voter.nid!);
      const nullifierHash = await computeNullifierAsync(voter.secret!, ELECTION_ID);
      const merkleRoot = election.merkleRoot;
      if (!merkleRoot || merkleRoot === "0" || merkleRoot === "0x0") {
        throw new Error("Election Merkle root not loaded. Please go back and try again.");
      }
      const merklePath = voter.merkleProof || Array(6).fill("0");
      const merklePathIndices = voter.merklePathIndices || Array(6).fill(0);

      // Step 3: Generate proof
      proof.setStatus("proving");

      const proofTimer = startTimer("zkp-proof", "Groth16 proof generation");
      const { generateProof } = await import("@/lib/zk/prover");
      const generatedProof = await generateProof({
        voterSecret: voter.secret!,
        voterNid: nidField,
        merklePath: merklePath.map(String),
        merklePathIndices: merklePathIndices.map(String),
        merkleRoot,
        nullifierHash,
        candidateIndex: String(proof.selectedCandidate),
        maxCandidates: String(candidates.length),
      });

      proof.setProof(generatedProof);
      proofTimer.stop();

      // Step 4: Submit to blockchain
      proof.setStatus("submitting");
      const txTimer = startTimer("tx-submit", "On-chain vote submission");

      if (!navigator.onLine) {
        await queueVote(generatedProof.proof, generatedProof.inputs);
        txTimer.stop();
        proof.setStatus("done");
        proof.setTxHash("queued-offline");
        return;
      }

      try {
        const response = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proof: generatedProof.proof,
            inputs: generatedProof.inputs,
          }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || "Failed to submit vote");
        }
        
        proof.setTxHash(data.txHash);
      } catch (err) {
        throw err; // Let the outer catch handle it
      }

      txTimer.stop();

      proof.setStatus("done");

      // Flush all collected metrics to server, then clear localStorage
      try {
        const metrics = getAllMetrics();
        if (metrics.length > 0) {
          await fetch("/api/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(metrics),
          });
          clearMetrics();
        }
      } catch {
        // non-fatal — metrics loss is acceptable
      }
    } catch (err) {
      proof.setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (voter.isAuthenticated && proof.selectedCandidate !== null) {
      runProofGeneration();
    }
  }, [voter.isAuthenticated, proof.selectedCandidate, runProofGeneration]);

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-2xl">
          {proof.proofStatus === "done" ? "✅" : "🗳️"}
        </div>
        <h1 className="text-2xl font-bold">
          {proof.proofStatus === "done"
            ? "Vote Submitted!"
            : "Submitting Your Vote…"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Your choice: <strong>{candidateName}</strong>
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Progress</CardTitle>
          <CardDescription>
            Your vote is being secured and recorded
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProofStatus
            currentStatus={proof.proofStatus}
            error={proof.error}
          />

          {proof.proofStatus === "done" && (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <span className="font-semibold text-success">
                  Your vote has been recorded!
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Your vote is anonymous and cannot be traced back to you.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {proof.proofStatus === "done" && (
        <div className="space-y-3">
          <Button asChild className="w-full h-12 text-base rounded-xl" size="lg">
            <Link href="/survey">
              <ClipboardList className="mr-2 h-4 w-4" />
              Complete the Survey
            </Link>
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Complete the 10-question survey to view the results
          </p>
          <Button asChild variant="ghost" className="w-full" size="sm">
            <Link href="/results">
              <BarChart3 className="mr-2 h-4 w-4" />
              Skip to Results
            </Link>
          </Button>
        </div>
      )}

      {proof.proofStatus !== "done" && proof.proofStatus !== "error" && (
        <div className="rounded-xl border border-border/30 bg-card/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            🔒 Everything happens on your device. Please wait…
          </p>
        </div>
      )}
    </div>
  );
}
