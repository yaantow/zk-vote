/**
 * Performance metrics collection for ZK-Vote Maldives.
 *
 * Measures key performance indicators:
 * - ZKP proof generation time
 * - Transaction submission time
 * - Page load times
 * - Offline queue latency
 *
 * Results are stored in localStorage and can be exported as CSV
 * from the survey/metrics page.
 */

const METRICS_KEY = "zk-vote-performance-metrics";

export interface PerformanceMetric {
  /** Unique ID */
  id: string;
  /** Metric category */
  category:
    | "zkp-init"
    | "zkp-witness"
    | "zkp-proof"
    | "zkp-total"
    | "tx-submit"
    | "tx-confirm"
    | "page-load"
    | "api-call"
    | "offline-queue"
    | "custom";
  /** Human-readable label */
  label: string;
  /** Duration in milliseconds */
  durationMs: number;
  /** ISO timestamp */
  timestamp: string;
  /** Optional metadata */
  metadata?: Record<string, string | number | boolean>;
}

/* ------------------------------------------------------------------ */
/*  Timer helper                                                       */
/* ------------------------------------------------------------------ */

export class PerfTimer {
  private startTime: number = 0;
  private category: PerformanceMetric["category"];
  private label: string;
  private metadata?: Record<string, string | number | boolean>;

  constructor(
    category: PerformanceMetric["category"],
    label: string,
    metadata?: Record<string, string | number | boolean>
  ) {
    this.category = category;
    this.label = label;
    this.metadata = metadata;
  }

  /** Start the timer. */
  start(): this {
    this.startTime = performance.now();
    return this;
  }

  /** Stop the timer and record the metric. Returns the duration in ms. */
  stop(): number {
    const duration = performance.now() - this.startTime;
    recordMetric({
      id: crypto.randomUUID(),
      category: this.category,
      label: this.label,
      durationMs: Math.round(duration * 100) / 100,
      timestamp: new Date().toISOString(),
      metadata: this.metadata,
    });
    return duration;
  }
}

/* ------------------------------------------------------------------ */
/*  Convenience factory                                                */
/* ------------------------------------------------------------------ */

/**
 * Create and start a performance timer.
 *
 * @example
 * const timer = startTimer("zkp-proof", "Groth16 proof generation");
 * await generateProof(input);
 * const ms = timer.stop(); // records metric automatically
 */
export function startTimer(
  category: PerformanceMetric["category"],
  label: string,
  metadata?: Record<string, string | number | boolean>
): PerfTimer {
  return new PerfTimer(category, label, metadata).start();
}

/**
 * Measure an async function's execution time.
 *
 * @example
 * const result = await measureAsync("zkp-init", "ZoKrates init", async () => {
 *   return await getZoKratesProvider();
 * });
 */
export async function measureAsync<T>(
  category: PerformanceMetric["category"],
  label: string,
  fn: () => Promise<T>,
  metadata?: Record<string, string | number | boolean>
): Promise<{ result: T; durationMs: number }> {
  const timer = startTimer(category, label, metadata);
  const result = await fn();
  const durationMs = timer.stop();
  return { result, durationMs };
}

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

/** Record a single metric to localStorage. */
export function recordMetric(metric: PerformanceMetric): void {
  try {
    const stored = localStorage.getItem(METRICS_KEY);
    const metrics: PerformanceMetric[] = stored ? JSON.parse(stored) : [];
    metrics.push(metric);
    localStorage.setItem(METRICS_KEY, JSON.stringify(metrics));
  } catch {
    // localStorage unavailable or full — silently ignore
    console.warn("[perf] Failed to store metric:", metric.label);
  }
}

/** Get all recorded metrics. */
export function getAllMetrics(): PerformanceMetric[] {
  try {
    const stored = localStorage.getItem(METRICS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/** Get metrics filtered by category. */
export function getMetricsByCategory(
  category: PerformanceMetric["category"]
): PerformanceMetric[] {
  return getAllMetrics().filter((m) => m.category === category);
}

/** Clear all recorded metrics. */
export function clearMetrics(): void {
  try {
    localStorage.removeItem(METRICS_KEY);
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Statistics                                                         */
/* ------------------------------------------------------------------ */

export interface MetricStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  stdDev: number;
}

/** Calculate statistics for a set of metrics. */
export function calculateStats(metrics: PerformanceMetric[]): MetricStats {
  if (metrics.length === 0) {
    return { count: 0, min: 0, max: 0, mean: 0, median: 0, p95: 0, stdDev: 0 };
  }

  const durations = metrics.map((m) => m.durationMs).sort((a, b) => a - b);
  const count = durations.length;
  const sum = durations.reduce((a, b) => a + b, 0);
  const mean = sum / count;

  const median =
    count % 2 === 0
      ? (durations[count / 2 - 1] + durations[count / 2]) / 2
      : durations[Math.floor(count / 2)];

  const p95Index = Math.ceil(count * 0.95) - 1;
  const p95 = durations[Math.min(p95Index, count - 1)];

  const variance =
    durations.reduce((acc, d) => acc + (d - mean) ** 2, 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    min: durations[0],
    max: durations[count - 1],
    mean: Math.round(mean * 100) / 100,
    median: Math.round(median * 100) / 100,
    p95: Math.round(p95 * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
  };
}

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

/** Export all metrics as a CSV string. */
export function exportMetricsCSV(): string {
  const metrics = getAllMetrics();

  const header = [
    "ID",
    "Category",
    "Label",
    "Duration (ms)",
    "Timestamp",
    "Metadata",
  ].join(",");

  const rows = metrics.map((m) =>
    [
      m.id,
      m.category,
      `"${m.label}"`,
      m.durationMs,
      m.timestamp,
      m.metadata ? `"${JSON.stringify(m.metadata).replace(/"/g, '""')}"` : "",
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

/** Generate a summary report grouped by category. */
export function generateReport(): string {
  const metrics = getAllMetrics();
  const categories = [...new Set(metrics.map((m) => m.category))];

  let report = "ZK-Vote Maldives — Performance Report\n";
  report += `Generated: ${new Date().toISOString()}\n`;
  report += `Total metrics: ${metrics.length}\n`;
  report += "=".repeat(60) + "\n\n";

  for (const cat of categories) {
    const catMetrics = metrics.filter((m) => m.category === cat);
    const stats = calculateStats(catMetrics);

    report += `Category: ${cat}\n`;
    report += "-".repeat(40) + "\n";
    report += `  Count:  ${stats.count}\n`;
    report += `  Min:    ${stats.min.toFixed(2)} ms\n`;
    report += `  Max:    ${stats.max.toFixed(2)} ms\n`;
    report += `  Mean:   ${stats.mean.toFixed(2)} ms\n`;
    report += `  Median: ${stats.median.toFixed(2)} ms\n`;
    report += `  P95:    ${stats.p95.toFixed(2)} ms\n`;
    report += `  StdDev: ${stats.stdDev.toFixed(2)} ms\n`;
    report += "\n";
  }

  return report;
}
