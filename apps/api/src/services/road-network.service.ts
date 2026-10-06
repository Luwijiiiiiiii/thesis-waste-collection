// ==========================================================
// Road network store (notebook CELL 12 caching behaviour)
//  - in-memory singleton  ≈ `if "road_graph" not in globals()`
//  - database cache       ≈ `ox.settings.use_cache = True`
// Ported from apps/web/src/server/network-store.ts (disk cache → Postgres).
// ==========================================================
import { NETWORK_TYPE, type RoadNetworkSummary, STUDY_AREA } from "@wcro/core";
import {
  buildRoadGraph,
  deserializeGraph,
  downloadDriveNetwork,
  type RoadGraph,
  serializeGraph,
} from "@wcro/road-network";
import { NOMINATIM_URL, OSM_RELATION_ID, OVERPASS_URL } from "../config.js";
import RoadNetworkRepo, { type RoadNetworkMeta } from "../repositories/road-network.repository.js";

export interface LoadedNetwork {
  graph: RoadGraph;
  summary: RoadNetworkSummary;
}

type Log = (message: string) => void;

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Cache key, same name the web app used for its cache file. */
export const ROAD_NETWORK_KEY = `road-network-${slug(STUDY_AREA.name)}-${NETWORK_TYPE}`;

let inMemory: Promise<LoadedNetwork> | undefined;

async function readCache(log: Log): Promise<LoadedNetwork | null> {
  try {
    const cached = await RoadNetworkRepo.get(ROAD_NETWORK_KEY);
    if (!cached) return null;
    const graph = deserializeGraph(cached.graph);
    log("Loaded road network from database cache.");
    return {
      graph,
      summary: { ...cached.meta, nodeCount: graph.nodeCount, edgeCount: graph.edgeCount, fromCache: true },
    };
  } catch (err) {
    log(`Could not read cached road network (${(err as Error).message}). Downloading instead.`);
    return null;
  }
}

async function download(log: Log): Promise<LoadedNetwork> {
  log("Downloading OpenStreetMap road network...");
  const { response, boundary } = await downloadDriveNetwork(STUDY_AREA, {
    overpassUrl: OVERPASS_URL,
    nominatimUrl: NOMINATIM_URL,
    relationId: OSM_RELATION_ID,
    log,
  });
  const { graph, stats } = buildRoadGraph(response);
  log(
    `Road network built: ${stats.keptNodes.toLocaleString()} nodes, ${stats.keptEdges.toLocaleString()} edges ` +
      `(largest strongly connected component of ${stats.rawNodes.toLocaleString()} nodes).`,
  );

  const meta: RoadNetworkMeta = {
    studyArea: STUDY_AREA.name,
    networkType: NETWORK_TYPE,
    boundarySource: boundary.kind,
    osmRelationId: boundary.kind === "relation" ? boundary.relationId : undefined,
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
    fetchedAt: new Date().toISOString(),
  };

  try {
    await RoadNetworkRepo.save(ROAD_NETWORK_KEY, meta, serializeGraph(graph, { ...meta }));
    log("Road network cached to database.");
  } catch (err) {
    log(`Could not write cache (${(err as Error).message}). Continuing in memory.`);
  }

  return { graph, summary: { ...meta, fromCache: false } };
}

export default class RoadNetworkSvc {
  static load(opts: { refresh?: boolean; log?: Log } = {}): Promise<LoadedNetwork> {
    const log = opts.log ?? ((m: string) => console.log(`[road-network] ${m}`));

    if (inMemory && !opts.refresh) {
      return inMemory.then((n) => {
        log("Road network already in memory. Using cached graph.");
        return { ...n, summary: { ...n.summary, fromCache: true } };
      });
    }

    const promise = (async () => (!opts.refresh && (await readCache(log))) || download(log))();
    inMemory = promise;
    // Don't keep a rejected promise around – allow retry
    promise.catch(() => {
      if (inMemory === promise) inMemory = undefined;
    });
    return promise;
  }

  static async status() {
    const loaded = inMemory ? await inMemory.catch(() => null) : null;
    const cached = await RoadNetworkRepo.status(ROAD_NETWORK_KEY);
    return {
      inMemory: loaded ? loaded.summary : null,
      cachedInDatabase: cached ? { sizeBytes: cached.sizeBytes, modifiedAt: cached.modifiedAt } : null,
    };
  }
}
