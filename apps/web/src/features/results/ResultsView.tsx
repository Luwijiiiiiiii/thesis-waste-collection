"use client";
import type { ReactNode } from "react";
import { TSP_SOLVERS, type SimulationResult } from "@wcro/core";
import { BarChart3, Download, ListOrdered, Map as MapIcon, Network, TriangleAlert } from "lucide-react";
import { Tabs } from "@/components/Tabs";
import { ScreenTour } from "@/components/Tour";
import { Badge, Card, CardBody, PageHeader } from "@/components/ui";
import { fmt, fmtDateTime } from "@/lib/format";
import { resultsTour } from "@/features/onboarding/tours";
import { ComparisonTable } from "./ComparisonTable";
import { ExportPanel } from "./ExportPanel";
import { MapWithStops } from "./MapWithStops";
import { NetworkAndRegistry } from "./NetworkAndRegistry";
import { RouteSequence } from "./RouteSequence";
import { SavingsTiles } from "./SavingsTiles";

export function ResultsView({ result, actions }: { result: SimulationResult; actions?: ReactNode }) {
  const distance = result.comparison.find((r) => r.metric === "distanceKm");
  const solver = TSP_SOLVERS.find((s) => s.value === result.optimized.solver);

  let headline = "Simulation results";
  if (distance) {
    const pct = fmt(Math.abs(distance.savingsPercent));
    const km = fmt(Math.abs(distance.savings));
    headline =
      distance.savings > 0
        ? `The optimized route is ${pct}% shorter`
        : distance.savings < 0
          ? `The optimized route is ${pct}% longer`
          : "Both routes cover the same distance";
    if (distance.savings !== 0) headline += ` (${km} km ${distance.savings > 0 ? "saved" : "extra"})`;
  }

  return (
    <div className="animate-rise space-y-6">
      <ScreenTour tour={resultsTour} />
      <PageHeader
        eyebrow={`Simulation results · ${result.routeName}`}
        title={headline}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="num">{result.id}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span>{fmtDateTime(result.createdAt)}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span>
              {result.vehicle.vehicleName}, driver {result.driverName}
            </span>
          </span>
        }
        actions={
          <>
            <Badge tone="brand">{result.nodeRegistry.collectionPoints.length} collection points</Badge>
            {solver && <Badge>{solver.label}</Badge>}
            {actions}
          </>
        }
      />

      {result.warnings.length > 0 && (
        <div role="status" className="flex gap-3 rounded-2xl border border-warn/40 bg-warn-soft p-4 text-sm text-warn">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">Check these before presenting the results</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              {result.warnings.map((w) => (
                <li key={w.message}>{w.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div data-tour="savings">
        <SavingsTiles comparison={result.comparison} />
      </div>

      <Card>
        <CardBody>
          <Tabs
            label="Result details"
            items={[
              {
                id: "map",
                label: "Route map",
                icon: <MapIcon className="size-4" />,
                content: <MapWithStops result={result} />,
              },
              {
                id: "comparison",
                label: "Comparison",
                icon: <BarChart3 className="size-4" />,
                content: (
                  <div>
                    <p className="mb-4 text-sm text-muted">
                      Distance, travel time, fuel, cost and CO₂ for both strategies.
                    </p>
                    <ComparisonTable rows={result.comparison} />
                  </div>
                ),
              },
              {
                id: "routes",
                label: "Route details",
                icon: <ListOrdered className="size-4" />,
                content: (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <RouteSequence route={result.traditional} />
                    <RouteSequence route={result.optimized} />
                  </div>
                ),
              },
              {
                id: "network",
                label: "Road network",
                icon: <Network className="size-4" />,
                content: <NetworkAndRegistry network={result.network} registry={result.nodeRegistry} />,
              },
              {
                id: "export",
                label: "Export",
                icon: <Download className="size-4" />,
                content: <ExportPanel result={result} />,
              },
            ]}
          />
        </CardBody>
      </Card>
    </div>
  );
}
