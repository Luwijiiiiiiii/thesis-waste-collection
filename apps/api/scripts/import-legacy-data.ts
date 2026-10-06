// One-time import of the web app's file-based data into Postgres:
//   <dir>/simulations/*.json             → simulations table
//   <dir>/cache/road-network-*.json      → road_networks table
//
// Usage: pnpm --filter @wcro/api db:import-legacy [dir]   (default: ../web/.data)
// Safe to re-run: rows are upserted by id / key. The source files are left untouched.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SimulationResult } from "@wcro/core";
import { deserializeGraph, type SerializedRoadGraph } from "@wcro/road-network";
import RoadNetworkRepo, { type RoadNetworkMeta } from "../src/repositories/road-network.repository.js";
import SimulationRepo from "../src/repositories/simulation.repository.js";
import { disconnectFromDatabase } from "../src/utils/prisma.js";

const dataDir = path.resolve(process.argv[2] ?? path.join(import.meta.dirname, "../../web/.data"));

async function jsonFiles(dir: string) {
  try {
    return (await readdir(dir)).filter((f) => f.endsWith(".json")).map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

async function importSimulations() {
  const files = await jsonFiles(path.join(dataDir, "simulations"));
  let imported = 0;
  for (const file of files) {
    try {
      const result = JSON.parse(await readFile(file, "utf8")) as SimulationResult;
      await SimulationRepo.save(result);
      imported++;
    } catch (err) {
      console.warn(`  skipped ${path.basename(file)}: ${(err as Error).message}`);
    }
  }
  console.log(`Simulations: imported ${imported} of ${files.length}.`);
}

async function importRoadNetworks() {
  const files = (await jsonFiles(path.join(dataDir, "cache"))).filter((f) =>
    path.basename(f).startsWith("road-network-"),
  );
  for (const file of files) {
    const key = path.basename(file, ".json");
    const graph = JSON.parse(await readFile(file, "utf8")) as SerializedRoadGraph;
    const meta = graph.meta as unknown as Omit<RoadNetworkMeta, "nodeCount" | "edgeCount">;
    // Rebuild once so the counts match what the app reports for a loaded graph
    const { nodeCount, edgeCount } = deserializeGraph(graph);
    await RoadNetworkRepo.save(key, { ...meta, nodeCount, edgeCount }, graph);
    console.log(
      `Road network: imported ${key} (${nodeCount.toLocaleString()} nodes, ${edgeCount.toLocaleString()} edges).`,
    );
  }
  if (files.length === 0) console.log("Road network: no cache file found.");
}

console.log(`Importing from ${dataDir}`);
try {
  await importSimulations();
  await importRoadNetworks();
} finally {
  await disconnectFromDatabase();
}
