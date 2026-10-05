import type { TspSolver } from "@wcro/core";
import { christofidesTour } from "./christofides";
import { nearestNeighborTour, twoOpt } from "./heuristics";

export * from "./christofides";
export * from "./heuristics";
export * from "./matching";

/** Solve the stop-order TSP. Index 0 must be the garage. Returns [0, ..., 0]. */
export function solveTsp(dist: number[][], solver: TspSolver): number[] {
  switch (solver) {
    case "christofides":
      return christofidesTour(dist);
    case "christofides-2opt":
      return twoOpt(christofidesTour(dist), dist);
    case "nearest-neighbor-2opt":
      return twoOpt(nearestNeighborTour(dist), dist);
    default: {
      const never: never = solver;
      throw new Error(`Unknown solver ${String(never)}`);
    }
  }
}
