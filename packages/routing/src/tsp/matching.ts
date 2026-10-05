/**
 * Minimum-weight perfect matching on a subset of vertices.
 * Exact (bitmask DP) for up to EXACT_LIMIT vertices – same result as
 * networkx `min_weight_matching`, which Christofides uses. Larger sets
 * fall back to a greedy matching (documented approximation).
 */
export const EXACT_MATCHING_LIMIT = 20;

export function minWeightPerfectMatching(vertices: number[], dist: number[][]): [number, number][] {
  const k = vertices.length;
  if (k === 0) return [];
  if (k % 2 !== 0) throw new Error("Perfect matching requires an even number of vertices.");
  return k <= EXACT_MATCHING_LIMIT ? exactMatching(vertices, dist) : greedyMatching(vertices, dist);
}

function exactMatching(vertices: number[], dist: number[][]): [number, number][] {
  const k = vertices.length;
  const full = (1 << k) - 1;
  const dp = new Float64Array(1 << k).fill(Infinity);
  const pick = new Int8Array(1 << k).fill(-1);
  dp[full] = 0;

  for (let mask = full - 1; mask >= 0; mask--) {
    // lowest unmatched vertex
    let i = 0;
    while (mask & (1 << i)) i++;
    const withI = mask | (1 << i);
    let best = Infinity;
    let bestJ = -1;
    for (let j = i + 1; j < k; j++) {
      if (withI & (1 << j)) continue;
      const c = dist[vertices[i]][vertices[j]] + dp[withI | (1 << j)];
      if (c < best) {
        best = c;
        bestJ = j;
      }
    }
    dp[mask] = best;
    pick[mask] = bestJ;
  }

  const pairs: [number, number][] = [];
  let mask = 0;
  while (mask !== full) {
    let i = 0;
    while (mask & (1 << i)) i++;
    const j = pick[mask];
    pairs.push([vertices[i], vertices[j]]);
    mask |= (1 << i) | (1 << j);
  }
  return pairs;
}

function greedyMatching(vertices: number[], dist: number[][]): [number, number][] {
  const edges: [number, number, number][] = [];
  for (let a = 0; a < vertices.length; a++)
    for (let b = a + 1; b < vertices.length; b++) edges.push([vertices[a], vertices[b], dist[vertices[a]][vertices[b]]]);
  edges.sort((x, y) => x[2] - y[2]);
  const used = new Set<number>();
  const pairs: [number, number][] = [];
  for (const [u, v] of edges) {
    if (used.has(u) || used.has(v)) continue;
    used.add(u);
    used.add(v);
    pairs.push([u, v]);
  }
  return pairs;
}
