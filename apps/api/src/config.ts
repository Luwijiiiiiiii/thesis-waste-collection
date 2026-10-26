import "dotenv/config";

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/wcro";
export const PORT = Number(process.env.PORT || 3001);
export const isDev = process.env.NODE_ENV !== "production";
export const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
/**
 * Committed OpenStreetMap road network snapshot (see scripts/update-road-network.ts).
 * Resolved from this file, so it works from src/ (tsx) and from the bundled dist/server.js alike.
 */
export const ROAD_NETWORK_FILE = new URL("../data/road-network.json.gz", import.meta.url);
/** Request body limit; route files with many collection points exceed express's 100kb default. */
export const BODY_LIMIT = process.env.BODY_LIMIT || "5mb";
/**
 * Write/simulate requests per IP per 15 minutes in production. "Test all" alone sends one simulate per bundled
 * test route (100+), so the limit must leave room for a few full test batches.
 */
export const RATE_LIMIT = Number(process.env.RATE_LIMIT || 1000);
