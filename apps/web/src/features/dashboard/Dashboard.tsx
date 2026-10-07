"use client";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  applyRouteDetails,
  applyStopInfo,
  buildRouteFileFromDraft,
  DEFAULT_TSP_SOLVER,
  draftReducer,
  initialDraftState,
  validateRouteFile,
  validateRouteFileText,
  type DraftAction,
  type RouteFile,
  type SimulationLogEntry,
} from "@wcro/core";
import {
  ArrowLeft,
  Download,
  FileWarning,
  ListChecks,
  Map as MapIcon,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Tabs } from "@/components/Tabs";
import { ScreenTour } from "@/components/Tour";
import { Badge, buttonClasses, Button, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { ConfigPanel } from "@/features/config/ConfigPanel";
import { StopsPreviewMapLoader } from "@/features/dataset/StopsPreviewMapLoader";
import { DrawScreen } from "@/features/draw/DrawScreen";
import { RouteDetailsForm, StopsEditorTable } from "@/features/edit/RouteEditors";
import { ResultsView } from "@/features/results/ResultsView";
import { SimulationPanel } from "@/features/simulation/SimulationPanel";
import { useSimulation } from "@/features/simulation/useSimulation";
import { reviewInvalidTour, reviewTour } from "@/features/onboarding/tours";
import { LoadedFile, SAMPLE_URL } from "@/features/upload/RouteFileInput";
import { ValidationReportCard } from "@/features/validation/ValidationReportCard";
import { Landing } from "./Landing";

export function Dashboard({ recent }: { recent: SimulationLogEntry[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  // Details edited after upload; null until the first edit
  const [edits, setEdits] = useState<RouteFile | null>(null);
  // The UI no longer offers a choice: the thesis default (Christofides) orders stops, A* routes between them
  const solver = DEFAULT_TSP_SOLVER;
  const [showResults, setShowResults] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draftState, dispatchDraft] = useReducer(draftReducer, initialDraftState);
  const sim = useSimulation();
  const resetSim = sim.reset;

  // Same validation engine the server enforces – instant feedback on upload
  const fileReport = useMemo(() => (fileText === null ? null : validateRouteFileText(fileText)), [fileText]);
  // Edits are re-validated, and the edited copy is what gets simulated
  const report = useMemo(() => (edits ? validateRouteFile(edits) : fileReport), [edits, fileReport]);
  // Editing starts from a file that passed; it stays on screen even if an edit fails validation
  const routeFile = edits ?? fileReport?.data ?? null;

  // The drawn route goes through the very same validation
  const drawnFile = useMemo(() => buildRouteFileFromDraft(draftState.draft), [draftState.draft]);
  const drawnReport = useMemo(() => (drawnFile ? validateRouteFile(drawnFile) : null), [drawnFile]);

  // A finished run takes over the screen; scroll to the top so it starts at the summary
  useEffect(() => {
    if (sim.result) {
      setShowResults(true);
      window.scrollTo({ top: 0 });
    }
  }, [sim.result]);

  // Editing the drawn points makes any earlier result stale – discard it.
  // `draft` keeps its identity when an action was refused, so those don't reset.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the effect must re-run when `draft` changes
  useEffect(() => {
    resetSim();
  }, [draftState.draft, resetSim]);

  const handleLoad = (name: string, text: string) => {
    setFileName(name);
    setFileText(text);
    setEdits(null);
    setShowResults(false);
    setDrawing(false);
    sim.reset();
  };

  // Any edit makes an earlier result stale
  const editFile = (change: (f: RouteFile) => RouteFile) => {
    if (!routeFile) return;
    setEdits(change(routeFile));
    sim.reset();
  };

  const startDrawing = () => {
    sim.reset();
    setShowResults(false);
    setDrawing(true);
  };

  const startOver = () => {
    dispatchDraft({ type: "reset" });
    sim.reset();
    setShowResults(false);
    setDrawing(false);
  };

  // Results (for an uploaded file or a drawn route)
  if (showResults && sim.result) {
    return (
      <ResultsView
        result={sim.result}
        actions={
          <Button onClick={() => setShowResults(false)}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to setup
          </Button>
        }
      />
    );
  }

  // Draw on map
  if (drawing) {
    return (
      <DrawScreen
        state={draftState}
        file={drawnFile}
        onAction={(a: DraftAction) => dispatchDraft(a)}
        report={drawnReport}
        running={sim.running}
        hasResult={Boolean(sim.result)}
        onRun={() => drawnReport?.data && sim.run(drawnReport.data, solver)}
        onCancel={sim.reset}
        onViewResults={() => setShowResults(true)}
        stages={sim.stages}
        error={sim.error}
        onStartOver={startOver}
      />
    );
  }

  // Nothing loaded yet
  if (fileText === null || !report) {
    return <Landing recent={recent} onLoad={handleLoad} onDraw={startDrawing} />;
  }

  // Review (and edit) the uploaded data, then run
  const data = routeFile;
  return (
    <div className="animate-rise space-y-6">
      <ScreenTour tour={data ? reviewTour : reviewInvalidTour} />
      <PageHeader
        eyebrow="New simulation"
        title={data?.route_name ?? "Route file needs attention"}
        description={
          data
            ? `${data.collection_points.length} collection points around ${data.garage.name}. Review or edit the data, then run.`
            : "The file didn't pass validation. Fix the issues listed on the right, or load a different file."
        }
        actions={
          data && (
            <>
              {edits && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setEdits(null);
                    sim.reset();
                  }}
                >
                  <RotateCcw className="size-4" aria-hidden />
                  Revert edits
                </Button>
              )}
              <Badge tone={report.passed ? "ok" : "danger"}>
                {report.passed ? "Ready to run" : "Validation failed"}
              </Badge>
            </>
          )
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="order-2 min-w-0 lg:order-1">
          <CardBody>
            {data ? (
              <Tabs
                label="Route data"
                items={[
                  {
                    id: "map",
                    label: "Map",
                    icon: <MapIcon className="size-4" />,
                    content: (
                      <div>
                        <StopsPreviewMapLoader data={data} />
                        <p className="mt-2 text-xs text-muted">
                          Numbers follow the order in your file. <span className="font-medium">G</span> marks the
                          garage.
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "points",
                    label: "Collection points",
                    icon: <ListChecks className="size-4" />,
                    badge: <Badge>{data.collection_points.length}</Badge>,
                    content: (
                      <StopsEditorTable
                        data={data}
                        onChange={(target, patch) => editFile((f) => applyStopInfo(f, target, patch))}
                        note="Coordinates come from the uploaded file."
                      />
                    ),
                  },
                  {
                    id: "details",
                    label: "Details",
                    icon: <SlidersHorizontal className="size-4" />,
                    content: (
                      <div className="space-y-8">
                        <RouteDetailsForm
                          data={data}
                          onChange={(patch) => editFile((f) => applyRouteDetails(f, patch))}
                        />
                        <ConfigPanel />
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyState
                icon={<FileWarning className="size-7" />}
                title="We couldn't read this route"
                description="Check the messages in the validation panel. Starting from the template is the quickest way to get a valid file."
                action={
                  <a href={SAMPLE_URL} download data-tour="template" className={buttonClasses("secondary", "md")}>
                    <Download className="size-4" aria-hidden />
                    Download the template
                  </a>
                }
              />
            )}
          </CardBody>
        </Card>

        <Card className="order-1 min-w-0 lg:sticky lg:top-6 lg:order-2">
          <CardBody className="space-y-4">
            <div data-tour="loaded-file">
              <LoadedFile
                fileName={fileName ?? "route.json"}
                pointCount={data?.collection_points.length}
                onLoad={handleLoad}
              />
            </div>
            <div data-tour="validation">
              <ValidationReportCard report={report} />
            </div>
            <div data-tour="run">
              <SimulationPanel
                canRun={report.passed}
                running={sim.running}
                hasResult={Boolean(sim.result)}
                onRun={() => report.data && sim.run(report.data, solver)}
                onCancel={sim.reset}
                onViewResults={() => setShowResults(true)}
                stages={sim.stages}
                error={sim.error}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
