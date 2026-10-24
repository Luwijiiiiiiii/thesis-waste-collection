// Client for the Express API in apps/api. Used by server components and the browser.
//  - NEXT_PUBLIC_API_URL: API origin the browser calls (inlined at build time)
//  - API_URL: optional origin for server-side calls, e.g. an internal hostname in Docker
import type { SimulationLogEntry, SimulationResult, TestRunRecord } from "@wcro/core";

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export function apiUrl(path: string): string {
  const base = typeof window === "undefined" ? (process.env.API_URL ?? PUBLIC_API_URL) : PUBLIC_API_URL;
  return `${base.replace(/\/+$/, "")}/api/v1${path}`;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJson<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), { cache: "no-store" });
  } catch {
    throw new ApiError(
      0,
      `Could not reach the API at ${apiUrl("")}. Check that "pnpm dev:api" is running and its terminal shows no startup error.`,
    );
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(res.status, body.error ?? body.message ?? `API responded ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Archived runs, newest first. */
export function listSimulations(limit?: number) {
  return getJson<SimulationLogEntry[]>(`/simulations${limit ? `?limit=${limit}` : ""}`);
}

/** Full archived result, or null when the id does not exist. */
export async function getSimulation(id: string) {
  try {
    return await getJson<SimulationResult>(`/simulations/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** Numbers for every test run (the "Test all" results), newest first. */
export function listTestRuns() {
  return getJson<TestRunRecord[]>("/simulations/tests");
}

async function sendDelete<T>(path: string, body?: unknown): Promise<T | null> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: "DELETE",
      ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
    });
  } catch {
    throw new ApiError(0, `Could not reach the API at ${apiUrl("")}.`);
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    throw new ApiError(res.status, err.error ?? err.message ?? `API responded ${res.status}`);
  }
  return res.status === 204 ? null : ((await res.json()) as T);
}

/** Deletes the given runs from History. Returns how many were removed. */
export async function deleteSimulations(ids: string[]): Promise<number> {
  return (await sendDelete<{ deleted: number }>("/simulations", { ids }))?.deleted ?? 0;
}

/** Clears the whole History, real and test runs alike. Returns how many were removed. */
export async function clearSimulations(): Promise<number> {
  return (await sendDelete<{ deleted: number }>("/simulations", { all: true }))?.deleted ?? 0;
}

/** Clears every test run, keeping real runs. Returns how many were removed. */
export async function clearTestRuns(): Promise<number> {
  return (await sendDelete<{ deleted: number }>("/simulations/tests"))?.deleted ?? 0;
}
