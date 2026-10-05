import { haversineM } from "./geo";
import type { RoadGraph } from "./graph";

export interface NearestNodeResult {
  index: number;
  osmId: number;
  distanceM: number;
}

/**
 * Nearest road-graph node to a coordinate.
 * Replaces `ox.distance.nearest_nodes` (notebook CELL 13).
 * A linear scan is fast enough for a city-sized graph (~10^4–10^5 nodes).
 */
export function nearestNode(graph: RoadGraph, lat: number, lon: number): NearestNodeResult {
  // Equirectangular approximation to find the candidate, haversine for the final distance
  const cosLat = Math.cos((lat * Math.PI) / 180);
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < graph.nodeCount; i++) {
    const dy = graph.lat[i] - lat;
    const dx = (graph.lon[i] - lon) * cosLat;
    const d = dx * dx + dy * dy;
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  if (best === -1) throw new Error("Road graph is empty.");
  return {
    index: best,
    osmId: graph.osmId(best),
    distanceM: haversineM(lat, lon, graph.lat[best], graph.lon[best]),
  };
}
