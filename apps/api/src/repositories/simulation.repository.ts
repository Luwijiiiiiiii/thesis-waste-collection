// Replaces the JSON files under apps/web/.data/simulations.
import type { SimulationLogEntry, SimulationResult, TspSolver } from "@wcro/core";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../utils/prisma.js";

export default class SimulationRepo {
  static table() {
    return prisma.simulation;
  }

  static async save(result: SimulationResult) {
    const distance = result.comparison.find((c) => c.metric === "distanceKm");
    const summary = {
      createdAt: new Date(result.createdAt),
      routeName: result.routeName,
      studyArea: result.studyArea,
      collectionPoints: result.nodeRegistry.collectionPoints.length,
      solver: result.optimized.solver ?? null,
      traditionalKm: result.traditional.metrics.distanceKm,
      optimizedKm: result.optimized.metrics.distanceKm,
      distanceSavingsPercent: distance?.savingsPercent ?? 0,
      result: result as unknown as Prisma.InputJsonValue,
    };
    await SimulationRepo.table().upsert({
      where: { id: result.id },
      create: { id: result.id, ...summary },
      update: summary,
    });
    return result.id;
  }

  static async getById(id: string): Promise<SimulationResult | null> {
    const row = await SimulationRepo.table().findUnique({ where: { id }, select: { result: true } });
    return row ? (row.result as unknown as SimulationResult) : null;
  }

  /** Newest first; reads only the summary columns. */
  static async list(limit?: number): Promise<SimulationLogEntry[]> {
    const rows = await SimulationRepo.table().findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      omit: { result: true, studyArea: true },
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      routeName: r.routeName,
      collectionPoints: r.collectionPoints,
      solver: (r.solver ?? undefined) as TspSolver | undefined,
      traditionalKm: r.traditionalKm,
      optimizedKm: r.optimizedKm,
      distanceSavingsPercent: r.distanceSavingsPercent,
    }));
  }
}
