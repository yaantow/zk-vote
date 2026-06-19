"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Loader2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditData {
  onChainTally: number[];
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

      setData({
        onChainTally: json.onChainTally,
        candidates: json.candidateNames || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit data");
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
          <h1 className="text-2xl font-bold">Election Audit</h1>
          <p className="text-sm text-muted-foreground">
            Vote tally read directly from the smart contract
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchAudit}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Vote Tally</CardTitle>
          <CardDescription>Read from smart contract</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {data.onChainTally.map((count, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{data.candidates[i] || `Candidate ${i}`}</span>
                <span className="font-mono font-medium">{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <a
          href="https://amoy.polygonscan.com/address/0x14550E11e18aB93E5378A7695bD14196ff9f5C21"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="outline" className="w-full">
            View Contract on Polygonscan ↗
          </Button>
        </a>
        <a
          href="https://amoy.polygonscan.com/address/0x14550E11e18aB93E5378A7695bD14196ff9f5C21#events"
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1"
        >
          <Button variant="outline" className="w-full">
            Detailed Events ↗
          </Button>
        </a>
      </div>
    </div>
  );
}
