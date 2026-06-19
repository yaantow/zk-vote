"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";

type Submission = { responses: number[]; score: number; timestamp: string };

function getSUSGrade(score: number) {
  if (score >= 84.1) return { grade: "A+", label: "Best Imaginable", color: "text-green-400" };
  if (score >= 80.8) return { grade: "A", label: "Excellent", color: "text-green-400" };
  if (score >= 71.4) return { grade: "B", label: "Good", color: "text-blue-400" };
  if (score >= 62.7) return { grade: "C", label: "OK", color: "text-yellow-400" };
  if (score >= 51.7) return { grade: "D", label: "Poor", color: "text-orange-400" };
  return { grade: "F", label: "Awful", color: "text-red-400" };
}

export default function SurveyResultsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [average, setAverage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/survey");
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data.submissions ?? []);
        setAverage(data.average ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResults(); }, []);

  const handleExportCSV = () => {
    if (submissions.length === 0) return;
    const header = ["Timestamp", ...Array.from({ length: 10 }, (_, i) => `Q${i + 1}`), "SUS Score", "Grade"].join(",");
    const rows = submissions.map((r) => {
      const { grade } = getSUSGrade(r.score);
      return [r.timestamp, ...r.responses, r.score.toFixed(1), grade].join(",");
    });
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sus-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">Survey Results</h1>
            <p className="text-xs text-muted-foreground">SUS responses from voters</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchResults} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={submissions.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      {submissions.length > 0 && average !== null && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold">{submissions.length}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Responses</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className="text-3xl font-bold">{average.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground mt-1">Average Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-4 text-center">
              <div className={`text-3xl font-bold ${getSUSGrade(average).color}`}>
                {getSUSGrade(average).grade}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{getSUSGrade(average).label}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Individual Responses</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : submissions.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No submissions yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">#</th>
                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Timestamp</th>
                    {Array.from({ length: 10 }, (_, i) => (
                      <th key={i} className="px-2 py-2 text-center font-medium text-muted-foreground">Q{i + 1}</th>
                    ))}
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Score</th>
                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((s, i) => {
                    const { grade, color } = getSUSGrade(s.score);
                    return (
                      <tr key={i} className="border-b last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                          {new Date(s.timestamp).toLocaleString()}
                        </td>
                        {s.responses.map((r, j) => (
                          <td key={j} className="px-2 py-2 text-center">{r}</td>
                        ))}
                        <td className="px-4 py-2 text-center font-medium">{s.score.toFixed(1)}</td>
                        <td className={`px-4 py-2 text-center font-bold ${color}`}>{grade}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
