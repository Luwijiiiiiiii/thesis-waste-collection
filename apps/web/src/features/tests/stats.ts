import { type RouteMetrics, TEST_GROUPS, type TestRunRecord, testGroupOf } from "@wcro/core";

export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Distance saved by one run, in percent (positive = optimized is shorter) */
export const savingPct = (r: TestRunRecord) =>
  r.traditional.distanceKm === 0
    ? 0
    : ((r.traditional.distanceKm - r.optimized.distanceKm) / r.traditional.distanceKm) * 100;

export interface Summary {
  count: number;
  avgPoints: number;
  traditional: RouteMetrics;
  optimized: RouteMetrics;
  /** Mean of each run's own distance saving (%) */
  avgSavingPct: number;
  bestSavingPct: number;
  worstSavingPct: number;
  avgOptimizedComputeMs: number;
}

const METRIC_KEYS: (keyof RouteMetrics)[] = ["distanceKm", "travelTimeMin", "fuelLiters", "fuelCostPhp", "co2Kg"];

const avgMetrics = (rows: RouteMetrics[]): RouteMetrics =>
  Object.fromEntries(METRIC_KEYS.map((k) => [k, mean(rows.map((m) => m[k]))])) as unknown as RouteMetrics;

export function summarize(records: TestRunRecord[]): Summary {
  const savings = records.map(savingPct);
  return {
    count: records.length,
    avgPoints: mean(records.map((r) => r.collectionPoints)),
    traditional: avgMetrics(records.map((r) => r.traditional)),
    optimized: avgMetrics(records.map((r) => r.optimized)),
    avgSavingPct: mean(savings),
    bestSavingPct: savings.length ? Math.max(...savings) : 0,
    worstSavingPct: savings.length ? Math.min(...savings) : 0,
    avgOptimizedComputeMs: mean(records.map((r) => r.optimizedComputeMs)),
  };
}

export function summarizeByGroup(records: TestRunRecord[]) {
  return TEST_GROUPS.map((g) => ({
    ...g,
    summary: summarize(records.filter((r) => testGroupOf(r.collectionPoints) === g.key)),
  }));
}
