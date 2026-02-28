"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Vote, LogOut } from "lucide-react";
import { NetworkStatus } from "@/components/NetworkStatus";
import { useVoterStore } from "@/lib/store/voter-store";
import { useProofStore } from "@/lib/store/proof-store";
import { cn } from "@/lib/utils";

const STEPS = [
  { path: "/auth", label: "Verify ID", number: 1 },
  { path: "/vote", label: "Cast Vote", number: 2 },
  { path: "/vote/confirm", label: "Confirm", number: 3 },
  { path: "/results", label: "Results", number: 4 },
];

function VoterStepper() {
  const pathname = usePathname();

  // Don't show stepper on landing page
  if (pathname === "/") return null;

  const currentStepIndex = STEPS.findIndex((s) => pathname.startsWith(s.path));

  return (
    <div className="mx-auto flex max-w-md items-center justify-center gap-1 px-4 py-3">
      {STEPS.map((step, i) => {
        const isActive = i === currentStepIndex;
        const isCompleted = i < currentStepIndex;

        return (
          <div key={step.path} className="flex items-center">
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                  isActive && "bg-primary text-primary-foreground scale-110",
                  isCompleted && "bg-success text-success-foreground",
                  !isActive && !isCompleted && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? "✓" : step.number}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  isActive && "text-primary",
                  isCompleted && "text-success",
                  !isActive && !isCompleted && "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  "mx-1.5 h-0.5 w-8 rounded-full sm:w-12",
                  isCompleted ? "bg-success" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function LogoutButton() {
  const router = useRouter();
  const voterReset = useVoterStore((s) => s.reset);
  const proofReset = useProofStore((s) => s.reset);
  const isAuthenticated = useVoterStore((s) => s.isAuthenticated);

  if (!isAuthenticated) return null;

  const handleLogout = () => {
    voterReset();
    proofReset();
    router.push("/");
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
      title="Log out"
    >
      <LogOut className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Log out</span>
    </button>
  );
}

export default function VoterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Minimal top bar */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-foreground"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Vote className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm">Maldives eVote</span>
          </Link>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <NetworkStatus />
          </div>
        </div>
      </header>

      {/* Step indicator */}
      <VoterStepper />

      {/* Main content — generous padding, centered */}
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {children}
      </main>

      {/* Simple footer */}
      <footer className="border-t border-border/30 py-4 text-center text-xs text-muted-foreground">
        <p>Your vote is private and secure</p>
      </footer>
    </div>
  );
}
