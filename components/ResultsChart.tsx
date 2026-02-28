"use client";

interface CandidateResult {
  name: string;
  tally: number;
}

interface ResultsChartProps {
  candidates: CandidateResult[];
  totalVotes: number;
}

export function ResultsChart({ candidates, totalVotes }: ResultsChartProps) {
  const maxTally = Math.max(...candidates.map((c) => c.tally), 1);

  return (
    <div className="space-y-4">
      {candidates.map((candidate, i) => {
        const pct =
          totalVotes > 0
            ? ((candidate.tally / totalVotes) * 100).toFixed(1)
            : "0.0";
        const barWidth =
          maxTally > 0
            ? `${(candidate.tally / maxTally) * 100}%`
            : "0%";

        return (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{candidate.name}</span>
              <span className="text-muted-foreground">
                {candidate.tally} votes ({pct}%)
              </span>
            </div>
            <div className="h-8 w-full overflow-hidden rounded-md bg-muted">
              <div
                className="flex h-full items-center rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground transition-all duration-500"
                style={{ width: barWidth }}
              >
                {candidate.tally > 0 && candidate.tally}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
