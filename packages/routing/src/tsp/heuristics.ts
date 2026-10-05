/** Total length of a closed tour */
export function tourLength(tour: number[], dist: number[][]): number {
  let total = 0;
  for (let i = 0; i < tour.length - 1; i++) total += dist[tour[i]][tour[i + 1]];
  return total;
}

/** Nearest-neighbor construction starting from the garage (index 0). */
export function nearestNeighborTour(dist: number[][]): number[] {
  const n = dist.length;
  const visited = new Array<boolean>(n).fill(false);
  const tour = [0];
  visited[0] = true;
  for (let step = 1; step < n; step++) {
    const last = tour[tour.length - 1];
    let next = -1;
    for (let v = 0; v < n; v++) if (!visited[v] && (next === -1 || dist[last][v] < dist[last][next])) next = v;
    visited[next] = true;
    tour.push(next);
  }
  tour.push(0);
  return tour;
}

/**
 * 2-opt local search on a closed tour that starts/ends at 0.
 * Reverses sub-paths while that shortens the tour.
 */
export function twoOpt(tour: number[], dist: number[][], maxPasses = 50): number[] {
  const t = tour.slice();
  const m = t.length; // includes closing 0
  let improved = true;
  let passes = 0;
  while (improved && passes++ < maxPasses) {
    improved = false;
    for (let i = 1; i < m - 2; i++) {
      for (let k = i + 1; k < m - 1; k++) {
        const a = t[i - 1];
        const b = t[i];
        const c = t[k];
        const d = t[k + 1];
        const delta = dist[a][c] + dist[b][d] - dist[a][b] - dist[c][d];
        if (delta < -1e-9) {
          for (let x = i, y = k; x < y; x++, y--) [t[x], t[y]] = [t[y], t[x]];
          improved = true;
        }
      }
    }
  }
  return t;
}
