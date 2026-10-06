import { EARTH_RADIUS_M, haversineM } from "./geo";
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

/**
 * Distance (meters) from a coordinate to the closest point on any road segment.
 * Unlike `nearestNode`, a stop beside a long straight road measures to the road
 * itself, not to the nearest intersection. Uses a local equirectangular
 * projection around the coordinate, accurate to well under a meter at street scale.
 */
export function nearestRoadDistanceM(graph: RoadGraph, lat: number, lon: number): number {
  const ky = (Math.PI / 180) * EARTH_RADIUS_M;
  const kx = ky * Math.cos((lat * Math.PI) / 180);
  const { offsets, targets } = graph.directed;
  let bestSq = Infinity;
  for (let u = 0; u < graph.nodeCount; u++) {
    const ax = (graph.lon[u] - lon) * kx;
    const ay = (graph.lat[u] - lat) * ky;
    for (let e = offsets[u]; e < offsets[u + 1]; e++) {
      const v = targets[e];
      const dx = (graph.lon[v] - lon) * kx - ax;
      const dy = (graph.lat[v] - lat) * ky - ay;
      const lenSq = dx * dx + dy * dy;
      // Project the coordinate (the origin) onto segment a→b, clamped to its ends
      const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lenSq));
      const px = ax + t * dx;
      const py = ay + t * dy;
      const dSq = px * px + py * py;
      if (dSq < bestSq) bestSq = dSq;
    }
  }
  if (bestSq === Infinity) throw new Error("Road graph has no edges.");
  return Math.sqrt(bestSq);
}
