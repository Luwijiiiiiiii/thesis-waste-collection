// ==========================================================
// Shared domain types used by the backend (API routes) and the
// frontend (dashboard). Keep these serializable (plain JSON).
// ==========================================================
import type { TspSolver } from "./config";

export type LatLng = [lat: number, lon: number];

/** Vehicle parameters after merging route-file values over defaults */
export interface ResolvedVehicle {
  vehicleId: string;
  vehicleName: string;
  averageSpeedKmh: number;
  fuelEfficiencyKmpl: number;
  fuelPricePerLiter: number;
  co2FactorKgPerLiter: number;
}

export interface RoadNetworkSummary {
  studyArea: string;
  networkType: string;
  /** How the boundary was resolved: OSM relation polygon or fallback bbox */
  boundarySource: "relation" | "bbox";
  osmRelationId?: number;
  nodeCount: number;
  edgeCount: number;
  /** When the committed snapshot was downloaded from OpenStreetMap */
  fetchedAt: string;
}

/** A garage or collection point snapped to its nearest road-graph node (notebook CELL 13) */
export interface RegisteredStop {
  id: string;
  name: string;
  role: "garage" | "collection_point";
  latitude: number;
  longitude: number;
  /** OSM node id of the nearest road node */
  node: number;
  /** Coordinates of that road node */
  nodeLatitude: number;
  nodeLongitude: number;
  /** Straight-line distance between the stop and its road node (meters) */
  snapDistanceM: number;
  wasteType?: string;
  priority?: string | number;
}

export interface NodeRegistry {
  garage: RegisteredStop;
  collectionPoints: RegisteredStop[];
}

export interface RouteSegment {
  fromId: string;
  toId: string;
  fromName: string;
  toName: string;
  distanceM: number;
  /** Number of graph nodes in this A* segment */
  nodeCount: number;
}

export interface RouteMetrics {
  distanceKm: number;
  travelTimeMin: number;
  fuelLiters: number;
  fuelCostPhp: number;
  co2Kg: number;
}

export type RouteKind = "traditional" | "optimized";

export interface RouteResult {
  kind: RouteKind;
  /** Stops in visiting order, starting and ending at the garage */
  visitSequence: Pick<RegisteredStop, "id" | "name" | "role">[];
  segments: RouteSegment[];
  /** Full road-level polyline (lat, lon) */
  path: LatLng[];
  /** Graph nodes used (segments joined without duplicating junction nodes) */
  nodesUsed: number;
  metrics: RouteMetrics;
  /** Only for the optimized route */
  solver?: TspSolver;
  computeTimeMs: number;
}

export interface ComparisonRow {
  metric: keyof RouteMetrics;
  label: string;
  unit: string;
  traditional: number;
  optimized: number;
  savings: number;
  /** Positive = optimized is better */
  savingsPercent: number;
}

export interface SimulationWarning {
  code: "SNAP_DISTANCE" | "SAME_NODE";
  message: string;
}

export interface SimulationResult {
  id: string;
  createdAt: string;
  routeName: string;
  studyArea: string;
  driverName: string;
  routeFileCreatedDate: string;
  vehicle: ResolvedVehicle;
  network: RoadNetworkSummary;
  nodeRegistry: NodeRegistry;
  traditional: RouteResult;
  optimized: RouteResult;
  comparison: ComparisonRow[];
  warnings: SimulationWarning[];
}

/** Compact listing entry for the simulation log */
export interface SimulationLogEntry {
  id: string;
  createdAt: string;
  routeName: string;
  collectionPoints: number;
  solver?: TspSolver;
  traditionalKm: number;
  optimizedKm: number;
  distanceSavingsPercent: number;
  /** Started from the Tests page ("Test all") */
  isTest: boolean;
}

/** One archived test run with the numbers the test dashboard needs (no map data) */
export interface TestRunRecord {
  id: string;
  createdAt: string;
  routeName: string;
  collectionPoints: number;
  solver?: TspSolver;
  traditional: RouteMetrics;
  optimized: RouteMetrics;
  traditionalComputeMs: number;
  optimizedComputeMs: number;
}

/** Test size groups: low = 10 or fewer collection points, mid = 11 to 19, many = 20 or more */
export type TestGroup = "low" | "mid" | "many";

export const TEST_GROUPS: { key: TestGroup; label: string; range: string }[] = [
  { key: "low", label: "Low", range: "10 or fewer points" },
  { key: "mid", label: "Mid", range: "11 to 19 points" },
  { key: "many", label: "Many", range: "20 or more points" },
];

export function testGroupOf(collectionPoints: number): TestGroup {
  return collectionPoints <= 10 ? "low" : collectionPoints < 20 ? "mid" : "many";
}

export type SimulationStage =
  | "validation"
  | "network"
  | "snapping"
  | "traditional"
  | "optimized"
  | "metrics"
  | "archive";

export const SIMULATION_STAGES: { key: SimulationStage; label: string }[] = [
  { key: "validation", label: "Validate route file" },
  { key: "network", label: "Load OpenStreetMap road network" },
  { key: "snapping", label: "Snap stops & check truck access" },
  { key: "traditional", label: "Simulated traditional route (A*)" },
  { key: "optimized", label: "Optimized route (TSP + A*)" },
  { key: "metrics", label: "Performance evaluation" },
  { key: "archive", label: "Archive simulation" },
];

/** Events streamed (NDJSON) from POST /api/simulate */
export type SimulationEvent =
  | { type: "stage"; stage: SimulationStage; status: "running" | "done"; detail?: string }
  | { type: "result"; result: SimulationResult }
  | { type: "error"; stage?: SimulationStage; message: string; details?: string[] };
