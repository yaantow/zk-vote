"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ResultsChart } from "@/components/ResultsChart";
import { useElectionStore } from "@/lib/store/election-store";
import { RESULTS_REFRESH_INTERVAL } from "@/lib/utils/constants";
import {
  Loader2,
  RefreshCw,
  Shield,
  ExternalLink,
} from "lucide-react";

interface CandidateResult {
  name: string;
  tally: number;
}

export default function ResultsPage() {
  const election = useElectionStore();
  const [candidates, setCandidates] = useState<CandidateResult[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch("/api/election");
      if (res.ok) {
        const data = await res.json();
        const results: CandidateResult[] = data.candidates.map(
          (name: string, i: number) => ({
            name,
            tally: data.tallies[i] || 0,
          })
        );
        setCandidates(results);
        setTotalVotes(data.totalVotes || 0);
        election.setElection({
          title: data.title,
          candidates: data.candidates,
          isActive: data.isActive,
          totalVotes: data.totalVotes,
          tallies: data.tallies,
        });
        setLastRefresh(new Date());
      }
    } catch {
      // Use existing store data on failure
      if (election.candidates.length > 0) {
        setCandidates(
          election.candidates.map((name, i) => ({
            name,
            tally: election.tallies[i] || 0,
          }))
        );
        setTotalVotes(election.totalVotes);
      }
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchResults();

    // Auto-refresh while election is active
    const interval = setInterval(() => {
      fetchResults();
    }, RESULTS_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [fetchResults]);

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
        <h1 className="text-2xl font-bold">Election Results</h1>
        <p className="text-sm text-muted-foreground">
          {election.title || "Election"}
        </p>
        {election.isActive ? (
          <Badge className="bg-success text-success-foreground">Live</Badge>
        ) : (
          <Badge variant="secondary">Ended</Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Vote Tally</CardTitle>
              <CardDescription>
                Total votes: {totalVotes}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchResults}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {candidates.length > 0 ? (
            <ResultsChart candidates={candidates} totalVotes={totalVotes} />
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              No results available yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        {election.contractAddress && (
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://amoy.polygonscan.com/address/${election.contractAddress}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View Contract
            </a>
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <Link href="/audit">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            View Full Audit
          </Link>
        </Button>
      </div>

      {lastRefresh && (
        <p className="text-center text-xs text-muted-foreground">
          Last updated: {lastRefresh.toLocaleTimeString()} · Auto-refreshes
          every {RESULTS_REFRESH_INTERVAL / 1000}s
        </p>
      )}
    </div>
  );
}
