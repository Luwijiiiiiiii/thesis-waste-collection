// ==========================================================
// Road network (notebook CELL 12)
// Loads the committed OpenStreetMap snapshot (data/road-network.json.gz) once and keeps it in memory,
// so every run uses the same roads and the API never calls OpenStreetMap.
// Refresh the snapshot with `pnpm --filter @wcro/api network:update`.
// ==========================================================
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import type { RoadNetworkSummary } from "@wcro/core";
import { deserializeGraph, type RoadGraph, type SerializedRoadGraph } from "@wcro/road-network";
import { ROAD_NETWORK_FILE } from "../config.js";

export interface LoadedNetwork {
  graph: RoadGraph;
  summary: RoadNetworkSummary;
}

let loaded: LoadedNetwork | undefined;

export default class RoadNetworkSvc {
  static load(): LoadedNetwork {
    if (!loaded) {
      const data = JSON.parse(gunzipSync(readFileSync(ROAD_NETWORK_FILE)).toString("utf8")) as SerializedRoadGraph;
      loaded = { graph: deserializeGraph(data), summary: data.meta as unknown as RoadNetworkSummary };
    }
    return loaded;
  }
}
