"use client";
import { DEFAULT_TSP_SOLVER } from "@wcro/core";
import { useCallback, useRef, useState } from "react";
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
}

const idle: TestAllState = {
  running: false,
  total: 0,
  done: 0,
  current: null,
  failures: [],
  cancelled: false,
  fatal: null,
};

/** How often (in finished tests) the dashboard reloads its numbers while "Test all" is running */
const REFRESH_EVERY = 5;

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
          const outcome = await runTestSimulation(routeFile, DEFAULT_TSP_SOLVER, controller.signal);
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
      setState((s) => ({ ...s, running: false, current: null }));
      onSavedRef.current();
    }
  }, []);

  return { state, start, cancel, reset };
}
