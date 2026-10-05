"use client";
import { MIN_DRAFT_STOPS, type DraftAction, type DraftState, type ValidationReport } from "@wcro/core";
import { Eraser, RotateCcw, X } from "lucide-react";
import { Button, Card, CardBody, PageHeader } from "@/components/ui";
import { SimulationPanel } from "@/features/simulation/SimulationPanel";
import type { StageState } from "@/features/simulation/useSimulation";
import { ValidationReportCard } from "@/features/validation/ValidationReportCard";
import { DrawMapLoader } from "./DrawMapLoader";
import { StopList } from "./StopList";

export interface DrawScreenProps {
  state: DraftState;
  onAction: (a: DraftAction) => void;
  report: ValidationReport | null;
  running: boolean;
  hasResult: boolean;
  onRun: () => void;
  onCancel: () => void;
  onViewResults: () => void;
  stages: StageState;
  error: { message: string; details?: string[] } | null;
  onStartOver: () => void;
}

export function DrawScreen(props: DrawScreenProps) {
  const { state, onAction, report, running } = props;
  const { draft, notice } = state;
  const stopCount = draft.stops.length;
  const enoughStops = stopCount >= MIN_DRAFT_STOPS;
  const canRun = enoughStops && Boolean(report?.passed);
  const hint = !draft.garage
    ? "Tap the map to place the garage."
    : !enoughStops
      ? `Add at least ${MIN_DRAFT_STOPS} stops (${stopCount} so far).`
      : "Fix the validation errors above to enable the simulation.";

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Draw on map"
        title="Draw your route"
        description="Tap the map to place the garage, then tap to add collection points. The truck starts and ends at the garage."
        actions={
          <Button onClick={props.onStartOver} disabled={running}>
            <X className="size-4" aria-hidden />
            Start over
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* `inert` blocks every interaction while a run is in progress */}
        <Card className="min-w-0">
          <CardBody>
            <div inert={running}>
              <DrawMapLoader draft={draft} onAction={onAction} />
            </div>
            <p role="status" className={`mt-2 min-h-5 text-sm ${notice ? "font-medium text-danger" : "text-muted"}`}>
              {notice ?? "Tap to add a point. Drag a marker to adjust it. Select a marker to delete it."}
            </p>
          </CardBody>
        </Card>

        <Card className="min-w-0 lg:sticky lg:top-6">
          <CardBody className="space-y-4">
            <div inert={running} className="space-y-4">
              <div>
                <label htmlFor="route-name" className="text-sm font-medium">
                  Route name
                </label>
                <input
                  id="route-name"
                  type="text"
                  value={draft.routeName}
                  maxLength={80}
                  onChange={(e) => onAction({ type: "rename", name: e.target.value })}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">
                    Stops <span className="num text-muted">({stopCount})</span>
                  </h2>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={state.history.length === 0} onClick={() => onAction({ type: "undo" })}>
                      <RotateCcw className="size-4" aria-hidden />
                      Undo
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!draft.garage && stopCount === 0} onClick={() => onAction({ type: "clear" })}>
                      <Eraser className="size-4" aria-hidden />
                      Clear all
                    </Button>
                  </div>
                </div>
                <StopList draft={draft} onAction={onAction} />
                <p className="mt-2 text-xs leading-5 text-muted">
                  The order here is the traditional route&apos;s visiting order. Use the arrows to change it.
                </p>
              </div>
            </div>

            {enoughStops && report && <ValidationReportCard report={report} />}

            <SimulationPanel
              canRun={canRun}
              running={running}
              hasResult={props.hasResult}
              onRun={props.onRun}
              onCancel={props.onCancel}
              onViewResults={props.onViewResults}
              stages={props.stages}
              error={props.error}
              disabledHint={hint}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
