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
import { WalletConnect } from "@/components/WalletConnect";
import { useVoterStore } from "@/lib/store/voter-store";
import { computeCommitment, nidToField } from "@/lib/utils/hash";
import { Loader2, Lock, ChevronDown, ChevronUp } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [nid, setNid] = useState("");
  const [secret, setSecret] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWallet, setShowWallet] = useState(false);

  const voter = useVoterStore();

  const handleVerify = async () => {
    setError(null);

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
      const commitment = computeCommitment(nid.trim(), secret.trim());

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

      voter.setVoter({
        isAuthenticated: true,
        nid: nid.trim(),
        secret: secret.trim(),
        commitment,
        merkleProof: data.merkleProof,
        merklePathIndices: data.merklePathIndices,
      });

      router.push("/vote");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Verification failed"
      );
    } finally {
      setVerifying(false);
    }
  };

  if (voter.isAuthenticated) {
    router.push("/vote");
    return null;
  }

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
          <Lock className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">Verify Your Identity</h1>
        <p className="text-sm text-muted-foreground">
          Enter your details to start voting
        </p>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Your Details</CardTitle>
          <CardDescription>
            This information stays on your device
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
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="secret">Secret Pin</Label>
            <Input
              id="secret"
              type="password"
              placeholder="4–6 digit pin"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              disabled={verifying}
              maxLength={6}
              className="h-12 text-base"
            />
            <p className="text-[11px] text-muted-foreground">
              Choose a pin only you know. It keeps your vote private.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full h-12 text-base rounded-xl"
            size="lg"
          >
            {verifying ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying…
              </>
            ) : (
              "Continue"
            )}
          </Button>

          {/* Wallet connect — collapsed by default */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowWallet(!showWallet)}
              className="flex w-full items-center justify-between rounded-lg border border-border/50 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span>Advanced: Connect wallet</span>
              {showWallet ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
            {showWallet && (
              <div className="mt-2">
                <WalletConnect />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-border/30 bg-card/30 p-3 text-center">
        <p className="text-xs text-muted-foreground">
          🔒 Your ID and pin <strong>never leave your device</strong>.
          <br />
          They are only used to create a secure, anonymous vote.
        </p>
      </div>
    </div>
  );
}
