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
import {
  Loader2,
  Settings,
  Play,
  Square,
  CheckCircle2,
  Lock,
  Users,
  Rocket,
  AlertCircle,
} from "lucide-react";

type ElectionStatus = "none" | "setup" | "active" | "ended";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [title, setTitle] = useState("Presidential Election 2026");
  const [candidatesStr, setCandidatesStr] = useState(
    "Ibrahim Mohamed Solih, Mohamed Muizzu, Ilyas Labeeb, Qasim Ibrahim"
  );
  const [voterNIDs, setVoterNIDs] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error" | "info"; msg: string } | null>(null);
  const [electionStatus, setElectionStatus] = useState<ElectionStatus>("none");
  const [loading, setLoading] = useState(false);
  const [setupDone, setSetupDone] = useState(false);

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

  const handleUnlock = () => {
    if (!password) return;
    setAuthed(true);
    setStatus({ type: "info", msg: "Admin access granted. Follow the steps below." });
  };

  const handleSetup = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const candidates = candidatesStr
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);

      if (candidates.length < 2) {
        setStatus({ type: "error", msg: "Need at least 2 candidates." });
        return;
      }

      const voterNids = voterNIDs
        .split("\n")
        .map((n) => n.trim())
        .filter(Boolean);

      if (voterNids.length === 0) {
        setStatus({ type: "error", msg: "Please enter at least one voter NID." });
        return;
      }

      setStatus({ type: "info", msg: `⏳ Building Merkle tree for ${voterNids.length} voters and deploying to blockchain… this may take 30–60 seconds.` });

      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, candidates, voterNids, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSetupDone(true);
      setElectionStatus("setup");
      setStatus({
        type: "success",
        msg: `✅ Election configured with ${data.voterCount} registered voter(s). Tx: ${data.txHash}`,
      });
    } catch (err) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Setup failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleStartElection = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setElectionStatus("active");
      setStatus({ type: "success", msg: `✅ Election is now LIVE. Tx: ${data.txHash}` });
    } catch (err) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed to start" });
    } finally {
      setLoading(false);
    }
  };

  const handleEndElection = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setElectionStatus("ended");
      setStatus({ type: "success", msg: `✅ Election ended. Tx: ${data.txHash}` });
    } catch (err) {
      setStatus({ type: "error", msg: err instanceof Error ? err.message : "Failed to end" });
    } finally {
      setLoading(false);
    }
  };

  const statusColor = {
    none: "secondary",
    setup: "outline",
    active: "default",
    ended: "secondary",
  } as const;

  const statusLabel = {
    none: "Not Configured",
    setup: "Configured — Not Started",
    active: "🟢 LIVE",
    ended: "Ended",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-12">
      {/* Header */}
      <div className="space-y-2 text-center">
        <Settings className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Election Admin Panel</h1>
        <p className="text-sm text-muted-foreground">Manage the ZK-Vote election lifecycle</p>
        <Badge variant={statusColor[electionStatus]}>
          {statusLabel[electionStatus]}
        </Badge>
      </div>

      {/* Status message */}
      {status && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            status.type === "error"
              ? "border-destructive/40 bg-destructive/5 text-destructive"
              : status.type === "success"
              ? "border-green-500/40 bg-green-500/5 text-green-700 dark:text-green-400"
              : "border-blue-500/40 bg-blue-500/5 text-blue-700 dark:text-blue-400"
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{status.msg}</p>
        </div>
      )}

      {/* STEP 1: Authenticate */}
      <StepCard
        step={1}
        title="Admin Authentication"
        description="Enter your password to unlock the controls"
        done={authed}
      >
        <div className="flex gap-2">
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
            placeholder="Admin password"
            className="h-11"
            disabled={authed}
          />
          <Button
            onClick={handleUnlock}
            disabled={!password || authed}
            className="h-11 px-6 shrink-0"
          >
            {authed ? <CheckCircle2 className="h-4 w-4" /> : <Lock className="h-4 w-4 mr-1" />}
            {authed ? "Unlocked" : "Unlock"}
          </Button>
        </div>
      </StepCard>

      {/* STEP 2: Configure */}
      <StepCard
        step={2}
        title="Configure Election"
        description="Set the title, candidates, and register voters — then deploy to blockchain"
        done={setupDone || electionStatus !== "none"}
        locked={!authed}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Election Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Presidential Election 2026"
              disabled={loading || electionStatus === "active"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="candidates">
              Candidates <span className="text-muted-foreground text-xs">(comma-separated)</span>
            </Label>
            <Input
              id="candidates"
              value={candidatesStr}
              onChange={(e) => setCandidatesStr(e.target.value)}
              placeholder="Candidate A, Candidate B, Candidate C"
              disabled={loading || electionStatus === "active"}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="voter-nids">
              Voter NIDs{" "}
              <span className="text-muted-foreground text-xs">(one per line)</span>
            </Label>
            <textarea
              id="voter-nids"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              value={voterNIDs}
              onChange={(e) => setVoterNIDs(e.target.value)}
              placeholder={"A123456\nA234567\nA345678"}
              disabled={loading || electionStatus === "active"}
            />
            <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
              <strong>Important:</strong> Registered voters must use{" "}
              <code className="font-mono bg-amber-100 dark:bg-amber-900/50 px-1 rounded">0000</code>{" "}
              as their secret pin when voting.
            </div>
          </div>

          <Button
            onClick={handleSetup}
            disabled={loading || !authed || electionStatus === "active"}
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Rocket className="mr-2 h-5 w-5" />
            )}
            {loading ? "Deploying to Blockchain…" : "Configure & Register on Blockchain"}
          </Button>
        </div>
      </StepCard>

      {/* STEP 3: Start */}
      <StepCard
        step={3}
        title="Start Election"
        description="Open the election so registered voters can cast their votes"
        done={electionStatus === "active" || electionStatus === "ended"}
        locked={electionStatus === "none" || !authed}
      >
        <Button
          onClick={handleStartElection}
          disabled={loading || electionStatus !== "setup"}
          className="w-full h-12 text-base bg-green-600 hover:bg-green-700 text-white"
          size="lg"
        >
          {loading ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Play className="mr-2 h-5 w-5" />
          )}
          {electionStatus === "active" ? "Election is Live ✓" : "Start Election"}
        </Button>
      </StepCard>

      {/* STEP 4: End */}
      {(electionStatus === "active" || electionStatus === "ended") && (
        <StepCard
          step={4}
          title="End Election"
          description="Close voting and finalize results on the blockchain"
          done={electionStatus === "ended"}
          locked={!authed}
        >
          <Button
            onClick={handleEndElection}
            disabled={loading || electionStatus !== "active"}
            variant="destructive"
            className="w-full h-12 text-base"
            size="lg"
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Square className="mr-2 h-5 w-5" />
            )}
            {electionStatus === "ended" ? "Election Ended ✓" : "End Election"}
          </Button>
        </StepCard>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  StepCard helper component                                          */
/* ------------------------------------------------------------------ */

function StepCard({
  step,
  title,
  description,
  done,
  locked,
  children,
}: {
  step: number;
  title: string;
  description: string;
  done?: boolean;
  locked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className={`border-border/50 transition-opacity ${locked ? "opacity-50 pointer-events-none select-none" : ""}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              done
                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                : "bg-primary/10 text-primary"
            }`}
          >
            {done ? <CheckCircle2 className="h-5 w-5" /> : step}
          </div>
          <div>
            <CardTitle className="text-base leading-tight">{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          {locked && (
            <Lock className="ml-auto h-4 w-4 text-muted-foreground shrink-0" />
          )}
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
