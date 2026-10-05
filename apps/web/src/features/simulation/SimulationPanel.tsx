"use client";
import { SIMULATION_STAGES } from "@wcro/core";
import { AlertTriangle, ArrowRight, Check, Loader2, Play, Square } from "lucide-react";
import { Button } from "@/components/ui";
import type { StageState, StageStatus } from "./useSimulation";

function StageIcon({ status }: { status: StageStatus }) {
  if (status === "done")
    return (
      <span
        className="grid size-5 place-items-center rounded-full bg-optimized-solid text-white"
        role="img"
        aria-label="Done"
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    );
  if (status === "running") return <Loader2 className="size-5 animate-spin text-brand-ink" aria-label="In progress" />;
  if (status === "error")
    return (
      <span
        className="grid size-5 place-items-center rounded-full bg-danger text-canvas"
        role="img"
        aria-label="Failed"
      >
        <AlertTriangle className="size-3" strokeWidth={3} />
      </span>
    );
  return <span className="block size-5 rounded-full border-2 border-line-strong" role="img" aria-label="Waiting" />;
}

export function SimulationPanel({
  canRun,
  running,
  hasResult,
  onRun,
  onCancel,
  onViewResults,
  stages,
  error,
  disabledHint = "Fix the validation errors above to enable the simulation.",
}: {
  canRun: boolean;
  running: boolean;
  hasResult: boolean;
  onRun: () => void;
  onCancel: () => void;
  onViewResults: () => void;
  stages: StageState;
  error: { message: string; details?: string[] } | null;
  disabledHint?: string;
}) {
  const total = SIMULATION_STAGES.length;
  const done = SIMULATION_STAGES.filter((s) => stages[s.key].status === "done").length;
  const started = running || error !== null || done > 0;
  const percent = Math.round((done / total) * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-brand bg-brand-soft px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">Algorithm</p>
        <p className="mt-0.5 text-lg font-semibold leading-6">A* shortest path</p>
        <p className="mt-1 text-xs leading-5 text-muted">
          Finds the shortest drivable road between stops on the OpenStreetMap network.
        </p>
      </div>

      {running ? (
        <Button variant="secondary" size="lg" className="w-full" onClick={onCancel}>
          <Square className="size-4" aria-hidden />
          Cancel run
        </Button>
      ) : (
        <Button variant="primary" size="lg" className="w-full" disabled={!canRun} onClick={onRun}>
          <Play className="size-4" aria-hidden />
          {error ? "Run again" : hasResult ? "Run again" : "Run simulation"}
        </Button>
      )}
      {!canRun && !running && <p className="text-center text-xs text-muted">{disabledHint}</p>}
      {hasResult && !running && (
        <Button variant="secondary" size="md" className="w-full" onClick={onViewResults}>
          View latest results
          <ArrowRight className="size-4" aria-hidden />
        </Button>
      )}

      {started && (
        <div className="animate-fade rounded-xl border border-line p-4" aria-live="polite">
          <div className="mb-3 flex items-baseline justify-between text-sm">
            <span className="font-medium">{running ? "Running simulation" : error ? "Stopped" : "Finished"}</span>
            <span className="num text-muted">
              {done}/{total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Simulation progress"
            className="h-1.5 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${error ? "bg-danger" : "bg-brand"}`}
              style={{ width: `${Math.max(percent, running ? 6 : 0)}%` }}
            />
          </div>

          <ol className="mt-4 space-y-3">
            {SIMULATION_STAGES.map((s) => {
              const st = stages[s.key];
              return (
                <li key={s.key} className="flex gap-3">
                  <span className="mt-0.5 shrink-0">
                    <StageIcon status={st.status} />
                  </span>
                  <div className="min-w-0">
                    <p className={`text-sm leading-5 ${st.status === "pending" ? "text-muted" : "font-medium"}`}>
                      {s.label}
                    </p>
                    {st.detail && (
                      <p className={`text-xs leading-5 ${st.status === "error" ? "text-danger" : "text-muted"}`}>
                        {st.detail}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {running && stages.network.status === "running" && (
            <p className="mt-4 rounded-lg bg-brand-soft px-3 py-2 text-xs leading-5 text-brand-ink">
              First run: downloading Baguio&apos;s road network from OpenStreetMap (up to a minute). It is cached for
              next time.
            </p>
          )}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-danger/40 bg-danger-soft p-3.5 text-sm text-danger">
          <p className="flex items-start gap-2 font-medium">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {error.message}
          </p>
          {error.details && error.details.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-9 text-xs leading-5">
              {error.details.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
