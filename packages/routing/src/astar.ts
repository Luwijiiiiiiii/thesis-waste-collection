// ==========================================================
// A* shortest path on the directed road graph.
// Replaces `nx.astar_path(road_graph, s, t, weight="length")`
// (notebook CELLS 16 and 21). The heuristic is the great-circle
// distance to the target, which never overestimates the remaining
// road distance, so the path returned is optimal.
// ==========================================================
import { haversineM, type RoadGraph } from "@wcro/road-network";
import { MinHeap } from "./heap";

export interface PathResult {
  /** Node indices from source to target (inclusive) */
  path: number[];
  distanceM: number;
  /** Nodes expanded – handy for an A* vs Dijkstra benchmark */
  expanded: number;
}

export class NoPathError extends Error {
  constructor(
    public readonly source: number,
    public readonly target: number,
  ) {
    super(`No drivable path between graph nodes ${source} and ${target}.`);
    this.name = "NoPathError";
  }
}

export function astarPath(graph: RoadGraph, source: number, target: number): PathResult {
  if (source === target) return { path: [source], distanceM: 0, expanded: 0 };

  const n = graph.nodeCount;
  const { offsets, targets, lengths } = graph.directed;
  const tLat = graph.lat[target];
  const tLon = graph.lon[target];
  const h = (i: number) => haversineM(graph.lat[i], graph.lon[i], tLat, tLon);

  const g = new Float64Array(n).fill(Infinity);
  const parent = new Int32Array(n).fill(-1);
  const closed = new Uint8Array(n);
  const open = new MinHeap();

  g[source] = 0;
  open.push(h(source), source);
  let expanded = 0;

  while (open.size > 0) {
    const u = open.pop();
    if (closed[u]) continue;
    closed[u] = 1;
    expanded++;
    if (u === target) break;

    for (let e = offsets[u]; e < offsets[u + 1]; e++) {
      const v = targets[e];
      if (closed[v]) continue;
      const cand = g[u] + lengths[e];
      if (cand < g[v]) {
        g[v] = cand;
        parent[v] = u;
        open.push(cand + h(v), v);
      }
    }
  }

  if (g[target] === Infinity) throw new NoPathError(source, target);

  const path: number[] = [];
  for (let v = target; v !== -1; v = parent[v]) path.push(v);
  path.reverse();
  return { path, distanceM: g[target], expanded };
}
