import "server-only";
import path from "node:path";

/** Root for runtime data (road-network cache, simulation logs). */
export function dataDir(): string {
  // turbopackIgnore: runtime data folder, not part of the build output
  return path.resolve(/*turbopackIgnore: true*/ process.env.DATA_DIR ?? path.join(process.cwd(), ".data"));
}
