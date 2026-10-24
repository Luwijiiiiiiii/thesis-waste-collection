import type { SimulationLogEntry } from "@wcro/core";

/**
 * Test runs saved less than this long after the previous one belong to the same "Test all" run.
 * One test is a single simulation, so the gap between two tests of one batch is about one run (seconds,
 * longer after an API cold start).
 */
const BATCH_GAP_MS = 3 * 60 * 1000;

export type HistoryItem =
  | { kind: "run"; run: SimulationLogEntry }
  | { kind: "tests"; id: string; runs: SimulationLogEntry[] };

/**
 * Folds consecutive test runs of the History list (newest first) into one entry per "Test all" run.
 * Normal simulations stay as they are.
 */
export function groupHistory(sims: SimulationLogEntry[]): HistoryItem[] {
  const items: HistoryItem[] = [];
  for (const run of sims) {
    if (!run.isTest) {
      items.push({ kind: "run", run });
      continue;
    }
    const last = items[items.length - 1];
    if (last?.kind === "tests") {
      const oldest = last.runs[last.runs.length - 1];
      if (new Date(oldest.createdAt).getTime() - new Date(run.createdAt).getTime() <= BATCH_GAP_MS) {
        last.runs.push(run);
        continue;
      }
    }
    items.push({ kind: "tests", id: run.id, runs: [run] });
  }
  return items;
}
