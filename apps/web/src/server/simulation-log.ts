// ==========================================================
// Simulation logging (notebook objective: "Simulation logging")
// Every run is archived as JSON under DATA_DIR/simulations/<id>.json
// – replaces the WasteCollectionOutputs/Simulations folder.
// ==========================================================
import "server-only";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SimulationLogEntry, SimulationResult } from "@wcro/core";
import { dataDir } from "./paths";

const dir = () => path.join(dataDir(), "simulations");
const SAFE_ID = /^[A-Za-z0-9_-]+$/;

export async function saveSimulation(result: SimulationResult): Promise<string> {
  await mkdir(dir(), { recursive: true });
  const file = path.join(dir(), `${result.id}.json`);
  await writeFile(file, JSON.stringify(result));
  return file;
}

export async function getSimulation(id: string): Promise<SimulationResult | null> {
  if (!SAFE_ID.test(id)) return null;
  try {
    return JSON.parse(await readFile(path.join(dir(), `${id}.json`), "utf8")) as SimulationResult;
  } catch {
    return null;
  }
}

export async function listSimulations(): Promise<SimulationLogEntry[]> {
  let files: string[];
  try {
    files = (await readdir(dir())).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const entries = await Promise.all(
    files.map(async (f): Promise<SimulationLogEntry | null> => {
      try {
        const r = JSON.parse(await readFile(path.join(dir(), f), "utf8")) as SimulationResult;
        const distance = r.comparison.find((c) => c.metric === "distanceKm");
        return {
          id: r.id,
          createdAt: r.createdAt,
          routeName: r.routeName,
          collectionPoints: r.nodeRegistry.collectionPoints.length,
          solver: r.optimized.solver,
          traditionalKm: r.traditional.metrics.distanceKm,
          optimizedKm: r.optimized.metrics.distanceKm,
          distanceSavingsPercent: distance?.savingsPercent ?? 0,
        };
      } catch {
        return null;
      }
    }),
  );
  return entries
    .filter((e): e is SimulationLogEntry => e !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
