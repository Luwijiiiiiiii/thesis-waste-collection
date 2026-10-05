// ==========================================================
// Build a RoadGraph from raw Overpass (OpenStreetMap) elements.
// Replaces what `ox.graph_from_place(..., network_type="drive")` does
// internally: create directed edges for each way segment, respecting
// one-way tags, then keep the largest strongly connected component.
// ==========================================================
import { haversineM } from "./geo";
import { RoadGraph } from "./graph";
import { largestStronglyConnectedComponent } from "./scc";

export interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
}

export interface OverpassWay {
  type: "way";
  id: number;
  nodes: number[];
  tags?: Record<string, string>;
}

export type OverpassElement = OverpassNode | OverpassWay | { type: string; id: number };

export interface OverpassResponse {
  elements: OverpassElement[];
}

type Direction = "both" | "forward" | "reverse";

/** One-way interpretation following OSMnx conventions */
export function wayDirection(tags: Record<string, string> = {}): Direction {
  const oneway = (tags.oneway ?? "").toLowerCase();
  if (["yes", "true", "1"].includes(oneway)) return "forward";
  if (["-1", "reverse"].includes(oneway)) return "reverse";
  if (["no", "false", "0"].includes(oneway)) return "both";
  const junction = (tags.junction ?? "").toLowerCase();
  if (junction === "roundabout" || junction === "circular") return "forward";
  return "both";
}

export interface BuildGraphStats {
  rawNodes: number;
  rawEdges: number;
  keptNodes: number;
  keptEdges: number;
}

export function buildRoadGraph(response: OverpassResponse): { graph: RoadGraph; stats: BuildGraphStats } {
  const coords = new Map<number, [number, number]>();
  const ways: OverpassWay[] = [];
  for (const el of response.elements) {
    if (el.type === "node") {
      const n = el as OverpassNode;
      coords.set(n.id, [n.lat, n.lon]);
    } else if (el.type === "way") {
      ways.push(el as OverpassWay);
    }
  }

  // Index only nodes that are actually used by a way
  const idToIdx = new Map<number, number>();
  const ids: number[] = [];
  const lats: number[] = [];
  const lons: number[] = [];
  const idx = (osmId: number): number | undefined => {
    let i = idToIdx.get(osmId);
    if (i !== undefined) return i;
    const c = coords.get(osmId);
    if (!c) return undefined;
    i = ids.length;
    idToIdx.set(osmId, i);
    ids.push(osmId);
    lats.push(c[0]);
    lons.push(c[1]);
    return i;
  };

  const from: number[] = [];
  const to: number[] = [];
  const len: number[] = [];

  for (const way of ways) {
    const dir = wayDirection(way.tags);
    for (let k = 0; k < way.nodes.length - 1; k++) {
      const a = idx(way.nodes[k]);
      const b = idx(way.nodes[k + 1]);
      if (a === undefined || b === undefined || a === b) continue;
      const d = haversineM(lats[a], lons[a], lats[b], lons[b]);
      if (dir === "both" || dir === "forward") {
        from.push(a);
        to.push(b);
        len.push(d);
      }
      if (dir === "both" || dir === "reverse") {
        from.push(b);
        to.push(a);
        len.push(d);
      }
    }
  }

  if (ids.length === 0) throw new Error("Overpass returned no drivable roads for the study area.");

  // Keep the largest strongly connected component
  const full = new RoadGraph(ids, lats, lons, from, to, len);
  const keep = largestStronglyConnectedComponent(full.nodeCount, full.directed);

  const remap = new Int32Array(ids.length).fill(-1);
  const kIds: number[] = [];
  const kLat: number[] = [];
  const kLon: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    if (!keep[i]) continue;
    remap[i] = kIds.length;
    kIds.push(ids[i]);
    kLat.push(lats[i]);
    kLon.push(lons[i]);
  }
  const kFrom: number[] = [];
  const kTo: number[] = [];
  const kLen: number[] = [];
  for (let e = 0; e < from.length; e++) {
    const a = remap[from[e]];
    const b = remap[to[e]];
    if (a === -1 || b === -1) continue;
    kFrom.push(a);
    kTo.push(b);
    kLen.push(len[e]);
  }

  const graph = new RoadGraph(kIds, kLat, kLon, kFrom, kTo, kLen);
  return {
    graph,
    stats: { rawNodes: ids.length, rawEdges: from.length, keptNodes: graph.nodeCount, keptEdges: graph.edgeCount },
  };
}
