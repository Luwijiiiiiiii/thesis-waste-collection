import type { Csr } from "./graph";

/**
 * Largest strongly connected component (iterative Tarjan).
 * Keeping only the largest SCC guarantees that A* can always find a
 * drivable path between any two snapped stops on the directed graph.
 * Returns a boolean mask of nodes to keep.
 */
export function largestStronglyConnectedComponent(n: number, csr: Csr): Uint8Array {
  const { offsets, targets } = csr;
  const index = new Int32Array(n).fill(-1);
  const low = new Int32Array(n);
  const onStack = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const callNode = new Int32Array(n);
  const callEdge = new Int32Array(n);
  const component = new Int32Array(n).fill(-1);
  const componentSizes: number[] = [];
  let counter = 0;

  for (let root = 0; root < n; root++) {
    if (index[root] !== -1) continue;
    let depth = 0;
    callNode[0] = root;
    callEdge[0] = offsets[root];
    index[root] = low[root] = counter++;
    stack[sp++] = root;
    onStack[root] = 1;

    while (depth >= 0) {
      const v = callNode[depth];
      if (callEdge[depth] < offsets[v + 1]) {
        const w = targets[callEdge[depth]++];
        if (index[w] === -1) {
          index[w] = low[w] = counter++;
          stack[sp++] = w;
          onStack[w] = 1;
          depth++;
          callNode[depth] = w;
          callEdge[depth] = offsets[w];
        } else if (onStack[w]) {
          if (index[w] < low[v]) low[v] = index[w];
        }
      } else {
        if (low[v] === index[v]) {
          const c = componentSizes.length;
          let size = 0;
          let w: number;
          do {
            w = stack[--sp];
            onStack[w] = 0;
            component[w] = c;
            size++;
          } while (w !== v);
          componentSizes.push(size);
        }
        depth--;
        if (depth >= 0) {
          const parent = callNode[depth];
          if (low[v] < low[parent]) low[parent] = low[v];
        }
      }
    }
  }

  let best = 0;
  for (let c = 1; c < componentSizes.length; c++) if (componentSizes[c] > componentSizes[best]) best = c;
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (component[i] === best) mask[i] = 1;
  return mask;
}
