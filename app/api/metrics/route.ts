import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "performance-metrics.jsonl");

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

function computeStats(durations: number[]) {
  const sorted = [...durations].sort((a, b) => a - b);
  const count = sorted.length;
  const mean = sorted.reduce((a, b) => a + b, 0) / count;
  const median =
    count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];
  const p95 = sorted[Math.min(Math.ceil(count * 0.95) - 1, count - 1)];
  const variance = sorted.reduce((acc, d) => acc + (d - mean) ** 2, 0) / count;
  const stddev = Math.sqrt(variance);
  return {
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    p95: Math.round(p95 * 100) / 100,
    stddev: Math.round(stddev * 100) / 100,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const metrics: PerformanceMetric[] = Array.isArray(body) ? body : body.metrics ?? [];

    if (metrics.length === 0) {
      return NextResponse.json({ ok: true, written: 0 });
    }

    const lines = metrics.map((m) => JSON.stringify(m)).join("\n") + "\n";
    await fs.appendFile(DATA_FILE, lines, "utf8");

    return NextResponse.json({ ok: true, written: metrics.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save metrics" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    let content = "";
    try {
      content = await fs.readFile(DATA_FILE, "utf8");
    } catch {
      // file doesn't exist yet
    }

    const metrics: PerformanceMetric[] = content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    // Group by category
    const groups = new Map<string, PerformanceMetric[]>();
    for (const m of metrics) {
      const list = groups.get(m.category) ?? [];
      list.push(m);
      groups.set(m.category, list);
    }

    const grouped: CategoryStats[] = Array.from(groups.entries()).map(([category, items]) => {
      const durations = items.map((m) => m.durationMs);
      return {
        category,
        count: items.length,
        ...computeStats(durations),
        metrics: items,
      };
    });

    return NextResponse.json({ total: metrics.length, grouped });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read metrics" },
      { status: 500 }
    );
  }
}
