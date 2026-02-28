"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuditLog, type AuditEntry } from "@/components/AuditLog";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditData {
  events: AuditEntry[];
  recomputedTally: number[];
  onChainTally: number[];
  match: boolean;
  candidates: string[];
}

export default function AuditPage() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/audit");
      if (!res.ok) throw new Error("Failed to fetch audit data");
      const json = await res.json();

      // Also get candidates from election endpoint
      const electionRes = await fetch("/api/election");
      const electionData = electionRes.ok ? await electionRes.json() : null;

      setData({
        events: json.events,
        recomputedTally: json.recomputedTally,
        onChainTally: json.onChainTally,
        match: json.match,
        candidates: electionData?.candidates || [],
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load audit data"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-warning" />
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchAudit}>Retry</Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">Election Audit Log</h1>
          <p className="text-sm text-muted-foreground">
            Independent verification of the election tally
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchAudit}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tally Comparison */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">On-Chain Tally</CardTitle>
            <CardDescription>Read from smart contract</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.onChainTally.map((count, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm"
                >
                  <span>{data.candidates[i] || `Candidate ${i}`}</span>
                  <span className="font-mono font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recomputed from Events</CardTitle>
            <CardDescription>
              Independently tallied from VoteCast events
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {data.recomputedTally.map((count, i) => (
                <div
                  key={i}
                  className="flex justify-between text-sm"
                >
                  <span>{data.candidates[i] || `Candidate ${i}`}</span>
                  <span className="font-mono font-medium">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Match Status */}
      <div
        className={`flex items-center gap-2 rounded-lg border p-4 ${
          data.match
            ? "border-success/30 bg-success/5"
            : "border-destructive/30 bg-destructive/5"
        }`}
      >
        {data.match ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-success" />
            <span className="font-semibold text-success">
              Tallies MATCH — Election integrity verified
            </span>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="font-semibold text-destructive">
              Tallies DO NOT MATCH — Discrepancy detected!
            </span>
          </>
        )}
      </div>

      <Separator />

      {/* Event Log */}
      <AuditLog events={data.events} />
    </div>
  );
}
