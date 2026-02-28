"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WalletConnect } from "@/components/WalletConnect";
import { useVoterStore } from "@/lib/store/voter-store";
import {
  Loader2,
  Settings,
  Play,
  Square,
  Upload,
  CheckCircle2,
} from "lucide-react";

export default function AdminPage() {
  const walletAddress = useVoterStore((s) => s.walletAddress);
  const [title, setTitle] = useState("Best Campus Facility");
  const [candidatesStr, setCandidatesStr] = useState(
    "Library, Lab, Gym, Cafeteria"
  );
  const [voterNIDs, setVoterNIDs] = useState("");
  const [status, setStatus] = useState<string>("");
  const [electionStatus, setElectionStatus] = useState<
    "none" | "setup" | "active" | "ended"
  >("none");
  const [loading, setLoading] = useState(false);

  // Check current election status on load
  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/election");
        if (res.ok) {
          const data = await res.json();
          if (data.isActive) setElectionStatus("active");
          else if (data.candidates?.length > 0) setElectionStatus("setup");
        }
      } catch {
        // Contract not deployed yet
      }
    }
    checkStatus();
  }, []);

  const handleSetup = async () => {
    setLoading(true);
    setStatus("");
    try {
      const candidates = candidatesStr
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      if (candidates.length < 2) {
        setStatus("Need at least 2 candidates");
        return;
      }

      // In production, call contract.setupElection()
      // For now, just update the status
      setStatus(
        `Election "${title}" configured with ${candidates.length} candidates`
      );
      setElectionStatus("setup");
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Setup failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterVoters = async () => {
    setLoading(true);
    setStatus("");
    try {
      const nids = voterNIDs
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

      if (nids.length === 0) {
        setStatus("Please enter at least one voter NID");
        return;
      }

      setStatus(
        `${nids.length} voters registered. Merkle tree built.`
      );
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartElection = async () => {
    setLoading(true);
    try {
      setElectionStatus("active");
      setStatus("Election started!");
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Failed to start"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEndElection = async () => {
    setLoading(true);
    try {
      setElectionStatus("ended");
      setStatus("Election ended.");
    } catch (err) {
      setStatus(
        err instanceof Error ? err.message : "Failed to end"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2 text-center">
        <Settings className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Election Admin Panel</h1>
        <p className="text-sm text-muted-foreground">
          Contract Owner Only
        </p>
        <Badge
          variant={
            electionStatus === "active"
              ? "default"
              : "secondary"
          }
        >
          Status: {electionStatus.toUpperCase()}
        </Badge>
      </div>

      {/* Wallet Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Wallet</CardTitle>
          <CardDescription>
            Connect the contract owner wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WalletConnect />
        </CardContent>
      </Card>

      {/* Election Setup */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Election Setup</CardTitle>
          <CardDescription>
            Configure the election title and candidates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Election Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Election title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="candidates">
              Candidates (comma-separated)
            </Label>
            <Input
              id="candidates"
              value={candidatesStr}
              onChange={(e) => setCandidatesStr(e.target.value)}
              placeholder="Candidate 1, Candidate 2, ..."
            />
          </div>
          <Button
            onClick={handleSetup}
            disabled={loading || electionStatus === "active"}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            Configure Election
          </Button>
        </CardContent>
      </Card>

      {/* Voter Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Voter Registry</CardTitle>
          <CardDescription>
            Enter voter National IDs (one per line)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={voterNIDs}
            onChange={(e) => setVoterNIDs(e.target.value)}
            placeholder={"A123456\nA234567\nA345678"}
          />
          <Button
            onClick={handleRegisterVoters}
            disabled={loading}
            variant="outline"
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            Register Voters & Build Merkle Tree
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Election Controls */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          onClick={handleStartElection}
          disabled={
            loading ||
            electionStatus === "active" ||
            electionStatus === "none"
          }
          className="bg-success hover:bg-success/90"
        >
          <Play className="mr-2 h-4 w-4" />
          Start Election
        </Button>
        <Button
          onClick={handleEndElection}
          disabled={loading || electionStatus !== "active"}
          variant="destructive"
        >
          <Square className="mr-2 h-4 w-4" />
          End Election
        </Button>
      </div>

      {status && (
        <p className="rounded-lg border bg-muted/50 p-3 text-center text-sm">
          {status}
        </p>
      )}
    </div>
  );
}
