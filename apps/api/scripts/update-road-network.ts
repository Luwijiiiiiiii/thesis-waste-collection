// Downloads the study area's drivable road network from OpenStreetMap and saves it as the snapshot the API loads
// (data/road-network.json.gz). Only needed to refresh the map data: `pnpm --filter @wcro/api network:update`.
// Commit the new file; every simulation after that runs on the new roads.
// OVERPASS_URL / NOMINATIM_URL switch to other OpenStreetMap servers when the public ones are busy.
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { NETWORK_TYPE, type RoadNetworkSummary, STUDY_AREA } from "@wcro/core";
import { buildRoadGraph, downloadDriveNetwork, serializeGraph } from "@wcro/road-network";
import { ROAD_NETWORK_FILE } from "../src/config.js";

const log = (message: string) => console.log(`[road-network] ${message}`);

log(`Downloading OpenStreetMap road network for ${STUDY_AREA.name}...`);
const { response, boundary } = await downloadDriveNetwork(STUDY_AREA, {
  overpassUrl: process.env.OVERPASS_URL || undefined,
  nominatimUrl: process.env.NOMINATIM_URL || undefined,
  log,
});
const { graph, stats } = buildRoadGraph(response);
log(
  `Road network built: ${stats.keptNodes.toLocaleString()} nodes, ${stats.keptEdges.toLocaleString()} edges ` +
    `(largest strongly connected component of ${stats.rawNodes.toLocaleString()} nodes).`,
);

const meta: RoadNetworkSummary = {
  studyArea: STUDY_AREA.name,
  networkType: NETWORK_TYPE,
  boundarySource: boundary.kind,
  osmRelationId: boundary.kind === "relation" ? boundary.relationId : undefined,
  nodeCount: graph.nodeCount,
  edgeCount: graph.edgeCount,
  fetchedAt: new Date().toISOString(),
};

const file = fileURLToPath(ROAD_NETWORK_FILE);
mkdirSync(fileURLToPath(new URL(".", ROAD_NETWORK_FILE)), { recursive: true });
const blob = gzipSync(JSON.stringify(serializeGraph(graph, { ...meta })));
writeFileSync(file, blob);
log(`Saved ${(blob.byteLength / 1024).toFixed(0)} KB to ${file}`);
