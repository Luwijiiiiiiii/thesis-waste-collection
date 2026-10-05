// ==========================================================
// Convert coordinates to road-graph nodes (notebook CELL 13)
// Builds the node registry for the garage and collection points.
// ==========================================================
import { SNAP_WARNING_DISTANCE_M, type RouteFile, type SimulationWarning } from "@wcro/core";
import { nearestNode, type RoadGraph } from "@wcro/road-network";
import type { GraphStop } from "./routes";

export interface SnapResult {
  garage: GraphStop;
  collectionPoints: GraphStop[];
  warnings: SimulationWarning[];
}

export function snapStops(graph: RoadGraph, routeFile: RouteFile): SnapResult {
  const warnings: SimulationWarning[] = [];

  const snap = (
    p: { id: string | number; name: string; latitude: number; longitude: number },
    role: GraphStop["role"],
    extra: Partial<GraphStop> = {},
  ): GraphStop => {
    const nn = nearestNode(graph, p.latitude, p.longitude);
    if (nn.distanceM > SNAP_WARNING_DISTANCE_M) {
      warnings.push({
        code: "SNAP_DISTANCE",
        message: `${p.name} is ${Math.round(nn.distanceM)} m from the nearest drivable road. Check its coordinates.`,
      });
    }
    return {
      id: String(p.id),
      name: p.name,
      role,
      latitude: p.latitude,
      longitude: p.longitude,
      node: nn.osmId,
      nodeIndex: nn.index,
      nodeLatitude: graph.lat[nn.index],
      nodeLongitude: graph.lon[nn.index],
      snapDistanceM: nn.distanceM,
      ...extra,
    };
  };

  const garage = snap(routeFile.garage, "garage");
  const collectionPoints = routeFile.collection_points.map((p) =>
    snap(p, "collection_point", { wasteType: p.waste_type, priority: p.priority }),
  );

  // Stops that share a road node produce zero-length segments
  const byNode = new Map<number, string[]>();
  for (const s of [garage, ...collectionPoints]) byNode.set(s.node, [...(byNode.get(s.node) ?? []), s.name]);
  for (const names of byNode.values()) {
    if (names.length > 1) {
      warnings.push({ code: "SAME_NODE", message: `${names.join(", ")} snap to the same road node.` });
    }
  }

  return { garage, collectionPoints, warnings };
}
