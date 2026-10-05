import type { Csr } from "@wcro/road-network";
import { MinHeap } from "./heap";

/**
 * Single-source shortest distances to a set of targets.
 * Stops early once all targets are settled.
 * Used to build the TSP distance matrix on the undirected graph.
 */
export function dijkstraToTargets(n: number, csr: Csr, source: number, targets: number[]): number[] {
  const { offsets, targets: adj, lengths } = csr;
  const dist = new Float64Array(n).fill(Infinity);
  const done = new Uint8Array(n);
  const wanted = new Set(targets);
  let remaining = wanted.size;
  const heap = new MinHeap();

  dist[source] = 0;
  heap.push(0, source);
  while (heap.size > 0 && remaining > 0) {
    const u = heap.pop();
    if (done[u]) continue;
    done[u] = 1;
    if (wanted.has(u)) remaining--;
    for (let e = offsets[u]; e < offsets[u + 1]; e++) {
      const v = adj[e];
      const cand = dist[u] + lengths[e];
      if (cand < dist[v]) {
        dist[v] = cand;
        heap.push(cand, v);
      }
    }
  }
  return targets.map((t) => dist[t]);
}

/** Symmetric all-pairs distance matrix between the given graph nodes (undirected graph). */
export function distanceMatrix(n: number, undirected: Csr, nodes: number[]): number[][] {
  const unique = Array.from(new Set(nodes));
  const rows = new Map<number, Map<number, number>>();
  for (const s of unique) {
    const d = dijkstraToTargets(n, undirected, s, unique);
    rows.set(s, new Map(unique.map((t, i) => [t, d[i]])));
  }
  return nodes.map((a) => nodes.map((b) => rows.get(a)?.get(b) ?? Infinity));
}
