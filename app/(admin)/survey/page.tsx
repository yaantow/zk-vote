"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardList,
  CheckCircle2,
  RotateCcw,
  BarChart3,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  SUS questions (standard 10-item System Usability Scale)            */
/* ------------------------------------------------------------------ */

const SUS_QUESTIONS = [
  "I think that I would like to use this system frequently.",
  "I found the system unnecessarily complex.",
  "I thought the system was easy to use.",
  "I think that I would need the support of a technical person to be able to use this system.",
  "I found the various functions in this system were well integrated.",
  "I thought there was too much inconsistency in this system.",
  "I would imagine that most people would learn to use this system very quickly.",
  "I found the system very cumbersome to use.",
  "I felt very confident using the system.",
  "I needed to learn a lot of things before I could get going with this system.",
];

const SCALE_LABELS = [
  "Strongly Disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly Agree",
];

/* ------------------------------------------------------------------ */
/*  SUS scoring logic                                                  */
/* ------------------------------------------------------------------ */

/**
 * Calculate SUS score from responses (1-5 scale).
 * Odd questions (1,3,5,7,9): score = response - 1
 * Even questions (2,4,6,8,10): score = 5 - response
 * Total = sum * 2.5 → range 0-100
 */
function calculateSUSScore(responses: number[]): number {
  if (responses.length !== 10 || responses.some((r) => r < 1 || r > 5)) {
    return -1;
  }

  let total = 0;
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) {
      // Odd-numbered questions (0-indexed even): score = response - 1
      total += responses[i] - 1;
    } else {
      // Even-numbered questions (0-indexed odd): score = 5 - response
      total += 5 - responses[i];
    }
  }

  return total * 2.5;
}

function getSUSGrade(score: number): {
  grade: string;
  label: string;
  color: string;
} {
  if (score >= 84.1) return { grade: "A+", label: "Best Imaginable", color: "text-green-400" };
  if (score >= 80.8) return { grade: "A", label: "Excellent", color: "text-green-400" };
  if (score >= 71.4) return { grade: "B", label: "Good", color: "text-blue-400" };
  if (score >= 62.7) return { grade: "C", label: "OK", color: "text-yellow-400" };
  if (score >= 51.7) return { grade: "D", label: "Poor", color: "text-orange-400" };
  return { grade: "F", label: "Awful", color: "text-red-400" };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SurveyPage() {
  const [responses, setResponses] = useState<number[]>(
    new Array(10).fill(0)
  );
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const allAnswered = responses.every((r) => r >= 1 && r <= 5);

  const handleResponse = (questionIndex: number, value: number) => {
    const updated = [...responses];
    updated[questionIndex] = value;
    setResponses(updated);
  };

  const handleSubmit = async () => {
    const susScore = calculateSUSScore(responses);
    setScore(susScore);
    setSubmitted(true);

    const submission = {
      responses: [...responses],
      score: susScore,
      timestamp: new Date().toISOString(),
    };

    // POST to server — persists across devices
    try {
      await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submission),
      });
    } catch {
      // non-fatal — submission still counted in local state
    }
  };

  const handleReset = () => {
    setResponses(new Array(10).fill(0));
    setSubmitted(false);
    setScore(null);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <ClipboardList className="mx-auto h-10 w-10 text-primary" />
        <h1 className="text-2xl font-bold">System Usability Scale Survey</h1>
        <p className="text-sm text-muted-foreground">
          Rate your experience with the ZK-Vote Maldives voting system
        </p>
      </div>

      {/* Result Display */}
      {submitted && score !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Survey Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score display */}
            <div className="text-center">
              <div className="text-6xl font-bold tabular-nums">
                {score.toFixed(1)}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                out of 100
              </div>
            </div>

            {/* Grade */}
            <div className="text-center">
              <span
                className={`text-3xl font-bold ${getSUSGrade(score).color}`}
              >
                Grade: {getSUSGrade(score).grade}
              </span>
              <div className="text-sm text-muted-foreground">
                {getSUSGrade(score).label}
              </div>
            </div>

            {/* Score bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0</span>
                <span>25</span>
                <span>50</span>
                <span>68 (avg)</span>
                <span>100</span>
              </div>
              <div className="relative h-4 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(score, 100)}%` }}
                />
                {/* Average marker at 68 */}
                <div
                  className="absolute top-0 h-full border-l-2 border-dashed border-yellow-500"
                  style={{ left: "68%" }}
                />
              </div>
            </div>

            <Separator />

            {/* Interpretation */}
            <div className="rounded-lg border p-4 text-sm">
              <p className="font-medium">Interpretation:</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li>
                  &bull; A SUS score above <strong>68</strong> is considered above
                  average usability.
                </li>
                <li>
                  &bull; Score of <strong>80.3+</strong> puts a system in the top
                  10% of tested products.
                </li>
                <li>
                  &bull; Your score: <strong>{score.toFixed(1)}</strong> —{" "}
                  {score >= 68
                    ? "Above average usability!"
                    : "Below average — consider improvements."}
                </li>
              </ul>
            </div>

            <Button asChild className="w-full" size="lg">
              <Link href="/results">
                <BarChart3 className="mr-2 h-4 w-4" />
                View Election Results
              </Link>
            </Button>

            <Button onClick={handleReset} variant="outline" className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              New Response
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Survey Form */
        <div className="space-y-4">
          {SUS_QUESTIONS.map((question, qIndex) => (
            <Card key={qIndex}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  {qIndex + 1}. {question}
                </CardTitle>
                {qIndex % 2 === 1 && (
                  <CardDescription className="text-xs italic">
                    (Negatively worded)
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label
                      key={value}
                      className="flex cursor-pointer flex-col items-center gap-1"
                    >
                      <input
                        type="radio"
                        name={`q${qIndex}`}
                        value={value}
                        checked={responses[qIndex] === value}
                        onChange={() => handleResponse(qIndex, value)}
                        className="peer sr-only"
                      />
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground hover:border-primary/50">
                        {value}
                      </div>
                      <span className="hidden text-[10px] text-muted-foreground sm:block">
                        {SCALE_LABELS[value - 1]}
                      </span>
                    </label>
                  ))}
                </div>
                {/* Mobile labels */}
                <div className="mt-2 flex justify-between text-[10px] text-muted-foreground sm:hidden">
                  <span>Strongly Disagree</span>
                  <span>Strongly Agree</span>
                </div>
              </CardContent>
            </Card>
          ))}

          <Button
            onClick={handleSubmit}
            disabled={!allAnswered}
            className="w-full"
            size="lg"
          >
            {allAnswered
              ? "Submit Survey"
              : `Answer all questions (${responses.filter((r) => r > 0).length}/10)`}
          </Button>
        </div>
      )}
    </div>
  );
}
