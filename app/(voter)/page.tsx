import Link from "next/link";
import { ArrowRight, ShieldCheck, Eye, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-10 py-12 text-center">
      {/* Flag + Hero */}
      <div className="max-w-md space-y-5">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-4xl">
          🇲🇻
        </div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Maldives eVote
        </h1>
        <p className="text-base text-muted-foreground leading-relaxed">
          Cast your vote securely and privately.
          <br />
          No one can see who you voted for — not even us.
        </p>
      </div>

      {/* Single prominent CTA */}
      <Button asChild size="lg" className="h-14 px-10 text-lg rounded-xl">
        <Link href="/auth">
          Start Voting
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </Button>

      {/* Trust signals — simple, non-technical */}
      <div className="grid w-full max-w-sm gap-4">
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4 text-left">
          <Lock className="h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-medium">Your vote is secret</p>
            <p className="text-xs text-muted-foreground">
              Nobody can link your identity to your vote
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4 text-left">
          <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
          <div>
            <p className="text-sm font-medium">Tamper-proof</p>
            <p className="text-xs text-muted-foreground">
              Every vote is mathematically verified
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/50 p-4 text-left">
          <Eye className="h-5 w-5 shrink-0 text-info" />
          <div>
            <p className="text-sm font-medium">Fully transparent</p>
            <p className="text-xs text-muted-foreground">
              Results are publicly verifiable by anyone
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
