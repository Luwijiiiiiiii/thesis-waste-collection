// ==========================================================
// Road network store (notebook CELL 12 caching behaviour)
//  - in-memory singleton  ≈ `if "road_graph" not in globals()`
//  - on-disk JSON cache   ≈ `ox.settings.use_cache = True`
// ==========================================================
import "server-only";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { NETWORK_TYPE, STUDY_AREA, type RoadNetworkSummary } from "@wcro/core";
import {
  buildRoadGraph,
  deserializeGraph,
  downloadDriveNetwork,
  serializeGraph,
  type RoadGraph,
  type SerializedRoadGraph,
} from "@wcro/road-network";
import { dataDir } from "./paths";

export interface LoadedNetwork {
  graph: RoadGraph;
  summary: RoadNetworkSummary;
}

interface CacheMeta {
  studyArea: string;
  networkType: string;
  boundarySource: "relation" | "bbox";
  osmRelationId?: number;
  fetchedAt: string;
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const cacheFile = () => path.join(dataDir(), "cache", `road-network-${slug(STUDY_AREA.name)}-${NETWORK_TYPE}.json`);

// Survive Next.js dev hot reloads
const globalStore = globalThis as unknown as { __wcroNetwork?: Promise<LoadedNetwork> };

async function readCache(log: (m: string) => void): Promise<LoadedNetwork | null> {
  try {
    const raw = await readFile(cacheFile(), "utf8");
    const data = JSON.parse(raw) as SerializedRoadGraph;
    const graph = deserializeGraph(data);
    const meta = data.meta as unknown as CacheMeta;
    log("Loaded road network from disk cache.");
    return {
      graph,
      summary: { ...meta, nodeCount: graph.nodeCount, edgeCount: graph.edgeCount, fromCache: true },
    };
  } catch {
    return null;
  }
}

async function download(log: (m: string) => void): Promise<LoadedNetwork> {
  log("Downloading OpenStreetMap road network...");
  const relationId = process.env.OSM_RELATION_ID ? Number(process.env.OSM_RELATION_ID) : undefined;
  const { response, boundary } = await downloadDriveNetwork(STUDY_AREA, {
    overpassUrl: process.env.OVERPASS_URL,
    nominatimUrl: process.env.NOMINATIM_URL,
    relationId,
    log,
  });
  const { graph, stats } = buildRoadGraph(response);
  log(
    `Road network built: ${stats.keptNodes.toLocaleString()} nodes, ${stats.keptEdges.toLocaleString()} edges ` +
      `(largest strongly connected component of ${stats.rawNodes.toLocaleString()} nodes).`,
  );

  const meta: CacheMeta = {
    studyArea: STUDY_AREA.name,
    networkType: NETWORK_TYPE,
    boundarySource: boundary.kind,
    osmRelationId: boundary.kind === "relation" ? boundary.relationId : undefined,
    fetchedAt: new Date().toISOString(),
  };

  try {
    await mkdir(path.dirname(cacheFile()), { recursive: true });
    await writeFile(cacheFile(), JSON.stringify(serializeGraph(graph, meta as unknown as Record<string, unknown>)));
    log("Road network cached to disk.");
  } catch (err) {
    log(`Could not write cache (${(err as Error).message}). Continuing in memory.`);
  }

  return { graph, summary: { ...meta, nodeCount: graph.nodeCount, edgeCount: graph.edgeCount, fromCache: false } };
}

export function getRoadNetwork(
  opts: { refresh?: boolean; log?: (message: string) => void } = {},
): Promise<LoadedNetwork> {
  const log = opts.log ?? ((m: string) => console.log(`[road-network] ${m}`));

  if (globalStore.__wcroNetwork && !opts.refresh) {
    return globalStore.__wcroNetwork.then((n) => {
      log("Road network already in memory. Using cached graph.");
      return { ...n, summary: { ...n.summary, fromCache: true } };
    });
  }

  const promise = (async () => (!opts.refresh && (await readCache(log))) || download(log))();
  globalStore.__wcroNetwork = promise;
  // Don't keep a rejected promise around – allow retry
  promise.catch(() => {
    if (globalStore.__wcroNetwork === promise) globalStore.__wcroNetwork = undefined;
  });
  return promise;
}

export async function getNetworkStatus() {
  const inMemory = globalStore.__wcroNetwork ? await globalStore.__wcroNetwork.catch(() => null) : null;
  let cachedOnDisk: { sizeBytes: number; modifiedAt: string } | null = null;
  try {
    const s = await stat(cacheFile());
    cachedOnDisk = { sizeBytes: s.size, modifiedAt: s.mtime.toISOString() };
  } catch {
    /* not cached */
  }
  return { inMemory: inMemory ? inMemory.summary : null, cachedOnDisk };
}
