import { describe, expect, it } from "vitest";
import type { RouteFile } from "@wcro/core";
import { buildRoadGraph, nearestRoadDistanceM, type OverpassElement } from "@wcro/road-network";
import { astarPath } from "./astar";
import { dijkstraToTargets } from "./dijkstra";
import { christofidesTour, minWeightPerfectMatching, nearestNeighborTour, solveTsp, tourLength, twoOpt } from "./tsp";
import { computeOptimizedRoute, computeTraditionalRoute, type GraphStop } from "./routes";
import { snapStops } from "./snap";

/** Build a fake Overpass response: an N×N street grid around Baguio with one one-way street */
function gridResponse(size = 12): OverpassElement[] {
  const els: OverpassElement[] = [];
  const id = (r: number, c: number) => 1000 + r * size + c;
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      els.push({ type: "node", id: id(r, c), lat: 16.4 + r * 0.001, lon: 120.59 + c * 0.001 } as OverpassElement);
  let wid = 1;
  for (let r = 0; r < size; r++)
    els.push({
      type: "way",
      id: wid++,
      nodes: Array.from({ length: size }, (_, c) => id(r, c)),
      tags: r === 3 ? { highway: "residential", oneway: "yes" } : { highway: "residential" },
    } as OverpassElement);
  for (let c = 0; c < size; c++)
    els.push({
      type: "way",
      id: wid++,
      nodes: Array.from({ length: size }, (_, r) => id(r, c)),
      tags: { highway: "residential" },
    } as OverpassElement);
  // dead-end one-way spur that is not strongly connected – should be removed
  els.push({ type: "node", id: 9_000_000_001, lat: 16.39, lon: 120.58 } as OverpassElement);
  els.push({
    type: "way",
    id: wid++,
    nodes: [id(0, 0), 9_000_000_001],
    tags: { highway: "residential", oneway: "yes" },
  } as OverpassElement);
  return els;
}

const { graph, stats } = buildRoadGraph({ elements: gridResponse() });

function stop(i: number, role: GraphStop["role"] = "collection_point"): GraphStop {
  return {
    id: `P${i}`,
    name: `Point ${i}`,
    role,
    latitude: graph.lat[i],
    longitude: graph.lon[i],
    node: graph.osmId(i),
    nodeIndex: i,
    nodeLatitude: graph.lat[i],
    nodeLongitude: graph.lon[i],
    snapDistanceM: 0,
  };
}

function bruteForceTsp(dist: number[][]): number {
  const rest = dist.map((_, i) => i).slice(1);
  let best = Infinity;
  const permute = (arr: number[], k: number) => {
    if (k === arr.length) {
      best = Math.min(best, tourLength([0, ...arr, 0], dist));
      return;
    }
    for (let i = k; i < arr.length; i++) {
      [arr[k], arr[i]] = [arr[i], arr[k]];
      permute(arr, k + 1);
      [arr[k], arr[i]] = [arr[i], arr[k]];
    }
  };
  permute(rest, 0);
  return best;
}

function randomMetric(n: number, seed: number): number[][] {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const pts = Array.from({ length: n }, () => [rnd() * 1000, rnd() * 1000]);
  return pts.map((a) => pts.map((b) => Math.hypot(a[0] - b[0], a[1] - b[1])));
}

describe("road graph", () => {
  it("drops nodes outside the largest strongly connected component", () => {
    expect(stats.rawNodes).toBe(145);
    expect(graph.nodeCount).toBe(144);
    expect(graph.indexOf(9_000_000_001)).toBeUndefined();
  });

  it("respects one-way streets", () => {
    const a = graph.indexOf(1000 + 3 * 12 + 5)!;
    const b = graph.indexOf(1000 + 3 * 12 + 6)!;
    expect(graph.edgeLength(a, b)).toBeLessThan(Infinity);
    expect(graph.edgeLength(b, a)).toBe(Infinity);
  });
});

describe("A*", () => {
  it("matches Dijkstra distances on the directed graph", () => {
    for (const [s, t] of [
      [0, 143],
      [17, 90],
      [50, 3],
      [40, 39],
    ]) {
      const a = astarPath(graph, s, t);
      const [d] = dijkstraToTargets(graph.nodeCount, graph.directed, s, [t]);
      expect(a.distanceM).toBeCloseTo(d, 6);
      expect(a.path[0]).toBe(s);
      expect(a.path[a.path.length - 1]).toBe(t);
    }
  });

  it("returns a single node when source equals target", () => {
    expect(astarPath(graph, 5, 5)).toEqual({ path: [5], distanceM: 0, expanded: 0 });
  });
});

