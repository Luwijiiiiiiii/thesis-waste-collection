"use client";
import { useCallback, useRef, useState } from "react";
import {
  SIMULATION_STAGES,
  type SimulationEvent,
  type SimulationResult,
  type SimulationStage,
  type TspSolver,
} from "@wcro/core";

export type StageStatus = "pending" | "running" | "done" | "error";
export type StageState = Record<SimulationStage, { status: StageStatus; detail?: string }>;

const initialStages = (): StageState =>
  Object.fromEntries(SIMULATION_STAGES.map((s) => [s.key, { status: "pending" }])) as StageState;

/** Calls POST /api/simulate and consumes the NDJSON progress stream. */
export function useSimulation() {
  const [stages, setStages] = useState<StageState>(initialStages);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [error, setError] = useState<{ message: string; details?: string[] } | null>(null);
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStages(initialStages());
    setResult(null);
    setError(null);
    setRunning(false);
  }, []);

  const run = useCallback(async (routeFile: unknown, solver: TspSolver) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStages(initialStages());
    setResult(null);
    setError(null);
    setRunning(true);

    let lastStage: SimulationStage | undefined;
    const handle = (event: SimulationEvent) => {
      if (event.type === "stage") {
        lastStage = event.stage;
        setStages((s) => ({ ...s, [event.stage]: { status: event.status, detail: event.detail } }));
      } else if (event.type === "result") {
        setResult(event.result);
      } else {
        const stage = event.stage ?? lastStage;
        if (stage) setStages((s) => ({ ...s, [stage]: { status: "error", detail: event.message } }));
        setError({ message: event.message, details: event.details });
      }
    };

    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeFile, solver }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Server responded ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (line) handle(JSON.parse(line) as SimulationEvent);
        }
      }
      if (buffer.trim()) handle(JSON.parse(buffer) as SimulationEvent);
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError({ message: (err as Error).message });
    } finally {
      setRunning(false);
    }
  }, []);

  return { stages, result, error, running, run, reset };
}
