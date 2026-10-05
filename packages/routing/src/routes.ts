// ==========================================================
// Module 4 – Simulated Traditional Route (notebook CELLS 16–18)
// Module 5 – Optimized Route (notebook CELLS 20–22)
// ==========================================================
import type { LatLng, RegisteredStop, RouteSegment, TspSolver } from "@wcro/core";
import type { RoadGraph } from "@wcro/road-network";
import { astarPath } from "./astar";
import { distanceMatrix } from "./dijkstra";
import { solveTsp, tourLength } from "./tsp";

/** A stop that has been snapped to a graph node index */
export interface GraphStop extends RegisteredStop {
  nodeIndex: number;
}

export interface RouteComputation {
  visitSequence: GraphStop[];
  segments: RouteSegment[];
  path: LatLng[];
  nodesUsed: number;
  distanceM: number;
  computeTimeMs: number;
}

/** Run A* between each consecutive pair of stops and join the segments. */
export function buildRoadRoute(graph: RoadGraph, sequence: GraphStop[]): Omit<RouteComputation, "computeTimeMs"> {
  const segments: RouteSegment[] = [];
  const pathIdx: number[] = [];
  let distanceM = 0;

  for (let i = 0; i < sequence.length - 1; i++) {
    const from = sequence[i];
    const to = sequence[i + 1];
    const seg = astarPath(graph, from.nodeIndex, to.nodeIndex);
    segments.push({
      fromId: from.id,
      toId: to.id,
      fromName: from.name,
      toName: to.name,
      distanceM: seg.distanceM,
      nodeCount: seg.path.length,
    });
    distanceM += seg.distanceM;
    // Avoid duplicating the junction node between segments (as in the notebook)
    pathIdx.push(...(i === 0 ? seg.path : seg.path.slice(1)));
  }

  return {
    visitSequence: sequence,
    segments,
    path: pathIdx.map((n) => [graph.lat[n], graph.lon[n]] as LatLng),
    nodesUsed: pathIdx.length,
    distanceM,
  };
}

/**
 * Simulated Traditional Route: garage → collection points in the exact
 * order of the uploaded file → garage. No reordering, A* only.
 */
export function computeTraditionalRoute(graph: RoadGraph, garage: GraphStop, points: GraphStop[]): RouteComputation {
  const t0 = performance.now();
  const route = buildRoadRoute(graph, [garage, ...points, garage]);
  return { ...route, computeTimeMs: performance.now() - t0 };
}

export interface OptimizedRouteComputation extends RouteComputation {
  solver: TspSolver;
  /** Tour length on the undirected TSP matrix (before directed A*) */
  tspEstimateM: number;
}

/**
 * Optimized Route: TSP decides the visiting order (on undirected road
 * distances, like `road_graph.to_undirected()`), then A* computes the
 * drivable path on the directed graph.
 */
export function computeOptimizedRoute(
  graph: RoadGraph,
  garage: GraphStop,
  points: GraphStop[],
  solver: TspSolver,
): OptimizedRouteComputation {
  const t0 = performance.now();
  const stops = [garage, ...points];
  const dist = distanceMatrix(
    graph.nodeCount,
    graph.undirected,
    stops.map((s) => s.nodeIndex),
  );
  const tour = solveTsp(dist, solver);
  const sequence = tour.map((i) => stops[i]);
  const route = buildRoadRoute(graph, sequence);
  return {
    ...route,
    solver,
    tspEstimateM: tourLength(tour, dist),
    computeTimeMs: performance.now() - t0,
  };
}
