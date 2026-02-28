"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { VotingCard } from "@/components/VotingCard";
import { useVoterStore } from "@/lib/store/voter-store";
import { useElectionStore } from "@/lib/store/election-store";
import { useProofStore } from "@/lib/store/proof-store";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

const CANDIDATE_ICONS = ["�️", "🌟", "⚖️", "🤝", "🎓", "🏥"];

export default function VotePage() {
  const router = useRouter();
  const voter = useVoterStore();
  const election = useElectionStore();
  const proofStore = useProofStore();
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);

  // Guard: redirect if not authenticated
  useEffect(() => {
    if (!voter.isAuthenticated) {
      router.replace("/auth");
      return;
    }

    async function fetchElection() {
      try {
        const res = await fetch("/api/election");
        if (res.ok) {
          const data = await res.json();
          election.setElection({
            title: data.title,
            candidates: data.candidates,
            merkleRoot: data.merkleRoot,
            isActive: data.isActive,
            contractAddress: data.contractAddress,
            totalVotes: data.totalVotes,
            tallies: data.tallies,
          });
        }
      } catch {
        // Use default candidates if API fails
      } finally {
        setLoading(false);
      }
    }

    fetchElection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const candidates =
    election.candidates.length > 0
      ? election.candidates
      : ["Ibrahim Mohamed Solih", "Mohamed Muizzu", "Ilyas Labeeb", "Qasim Ibrahim"];

  const handleConfirm = () => {
    if (selected === null) return;
    proofStore.setCandidate(selected);
    router.push("/vote/confirm");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Choose Your Candidate</h1>
        <p className="text-sm text-muted-foreground">
          Tap the option you want to vote for
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {candidates.map((name, i) => (
          <VotingCard
            key={i}
            name={name}
            index={i}
            icon={CANDIDATE_ICONS[i] || "🗳️"}
            selected={selected === i}
            onSelect={setSelected}
          />
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={handleConfirm}
          disabled={selected === null}
          className="w-full h-12 text-base rounded-xl"
          size="lg"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs text-muted-foreground">
            You cannot change your vote after the next step. Please review
            your selection carefully.
          </p>
        </div>
      </div>
    </div>
  );
}
