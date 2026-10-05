// Compact JSON format for caching the processed road graph on disk
// (replaces `ox.settings.use_cache = True`).
import { RoadGraph } from "./graph";

export interface SerializedRoadGraph {
  version: 1;
  meta: Record<string, unknown>;
  nodeIds: number[];
  lat: number[];
  lon: number[];
  edgeFrom: number[];
  edgeTo: number[];
  /** meters, rounded to cm */
  edgeLength: number[];
}

export function serializeGraph(graph: RoadGraph, meta: Record<string, unknown> = {}): SerializedRoadGraph {
  const { offsets, targets, lengths } = graph.directed;
  const edgeFrom: number[] = [];
  const edgeTo: number[] = [];
  const edgeLength: number[] = [];
  for (let u = 0; u < graph.nodeCount; u++) {
    for (let e = offsets[u]; e < offsets[u + 1]; e++) {
      edgeFrom.push(u);
      edgeTo.push(targets[e]);
      edgeLength.push(Math.round(lengths[e] * 100) / 100);
    }
  }
  return {
    version: 1,
    meta,
    nodeIds: Array.from(graph.nodeIds),
    lat: Array.from(graph.lat),
    lon: Array.from(graph.lon),
    edgeFrom,
    edgeTo,
    edgeLength,
  };
}

export function deserializeGraph(data: SerializedRoadGraph): RoadGraph {
  if (data.version !== 1) throw new Error(`Unsupported cached graph version ${data.version}`);
  return new RoadGraph(data.nodeIds, data.lat, data.lon, data.edgeFrom, data.edgeTo, data.edgeLength);
}
