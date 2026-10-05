// ==========================================================
// Export builders (notebook CELL 4 helpers: save_dataframe, JSON dumps)
// Pure functions returning file contents; the frontend turns them
// into downloads and the backend stores them in the simulation log.
// ==========================================================
import type { ComparisonRow, NodeRegistry, RouteResult, SimulationResult } from "@wcro/core";

type Cell = string | number | boolean | null | undefined;

function escapeCsv(value: Cell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: Cell[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\r\n") + "\r\n";
}

/** node_registry.csv (notebook CELL 14) */
export function nodeRegistryCsv(registry: NodeRegistry): string {
  const stops = [registry.garage, ...registry.collectionPoints];
  return toCsv(
    ["Point ID", "Name", "Role", "Latitude", "Longitude", "OSM Node", "Snap Distance (m)", "Waste Type", "Priority"],
    stops.map((s) => [
      s.id,
      s.name,
      s.role,
      s.latitude,
      s.longitude,
      s.node,
      s.snapDistanceM.toFixed(1),
      s.wasteType,
      s.priority,
    ]),
  );
}

/** Route comparison table */
export function comparisonCsv(rows: ComparisonRow[]): string {
  return toCsv(
    ["Metric", "Unit", "Simulated Traditional", "Optimized", "Savings", "Savings (%)"],
    rows.map((r) => [r.label, r.unit, r.traditional, r.optimized, r.savings, r.savingsPercent]),
  );
}

/** Visit sequence + segment distances for one route */
export function routeSegmentsCsv(route: RouteResult): string {
  return toCsv(
    ["#", "From", "To", "Distance (m)", "Graph Nodes"],
    route.segments.map((s, i) => [i + 1, s.fromName, s.toName, s.distanceM.toFixed(1), s.nodeCount]),
  );
}

/** Route JSON (notebook CELL 18: simulated_traditional_route.json) */
export function routeJson(route: RouteResult): string {
  return JSON.stringify(
    {
      kind: route.kind,
      solver: route.solver,
      visit_sequence: route.visitSequence,
      segments: route.segments,
      metrics: route.metrics,
      road_path: route.path,
    },
    null,
    2,
  );
}

/** GeoJSON with both routes and all stops – opens in QGIS / geojson.io */
export function simulationGeoJson(result: SimulationResult): string {
  const line = (route: RouteResult) => ({
    type: "Feature",
    properties: { kind: route.kind, ...route.metrics },
    geometry: { type: "LineString", coordinates: route.path.map(([lat, lon]) => [lon, lat]) },
  });
  const stops = [result.nodeRegistry.garage, ...result.nodeRegistry.collectionPoints].map((s) => ({
    type: "Feature",
    properties: {
      id: s.id,
      name: s.name,
      role: s.role,
      osm_node: s.node,
      waste_type: s.wasteType,
      priority: s.priority,
    },
    geometry: { type: "Point", coordinates: [s.longitude, s.latitude] },
  }));
  return JSON.stringify(
    { type: "FeatureCollection", features: [line(result.traditional), line(result.optimized), ...stops] },
    null,
    2,
  );
}
