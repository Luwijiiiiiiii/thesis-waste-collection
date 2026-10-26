"use client";
import { DEFAULT_TSP_SOLVER } from "@wcro/core";
import { useCallback, useRef, useState } from "react";
import { dismissRateLimit, reportRateLimit } from "@/lib/rate-limit";
import { loadManifest, loadTestFile, runTestSimulation } from "./runTest";

export interface TestAllState {
  running: boolean;
  total: number;
  done: number;
  /** Name of the test being run right now */
  current: string | null;
  failures: { file: string; message: string }[];
  cancelled: boolean;
  /** Set when the file list itself could not be loaded */
  fatal: string | null;
  /** When paused by the API rate limit: the time (ms since epoch) the current test is sent again */
  resumeAt: number | null;
}

const idle: TestAllState = {
  running: false,
  total: 0,
  done: 0,
  current: null,
  failures: [],
  cancelled: false,
  fatal: null,
  resumeAt: null,
};

/** How often (in finished tests) the dashboard reloads its numbers while "Test all" is running */
const REFRESH_EVERY = 5;
/** How many times one test waits out the API rate limit before it is counted as failed */
const MAX_RATE_LIMIT_WAITS = 5;

/** Resolves after `ms`, or rejects with an AbortError as soon as `signal` aborts */
function wait(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, ms);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
}

/**
 * Runs every bundled test route one after another through the API. Each run is a normal simulation that is
 * archived (flagged as a test), so it shows up in History. `onSaved` is called as results accumulate.
 */
export function useTestAll(onSaved: () => void) {
  const [state, setState] = useState<TestAllState>(idle);
  const abortRef = useRef<AbortController | null>(null);
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const cancel = useCallback(() => abortRef.current?.abort(), []);
  /** Hides the last run's progress and failures, e.g. after the test data was cleared */
  const reset = useCallback(() => setState((s) => (s.running ? s : idle)), []);

  const start = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ ...idle, running: true });

    try {
      const manifest = await loadManifest(controller.signal);
      setState((s) => ({ ...s, total: manifest.length }));

      for (let i = 0; i < manifest.length; i++) {
        const entry = manifest[i];
        setState((s) => ({ ...s, current: entry.name }));
        try {
          const routeFile = await loadTestFile(entry.file, controller.signal);
          let outcome = await runTestSimulation(routeFile, DEFAULT_TSP_SOLVER, controller.signal);
          // Rate limited: pause until the API's window resets, then send the same test again
          for (let waits = 0; !outcome.ok && outcome.retryAfterSeconds && waits < MAX_RATE_LIMIT_WAITS; waits++) {
            const seconds = outcome.retryAfterSeconds + 1;
            setState((s) => ({ ...s, resumeAt: Date.now() + seconds * 1000 }));
            reportRateLimit(seconds, {
              note: `Testing is paused at test ${i + 1} of ${manifest.length} and continues on its own when the wait is over.`,
              action: { label: "Stop testing", run: () => controller.abort() },
            });
            try {
              await wait(seconds * 1000, controller.signal);
            } finally {
              dismissRateLimit();
            }
            setState((s) => ({ ...s, resumeAt: null }));
            outcome = await runTestSimulation(routeFile, DEFAULT_TSP_SOLVER, controller.signal);
          }
          if (!outcome.ok) {
            setState((s) => ({ ...s, failures: [...s.failures, { file: entry.file, message: outcome.message }] }));
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") throw err;
          setState((s) => ({
            ...s,
            failures: [...s.failures, { file: entry.file, message: (err as Error).message }],
          }));
        }
        setState((s) => ({ ...s, done: i + 1 }));
        if ((i + 1) % REFRESH_EVERY === 0) onSavedRef.current();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        setState((s) => ({ ...s, cancelled: true }));
      } else {
        setState((s) => ({ ...s, fatal: (err as Error).message }));
      }
    } finally {
      setState((s) => ({ ...s, running: false, current: null, resumeAt: null }));
      onSavedRef.current();
    }
  }, []);

  return { state, start, cancel, reset };
}
