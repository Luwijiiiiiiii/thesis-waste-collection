// ==========================================================
// Christofides TSP approximation (notebook CELL 20).
// Replaces networkx `traveling_salesman_problem(..., method=christofides)`.
//
// Works on a symmetric distance matrix between STOPS ONLY (garage = 0).
// This also fixes the notebook issue where the TSP result contained the
// intermediate road nodes instead of just the stop order.
// ==========================================================
import { minWeightPerfectMatching } from "./matching";

/** Prim's minimum spanning tree on a complete graph. Returns edges [u, v]. */
export function minimumSpanningTree(dist: number[][]): [number, number][] {
  const n = dist.length;
  const inTree = new Array<boolean>(n).fill(false);
  const best = new Array<number>(n).fill(Infinity);
  const from = new Array<number>(n).fill(-1);
  best[0] = 0;
  const edges: [number, number][] = [];
  for (let it = 0; it < n; it++) {
    let u = -1;
    for (let v = 0; v < n; v++) if (!inTree[v] && (u === -1 || best[v] < best[u])) u = v;
    inTree[u] = true;
    if (from[u] !== -1) edges.push([from[u], u]);
    for (let v = 0; v < n; v++) {
      if (!inTree[v] && dist[u][v] < best[v]) {
        best[v] = dist[u][v];
        from[v] = u;
      }
    }
  }
  return edges;
}

/** Hierholzer's algorithm for an Eulerian circuit on a multigraph. */
function eulerianCircuit(n: number, edges: [number, number][], start: number): number[] {
  const adj: { to: number; id: number }[][] = Array.from({ length: n }, () => []);
  edges.forEach(([u, v], id) => {
    adj[u].push({ to: v, id });
    adj[v].push({ to: u, id });
  });
  const used = new Array<boolean>(edges.length).fill(false);
  const ptr = new Array<number>(n).fill(0);
  const stack = [start];
  const circuit: number[] = [];
  while (stack.length) {
    const v = stack[stack.length - 1];
    while (ptr[v] < adj[v].length && used[adj[v][ptr[v]].id]) ptr[v]++;
    if (ptr[v] === adj[v].length) {
      stack.pop();
      circuit.push(v);
    } else {
      const { to, id } = adj[v][ptr[v]];
      used[id] = true;
      stack.push(to);
    }
  }
  return circuit.reverse();
}

/**
 * Returns a closed tour over indices 0..n-1 that starts and ends at 0 (the garage),
 * e.g. [0, 3, 1, 2, 0].
 */
export function christofidesTour(dist: number[][]): number[] {
  const n = dist.length;
  if (n === 1) return [0, 0];
  if (n === 2) return [0, 1, 0];

  const mst = minimumSpanningTree(dist);
  const degree = new Array<number>(n).fill(0);
  for (const [u, v] of mst) {
    degree[u]++;
    degree[v]++;
  }
  const odd = degree.map((d, i) => (d % 2 === 1 ? i : -1)).filter((i) => i !== -1);
  const matching = minWeightPerfectMatching(odd, dist);

  const circuit = eulerianCircuit(n, [...mst, ...matching], 0);

  // Shortcut repeated vertices -> Hamiltonian cycle
  const seen = new Set<number>();
  const tour: number[] = [];
  for (const v of circuit) {
    if (!seen.has(v)) {
      seen.add(v);
      tour.push(v);
    }
  }
  tour.push(0);
  return tour;
}
