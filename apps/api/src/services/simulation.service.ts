// ==========================================================
// Simulation pipeline – runs the notebook modules in order and
// yields progress events that the API streams to the browser.
//
//  validation → network → snapping → traditional → optimized → metrics → archive
//
// Ported from apps/web/src/server/run-simulation.ts and simulation-log.ts.
// ==========================================================
import {
  DEFAULT_TSP_SOLVER,
  type RegisteredStop,
  type RouteResult,
  resolveVehicle,
  type SimulationEvent,
  type SimulationResult,
  type TspSolver,
  validateRouteFile,
} from "@wcro/core";
import { compareRoutes, computeRouteMetrics } from "@wcro/metrics";
import {
  computeOptimizedRoute,
  computeTraditionalRoute,
  type GraphStop,
  type RouteComputation,
  snapStops,
} from "@wcro/routing";
import SimulationRepo from "../repositories/simulation.repository.js";
import { fmt } from "../utils/format.js";
import RoadNetworkSvc from "./road-network.service.js";

function simulationId(): string {
  // Same format as the notebook (YYYYMMDD_HHMMSS) + a short random suffix
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  return `${stamp}_${Math.random().toString(36).slice(2, 6)}`;
}

const toRegistered = ({ nodeIndex: _ignored, ...stop }: GraphStop): RegisteredStop => stop;

export default class SimulationSvc {
  static list(limit?: number) {
    return SimulationRepo.list(limit);
  }

  static getById(id: string) {
    return SimulationRepo.getById(id);
  }

  static async *run(input: { routeFile: unknown; solver?: TspSolver }): AsyncGenerator<SimulationEvent> {
    const solver = input.solver ?? DEFAULT_TSP_SOLVER;

    // ---- Module 2: validation (enforced server-side) ----
    yield { type: "stage", stage: "validation", status: "running" };
    const report = validateRouteFile(input.routeFile);
    if (!report.passed || !report.data) {
      yield {
        type: "error",
        stage: "validation",
        message: `Validation failed (${report.score}/${report.total}). Fix the route file and try again.`,
        details: report.checks.flatMap((c) => c.errors),
      };
      return;
    }
    const routeFile = report.data;
    const vehicle = resolveVehicle(routeFile);
    yield {
      type: "stage",
      stage: "validation",
      status: "done",
      detail: `${report.score}/${report.total} checks passed`,
    };

    // ---- Module 3: road network ----
    yield {
      type: "stage",
      stage: "network",
      status: "running",
      detail: "Loading road network (first run downloads from OpenStreetMap)...",
    };
    const network = await RoadNetworkSvc.load();
    yield {
      type: "stage",
      stage: "network",
      status: "done",
      detail: `${network.graph.nodeCount.toLocaleString()} nodes · ${network.graph.edgeCount.toLocaleString()} edges${network.summary.fromCache ? " (cached)" : ""}`,
    };

    yield { type: "stage", stage: "snapping", status: "running" };
    const snapped = snapStops(network.graph, routeFile);
    yield {
      type: "stage",
      stage: "snapping",
      status: "done",
      detail: `${snapped.collectionPoints.length + 1} stops snapped`,
    };

    // ---- Module 4: simulated traditional route ----
    yield { type: "stage", stage: "traditional", status: "running" };
    const traditional = computeTraditionalRoute(network.graph, snapped.garage, snapped.collectionPoints);
    yield { type: "stage", stage: "traditional", status: "done", detail: `${fmt(traditional.distanceM / 1000)} km` };

    // ---- Module 5: optimized route ----
    yield { type: "stage", stage: "optimized", status: "running" };
    const optimized = computeOptimizedRoute(network.graph, snapped.garage, snapped.collectionPoints, solver);
    yield { type: "stage", stage: "optimized", status: "done", detail: `${fmt(optimized.distanceM / 1000)} km` };

    // ---- Module 6: performance evaluation ----
    yield { type: "stage", stage: "metrics", status: "running" };
    const toResult = (kind: RouteResult["kind"], r: RouteComputation, s?: TspSolver): RouteResult => ({
      kind,
      visitSequence: r.visitSequence.map(({ id, name, role }) => ({ id, name, role })),
      segments: r.segments,
      path: r.path,
      nodesUsed: r.nodesUsed,
      metrics: computeRouteMetrics(r.distanceM, vehicle),
      solver: s,
      computeTimeMs: Math.round(r.computeTimeMs),
    });
    const traditionalResult = toResult("traditional", traditional);
    const optimizedResult = toResult("optimized", optimized, solver);
    const comparison = compareRoutes(traditionalResult.metrics, optimizedResult.metrics);
    yield { type: "stage", stage: "metrics", status: "done" };

    const result: SimulationResult = {
      id: simulationId(),
      createdAt: new Date().toISOString(),
      routeName: routeFile.route_name,
      studyArea: routeFile.study_area,
      driverName: routeFile.driver.name,
      routeFileCreatedDate: routeFile.created_date,
      vehicle,
      network: network.summary,
      nodeRegistry: {
        garage: toRegistered(snapped.garage),
        collectionPoints: snapped.collectionPoints.map(toRegistered),
      },
      traditional: traditionalResult,
      optimized: optimizedResult,
      comparison,
      warnings: snapped.warnings,
    };

    // ---- Archive ----
    yield { type: "stage", stage: "archive", status: "running" };
    try {
      await SimulationRepo.save(result);
      yield { type: "stage", stage: "archive", status: "done", detail: `Saved as ${result.id}` };
    } catch (err) {
      yield { type: "stage", stage: "archive", status: "done", detail: `Not archived: ${(err as Error).message}` };
    }

    yield { type: "result", result };
  }
}
