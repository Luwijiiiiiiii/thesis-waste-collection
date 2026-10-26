// Runs one bundled test route through POST /api/v1/simulate with `test: true`, so the API archives it as a test run.
import type { SimulationEvent, SimulationResult, TspSolver } from "@wcro/core";
import { apiUrl } from "@/lib/api";
import { RATE_LIMIT_MESSAGE, retryAfterSeconds } from "@/lib/rate-limit";

export interface TestFileEntry {
  file: string;
  name: string;
  points: number;
}

/** The list of bundled test files, written next to them in public/test-routes. */
export async function loadManifest(signal?: AbortSignal): Promise<TestFileEntry[]> {
  const res = await fetch("/test-routes/manifest.json", { cache: "no-store", signal });
  if (!res.ok) throw new Error("Could not load the test file list (public/test-routes/manifest.json).");
  return (await res.json()) as TestFileEntry[];
}

export async function loadTestFile(file: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(`/test-routes/${encodeURIComponent(file)}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`Could not load ${file}.`);
  return res.json();
}

/** `retryAfterSeconds` is set when the API rate limit was hit, so the same test can be sent again after waiting */
export type TestRunOutcome =
  | { ok: true; result: SimulationResult }
  | { ok: false; message: string; retryAfterSeconds?: number };

export async function runTestSimulation(
  routeFile: unknown,
  solver: TspSolver,
  signal: AbortSignal,
): Promise<TestRunOutcome> {
  let res: Response;
  try {
    res = await fetch(apiUrl("/simulate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ routeFile, solver, test: true }),
      signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    return { ok: false, message: `Could not reach the API at ${apiUrl("")}.` };
  }
  if (!res.ok || !res.body) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (res.status === 429)
      return { ok: false, message: RATE_LIMIT_MESSAGE, retryAfterSeconds: retryAfterSeconds(res) };
    return { ok: false, message: body.error ?? `Server responded ${res.status}` };
  }

  let result: SimulationResult | undefined;
  let error: string | undefined;
  let notArchived: string | undefined;
  const handle = (event: SimulationEvent) => {
    if (event.type === "result") result = event.result;
    else if (event.type === "error") error = [event.message, ...(event.details ?? [])].join(" ");
    else if (event.stage === "archive" && event.detail?.startsWith("Not archived")) notArchived = event.detail;
  };

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    for (let nl = buffer.indexOf("\n"); nl >= 0; nl = buffer.indexOf("\n")) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) handle(JSON.parse(line) as SimulationEvent);
    }
  }
  if (buffer.trim()) handle(JSON.parse(buffer) as SimulationEvent);

  if (error) return { ok: false, message: error };
  // A test that was not saved would be missing from History and the dashboard
  if (notArchived) return { ok: false, message: notArchived };
  if (!result) return { ok: false, message: "The run ended without a result." };
  return { ok: true, result };
}
