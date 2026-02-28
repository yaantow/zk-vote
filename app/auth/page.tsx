"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { computeCommitment, nidToField } from "@/lib/utils/hash";
import { Loader2, Info, ShieldCheck } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [nid, setNid] = useState("");
  const [secret, setSecret] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const voter = useVoterStore();

  const handleVerify = async () => {
    setError(null);

    // Basic validation
    if (!nid.trim()) {
      setError("Please enter your National ID");
      return;
    }
    if (!secret.trim() || secret.length < 4) {
      setError("Secret pin must be at least 4 digits");
      return;
    }

    setVerifying(true);

    try {
      // Compute commitment hash
      const commitment = computeCommitment(nid.trim(), secret.trim());

      // In production, verify commitment against the Merkle tree via API.
      // For now, we register the voter by calling the register API.
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nid: nid.trim(),
          commitment,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Registration failed");
      }

      const data = await res.json();

      // Store voter data in Zustand
      voter.setVoter({
        isAuthenticated: true,
        nid: nid.trim(),
        secret: secret.trim(),
        commitment,
        merkleProof: data.merkleProof,
        merklePathIndices: data.merklePathIndices,
      });

      // Redirect to voting page
      router.push("/vote");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setVerifying(false);
    }
  };

  // If already authenticated, redirect
  if (voter.isAuthenticated) {
    router.push("/vote");
    return null;
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">Voter Authentication</h1>
        <p className="text-sm text-muted-foreground">
          Verify your identity to participate in the election
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Credentials</CardTitle>
          <CardDescription>
            Enter your National ID and a secret pin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nid">National ID</Label>
            <Input
              id="nid"
              placeholder="e.g. A123456"
              value={nid}
              onChange={(e) => setNid(e.target.value)}
              disabled={verifying}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret">Secret Pin</Label>
            <Input
              id="secret"
              type="password"
              placeholder="4-6 digit pin"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={verifying}
              maxLength={6}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full"
            size="lg"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>

          <Separator />

          <div>
            <Label className="mb-2 block text-sm font-medium">
              Wallet Connection
            </Label>
            <WalletConnect />
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Your ID is checked against the voter registry. Your secret pin is{" "}
              <strong>NEVER</strong> sent to any server — it stays on your device
              and is used to generate a zero-knowledge proof.
            </p>
          </div>

          <div className="text-center">
            <Badge variant="outline">
              Status:{" "}
              {voter.walletAddress
                ? `Connected (${voter.walletAddress.slice(0, 6)}…)`
                : "Not connected"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
