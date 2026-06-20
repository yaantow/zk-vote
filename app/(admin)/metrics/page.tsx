"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";

interface PerformanceMetric {
  id: string;
  category: string;
  label: string;
  durationMs: number;
  timestamp: string;
  metadata?: Record<string, string | number | boolean>;
}

interface CategoryStats {
  category: string;
  count: number;
  mean: number;
  median: number;
  p95: number;
  stddev: number;
  metrics: PerformanceMetric[];
}

interface MetricsData {
  total: number;
  grouped: CategoryStats[];
}

export default function MetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/metrics");
      if (res.ok) setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleExportCSV = () => {
    if (!data) return;
    const allMetrics = data.grouped.flatMap((g) => g.metrics);
    const header = ["ID", "Category", "Label", "Duration (ms)", "Timestamp"].join(",");
    const rows = allMetrics.map((m) =>
      [m.id, m.category, `"${m.label}"`, m.durationMs, m.timestamp].join(",")
    );
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" className="h-8 w-8">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold">Performance Metrics</h1>
            <p className="text-xs text-muted-foreground">ZKP timing data collected from voters</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={!data || data.total === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      {data && data.total > 0 && (
        <Card>
          <CardContent className="py-3">
            <span className="text-sm text-muted-foreground">
              <strong className="text-foreground">{data.total}</strong> total measurements across{" "}
              <strong className="text-foreground">{data.grouped.length}</strong> categories
            </span>
          </CardContent>
        </Card>
      )}

      {/* Per-category stat cards */}
      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : !data || data.total === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">No metrics recorded yet.</div>
      ) : (
        <div className="space-y-4">
          {data.grouped.map((g) => (
            <Card key={g.category}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">{g.category}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Stat pills */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {[
                    { label: "Count", value: g.count },
                    { label: "Mean", value: `${g.mean} ms` },
                    { label: "Median", value: `${g.median} ms` },
                    { label: "P95", value: `${g.p95} ms` },
                    { label: "StdDev", value: `${g.stddev} ms` },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-md border bg-muted/30 px-2.5 py-1">
                      <span className="text-muted-foreground">{label}: </span>
                      <span className="font-medium">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Individual measurements */}
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1.5 text-left font-medium">Label</th>
                        <th className="py-1.5 pr-4 text-right font-medium">Duration</th>
                        <th className="py-1.5 text-right font-medium">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.metrics.map((m) => (
                        <tr key={m.id} className="border-b last:border-0">
                          <td className="py-1.5 text-muted-foreground">{m.label}</td>
                          <td className="py-1.5 pr-4 text-right font-mono">{m.durationMs} ms</td>
                          <td className="py-1.5 text-right text-muted-foreground whitespace-nowrap">
                            {new Date(m.timestamp).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
