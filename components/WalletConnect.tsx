"use client";

import { useState } from "react";
import { Wallet, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { connectWallet, isWalletAvailable } from "@/lib/blockchain/provider";
import { useVoterStore } from "@/lib/store/voter-store";

export function WalletConnect() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletAddress = useVoterStore((s) => s.walletAddress);
  const setVoter = useVoterStore((s) => s.setVoter);

  const handleConnect = async () => {
    setError(null);
    setLoading(true);
    try {
      if (!isWalletAvailable()) {
        throw new Error(
          "MetaMask not detected. Please install the MetaMask browser extension."
        );
      }
      const { address } = await connectWallet();
      setVoter({ walletAddress: address });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  };

  if (walletAddress) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
        <CheckCircle2 className="h-4 w-4 text-success" />
        <div className="text-sm">
          <p className="font-medium text-foreground">Wallet Connected</p>
          <p className="font-mono text-xs text-muted-foreground">
            {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleConnect}
        disabled={loading}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Wallet className="mr-2 h-4 w-4" />
        )}
        {loading ? "Connecting…" : "Connect MetaMask"}
      </Button>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
