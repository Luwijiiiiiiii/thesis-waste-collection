// Replaces the JSON files under apps/web/.data/simulations.
import type { RouteMetrics, SimulationLogEntry, SimulationResult, TestRunRecord, TspSolver } from "@wcro/core";
import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../utils/prisma.js";

export default class SimulationRepo {
  static table() {
    return prisma.simulation;
  }

  static async save(result: SimulationResult, isTest = false) {
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
      isTest,
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
      isTest: r.isTest,
    }));
  }

  /** Deletes the given runs. Returns how many were removed (unknown ids are skipped). */
  static async deleteMany(ids: string[]): Promise<number> {
    const { count } = await SimulationRepo.table().deleteMany({ where: { id: { in: ids } } });
    return count;
  }

  /** Clears the whole history, or only the test runs when `onlyTests` is set. Returns how many were removed. */
  static async deleteAll(onlyTests = false): Promise<number> {
    const { count } = await SimulationRepo.table().deleteMany({ where: onlyTests ? { isTest: true } : {} });
    return count;
  }

  /**
   * Numbers for every test run, newest first. The metrics are pulled out of the stored JSON by Postgres,
   * so the route polylines (the bulk of each result) never leave the database.
   */
  static async listTestRuns(): Promise<TestRunRecord[]> {
    const rows = await prisma.$queryRaw<
      {
        id: string;
        created_at: Date;
        route_name: string;
        collection_points: number;
        solver: string | null;
        t: RouteMetrics;
        o: RouteMetrics;
        t_ms: number;
        o_ms: number;
      }[]
    >`SELECT id, created_at, route_name, collection_points, solver,
             result->'traditional'->'metrics' AS t,
             result->'optimized'->'metrics' AS o,
             COALESCE((result->'traditional'->>'computeTimeMs')::float, 0) AS t_ms,
             COALESCE((result->'optimized'->>'computeTimeMs')::float, 0) AS o_ms
      FROM simulations
      WHERE is_test = true
      ORDER BY created_at DESC`;
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.created_at.toISOString(),
      routeName: r.route_name,
      collectionPoints: r.collection_points,
      solver: (r.solver ?? undefined) as TspSolver | undefined,
      traditional: r.t,
      optimized: r.o,
      traditionalComputeMs: Number(r.t_ms),
      optimizedComputeMs: Number(r.o_ms),
    }));
  }
}
