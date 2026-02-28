"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VotingCard } from "@/components/VotingCard";
import { useVoterStore } from "@/lib/store/voter-store";
import { useElectionStore } from "@/lib/store/election-store";
import { useProofStore } from "@/lib/store/proof-store";
import { AlertTriangle, ArrowRight, Loader2 } from "lucide-react";

const CANDIDATE_ICONS = ["🏫", "📚", "🏋️", "🍽️", "🎓", "🏥"];

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

    // Fetch election data
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
      : ["Library", "Lab", "Gym", "Cafeteria"];

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
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold">Cast Your Vote</h1>
        <p className="text-sm text-muted-foreground">
          {election.title || "Election"}
        </p>
        {election.isActive ? (
          <Badge className="bg-success text-success-foreground">
            Election Active
          </Badge>
        ) : (
          <Badge variant="secondary">Election Not Active</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select a Candidate</CardTitle>
          <CardDescription>
            Choose exactly one option. You will confirm your choice on the next
            screen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
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
        </CardContent>
      </Card>

      <div className="space-y-3">
        <Button
          onClick={handleConfirm}
          disabled={selected === null}
          className="w-full"
          size="lg"
        >
          Confirm Vote
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>

        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p className="text-xs text-muted-foreground">
            You cannot change your vote after confirmation. Please review your
            selection carefully.
          </p>
        </div>
      </div>
    </div>
  );
}
