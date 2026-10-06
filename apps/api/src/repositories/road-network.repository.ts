// Replaces the on-disk cache file apps/web/.data/cache/road-network-*.json.
// The serialized graph is stored gzipped (about 3 MB of JSON → well under 1 MB).
import { gunzipSync, gzipSync } from "node:zlib";
import type { SerializedRoadGraph } from "@wcro/road-network";
import { prisma } from "../utils/prisma.js";

export interface RoadNetworkMeta {
  studyArea: string;
  networkType: string;
  boundarySource: "relation" | "bbox";
  osmRelationId?: number;
  nodeCount: number;
  edgeCount: number;
  fetchedAt: string;
}

export default class RoadNetworkRepo {
  static table() {
    return prisma.roadNetwork;
  }

  static async get(key: string): Promise<{ meta: RoadNetworkMeta; graph: SerializedRoadGraph } | null> {
    const row = await RoadNetworkRepo.table().findUnique({ where: { key } });
    if (!row) return null;
    return {
      meta: RoadNetworkRepo.toMeta(row),
      graph: JSON.parse(gunzipSync(row.graph).toString("utf8")) as SerializedRoadGraph,
    };
  }

  /** Cache status without loading the graph blob. */
  static async status(key: string) {
    const row = await RoadNetworkRepo.table().findUnique({ where: { key }, omit: { graph: true } });
    return row
      ? { ...RoadNetworkRepo.toMeta(row), sizeBytes: row.sizeBytes, modifiedAt: row.updatedAt.toISOString() }
      : null;
  }

  static async save(key: string, meta: RoadNetworkMeta, graph: SerializedRoadGraph) {
    const blob = new Uint8Array(gzipSync(JSON.stringify(graph)));
    const data = {
      studyArea: meta.studyArea,
      networkType: meta.networkType,
      boundarySource: meta.boundarySource,
      osmRelationId: meta.osmRelationId ?? null,
      nodeCount: meta.nodeCount,
      edgeCount: meta.edgeCount,
      fetchedAt: new Date(meta.fetchedAt),
      graph: blob,
      sizeBytes: blob.byteLength,
    };
    await RoadNetworkRepo.table().upsert({ where: { key }, create: { key, ...data }, update: data });
  }

  private static toMeta(row: {
    studyArea: string;
    networkType: string;
    boundarySource: string;
    osmRelationId: number | null;
    nodeCount: number;
    edgeCount: number;
    fetchedAt: Date;
  }): RoadNetworkMeta {
    return {
      studyArea: row.studyArea,
      networkType: row.networkType,
      boundarySource: row.boundarySource === "relation" ? "relation" : "bbox",
      osmRelationId: row.osmRelationId ?? undefined,
      nodeCount: row.nodeCount,
      edgeCount: row.edgeCount,
      fetchedAt: row.fetchedAt.toISOString(),
    };
  }
}
