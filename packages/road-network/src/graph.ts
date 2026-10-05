// ==========================================================
// RoadGraph – compact directed road graph (CSR adjacency).
// Replaces the NetworkX MultiDiGraph produced by OSMnx.
//
// Two adjacency structures are kept:
//  - directed   : respects one-way streets; used by A* for the real
//                 drivable path (notebook CELLS 16 and 21)
//  - undirected : used only to compute the TSP distance matrix,
//                 mirroring `road_graph.to_undirected()` in CELL 20
// ==========================================================

export interface Csr {
  offsets: Int32Array;
  targets: Int32Array;
  lengths: Float64Array;
}

function buildCsr(n: number, from: ArrayLike<number>, to: ArrayLike<number>, len: ArrayLike<number>): Csr {
  const m = from.length;
  const offsets = new Int32Array(n + 1);
  for (let i = 0; i < m; i++) offsets[from[i] + 1]++;
  for (let i = 0; i < n; i++) offsets[i + 1] += offsets[i];
  const cursor = offsets.slice(0, n);
  const targets = new Int32Array(m);
  const lengths = new Float64Array(m);
  for (let i = 0; i < m; i++) {
    const pos = cursor[from[i]]++;
    targets[pos] = to[i];
    lengths[pos] = len[i];
  }
  return { offsets, targets, lengths };
}

export class RoadGraph {
  /** OSM node ids (can exceed int32, so Float64) */
  readonly nodeIds: Float64Array;
  readonly lat: Float64Array;
  readonly lon: Float64Array;
  readonly directed: Csr;
  readonly undirected: Csr;
  private readonly index: Map<number, number>;

  constructor(
    nodeIds: ArrayLike<number>,
    lat: ArrayLike<number>,
    lon: ArrayLike<number>,
    edgeFrom: ArrayLike<number>,
    edgeTo: ArrayLike<number>,
    edgeLength: ArrayLike<number>,
  ) {
    const n = nodeIds.length;
    this.nodeIds = Float64Array.from(nodeIds);
    this.lat = Float64Array.from(lat);
    this.lon = Float64Array.from(lon);
    this.index = new Map();
    for (let i = 0; i < n; i++) this.index.set(this.nodeIds[i], i);

    this.directed = buildCsr(n, edgeFrom, edgeTo, edgeLength);

    // Undirected = every directed edge in both directions
    const m = edgeFrom.length;
    const uf = new Int32Array(m * 2);
    const ut = new Int32Array(m * 2);
    const ul = new Float64Array(m * 2);
    for (let i = 0; i < m; i++) {
      uf[2 * i] = edgeFrom[i];
      ut[2 * i] = edgeTo[i];
      ul[2 * i] = edgeLength[i];
      uf[2 * i + 1] = edgeTo[i];
      ut[2 * i + 1] = edgeFrom[i];
      ul[2 * i + 1] = edgeLength[i];
    }
    this.undirected = buildCsr(n, uf, ut, ul);
  }

  get nodeCount(): number {
    return this.nodeIds.length;
  }

  /** Number of directed edges */
  get edgeCount(): number {
    return this.directed.targets.length;
  }

  indexOf(osmId: number): number | undefined {
    return this.index.get(osmId);
  }

  osmId(index: number): number {
    return this.nodeIds[index];
  }

  /** Length of the shortest directed edge u -> v, or Infinity if none */
  edgeLength(u: number, v: number): number {
    const { offsets, targets, lengths } = this.directed;
    let best = Infinity;
    for (let e = offsets[u]; e < offsets[u + 1]; e++) {
      if (targets[e] === v && lengths[e] < best) best = lengths[e];
    }
    return best;
  }
}
