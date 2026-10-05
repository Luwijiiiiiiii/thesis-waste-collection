"use client";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  buildRouteFileFromDraft,
  DEFAULT_TSP_SOLVER,
  draftReducer,
  initialDraftState,
  validateRouteFile,
  validateRouteFileText,
  type DraftAction,
  type SimulationLogEntry,
} from "@wcro/core";
import { ArrowLeft, Download, FileWarning, ListChecks, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { Tabs } from "@/components/Tabs";
import { Badge, buttonClasses, Button, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { ConfigPanel } from "@/features/config/ConfigPanel";
import { CollectionPointsTable, DatasetDetails } from "@/features/dataset/DatasetSummary";
import { StopsPreviewMapLoader } from "@/features/dataset/StopsPreviewMapLoader";
import { DrawScreen } from "@/features/draw/DrawScreen";
import { ResultsView } from "@/features/results/ResultsView";
import { SimulationPanel } from "@/features/simulation/SimulationPanel";
import { useSimulation } from "@/features/simulation/useSimulation";
import { LoadedFile, SAMPLE_URL } from "@/features/upload/RouteFileInput";
import { ValidationReportCard } from "@/features/validation/ValidationReportCard";
import { Landing } from "./Landing";

export function Dashboard({ recent }: { recent: SimulationLogEntry[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  // The UI no longer offers a choice: the thesis default (Christofides) orders stops, A* routes between them
  const solver = DEFAULT_TSP_SOLVER;
  const [showResults, setShowResults] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draftState, dispatchDraft] = useReducer(draftReducer, initialDraftState);
  const sim = useSimulation();
  const resetSim = sim.reset;

  // Same validation engine the server enforces – instant feedback on upload
  const report = useMemo(() => (fileText === null ? null : validateRouteFileText(fileText)), [fileText]);

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
    setShowResults(false);
    setDrawing(false);
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

  // Review the uploaded data and run
  const data = report.data;
  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="New simulation"
        title={data?.route_name ?? "Route file needs attention"}
        description={
          data
            ? `${data.collection_points.length} collection points around ${data.garage.name}. Review the data, pick an algorithm, then run.`
            : "The file didn't pass validation. Fix the issues listed on the right, or load a different file."
        }
        actions={
          data && (
            <Badge tone={report.passed ? "ok" : "danger"}>{report.passed ? "Ready to run" : "Validation failed"}</Badge>
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
                    content: <CollectionPointsTable data={data} />,
                  },
                  {
                    id: "details",
                    label: "Details",
                    icon: <SlidersHorizontal className="size-4" />,
                    content: (
                      <div className="space-y-8">
                        <DatasetDetails data={data} />
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
                  <a href={SAMPLE_URL} download className={buttonClasses("secondary", "md")}>
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
            <LoadedFile
              fileName={fileName ?? "route.json"}
              pointCount={data?.collection_points.length}
              onLoad={handleLoad}
            />
            <ValidationReportCard report={report} />
            <SimulationPanel
              canRun={report.passed}
              running={sim.running}
              hasResult={Boolean(sim.result)}
              onRun={() => data && sim.run(data, solver)}
              onCancel={sim.reset}
              onViewResults={() => setShowResults(true)}
              stages={sim.stages}
              error={sim.error}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