describe("matching", () => {
  it("finds the exact minimum-weight perfect matching", () => {
    const dist = randomMetric(10, 7);
    const vertices = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    const cost = (pairs: [number, number][]) => pairs.reduce((s, [a, b]) => s + dist[a][b], 0);
    // brute force
    const brute = (left: number[]): number => {
      if (left.length === 0) return 0;
      const [a, ...rest] = left;
      return Math.min(...rest.map((b) => dist[a][b] + brute(rest.filter((x) => x !== b))));
    };
    expect(cost(minWeightPerfectMatching(vertices, dist))).toBeCloseTo(brute(vertices), 6);
  });
});

describe("TSP solvers", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    it(`Christofides stays within 1.5× of optimal (seed ${seed})`, () => {
      const dist = randomMetric(9, seed);
      const optimal = bruteForceTsp(dist);
      const tour = christofidesTour(dist);
      expect(tour[0]).toBe(0);
      expect(tour[tour.length - 1]).toBe(0);
      expect(new Set(tour).size).toBe(9);
      expect(tourLength(tour, dist)).toBeLessThanOrEqual(optimal * 1.5 + 1e-6);
      expect(tourLength(twoOpt(tour, dist), dist)).toBeLessThanOrEqual(tourLength(tour, dist) + 1e-9);
    });
  }

  it("every solver visits each stop exactly once and returns to the garage", () => {
    const dist = randomMetric(15, 42);
    for (const solver of ["christofides", "christofides-2opt", "nearest-neighbor-2opt"] as const) {
      const tour = solveTsp(dist, solver);
      expect(tour.length).toBe(16);
      expect(tour[0]).toBe(0);
      expect(tour[15]).toBe(0);
      expect(new Set(tour.slice(0, -1)).size).toBe(15);
    }
    expect(nearestNeighborTour(dist)[0]).toBe(0);
  });
});

describe("routes", () => {
  const garage = stop(0, "garage");
  // deliberately zig-zag order so optimization has something to fix
  const points = [143, 12, 131, 24, 119, 36].map((i) => stop(i));

  it("traditional route follows the file order", () => {
    const r = computeTraditionalRoute(graph, garage, points);
    expect(r.visitSequence.map((s) => s.id)).toEqual(["P0", "P143", "P12", "P131", "P24", "P119", "P36", "P0"]);
    expect(r.segments).toHaveLength(7);
    expect(r.path.length).toBe(r.nodesUsed);
  });

  it("optimized route starts/ends at the garage and is not longer", () => {
    const trad = computeTraditionalRoute(graph, garage, points);
    const opt = computeOptimizedRoute(graph, garage, points, "christofides");
    expect(opt.visitSequence[0].id).toBe("P0");
    expect(opt.visitSequence[opt.visitSequence.length - 1].id).toBe("P0");
    expect(opt.visitSequence).toHaveLength(points.length + 2);
    expect(opt.distanceM).toBeLessThan(trad.distanceM);
  });
});

describe("truck access", () => {
  // Grid streets run every 0.001° (~107–111 m); row 5 is at lat 16.405
  it("measures to the road segment, not just its nodes", () => {
    // Halfway between two intersections: ~53 m from either node, but on the road
    expect(nearestRoadDistanceM(graph, 16.405, 120.5955)).toBeLessThan(0.5);
    // ~10 m north of that road
    expect(nearestRoadDistanceM(graph, 16.40509, 120.5955)).toBeCloseTo(10, 0);
    // Middle of a block: ~53 m from every street
    expect(nearestRoadDistanceM(graph, 16.4055, 120.5955)).toBeGreaterThan(50);
  });

  it("flags stops too far from a truck road", () => {
    const routeFile = {
      garage: { id: "G", name: "Garage", latitude: 16.4, longitude: 120.59 },
      collection_points: [
        { id: "A", name: "Roadside bin", latitude: 16.40509, longitude: 120.5955 },
        { id: "B", name: "Mid-block bin", latitude: 16.4055, longitude: 120.5955 },
      ],
    } as RouteFile;
    const { inaccessible } = snapStops(graph, routeFile);
    expect(inaccessible).toHaveLength(1);
    expect(inaccessible[0]).toMatch(/^Mid-block bin: Trash site not accessible by garbage trucks/);
  });
});
