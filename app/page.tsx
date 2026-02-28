import Link from "next/link";
import { Vote, BarChart3, Shield, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const steps = [
  {
    number: "1",
    title: "Authenticate",
    description: "Verify your voter ID against the registry",
  },
  {
    number: "2",
    title: "Select",
    description: "Choose your candidate on a private ballot",
  },
  {
    number: "3",
    title: "Prove",
    description:
      "A cryptographic proof is created on YOUR device — your vote stays private",
  },
  {
    number: "4",
    title: "Verify",
    description:
      "The proof is verified on-chain — publicly auditable, yet anonymous",
  },
];

export default function HomePage() {
  return (
    <div className="flex flex-col items-center gap-12 py-8 text-center">
      {/* Hero */}
      <div className="max-w-2xl space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
          <Vote className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          ZK-Vote Maldives
        </h1>
        <p className="text-lg text-muted-foreground">
          Decentralized, Privacy-Preserving E-Voting for the Maldives.
          <br />
          Powered by zero-knowledge proofs and blockchain technology.
        </p>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/auth">
            Start Voting
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/results">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Results
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/audit">
            <Shield className="mr-2 h-4 w-4" />
            Audit Election
          </Link>
        </Button>
      </div>

      <Separator className="max-w-md" />

      {/* How It Works */}
      <div className="w-full max-w-3xl space-y-6">
        <h2 className="text-2xl font-semibold">How It Works</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step) => (
            <Card key={step.number} className="text-left">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {step.number}
                  </div>
                  <CardTitle className="text-base">{step.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{step.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
