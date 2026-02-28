"use client";

import {
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProofStatus as ProofStatusType } from "@/lib/store/proof-store";

interface Step {
  key: ProofStatusType;
  label: string;
}

const STEPS: Step[] = [
  { key: "initializing", label: "Loading ZoKrates" },
  { key: "computing", label: "Computing witness" },
  { key: "proving", label: "Generating proof" },
  { key: "submitting", label: "Submitting to blockchain" },
];

interface ProofStatusProps {
  currentStatus: ProofStatusType;
  error?: string | null;
}

export function ProofStatus({ currentStatus, error }: ProofStatusProps) {
  const statusOrder: ProofStatusType[] = [
    "initializing",
    "computing",
    "proving",
    "submitting",
    "done",
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);

  return (
    <div className="space-y-3">
      {STEPS.map((step, i) => {
        const stepIndex = statusOrder.indexOf(step.key);
        const isCompleted = currentIndex > stepIndex;
        const isCurrent = currentStatus === step.key;
        const isError = currentStatus === "error" && isCurrent;
        const isPending = currentIndex < stepIndex;

        return (
          <div key={step.key} className="flex items-center gap-3">
            {isCompleted ? (
              <CheckCircle2 className="h-5 w-5 text-success" />
            ) : isCurrent && !isError ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : isError ? (
              <AlertCircle className="h-5 w-5 text-destructive" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                isCompleted && "text-success",
                isCurrent && !isError && "text-foreground",
                isError && "text-destructive",
                isPending && "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
      {error && (
        <p className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
