// POST /api/simulate  { routeFile, solver? }
// Streams newline-delimited JSON (SimulationEvent) so the UI can show
// progress for each module, ending with a "result" or "error" event.
import { TSP_SOLVERS, type SimulationEvent, type TspSolver } from "@wcro/core";
import { runSimulation } from "@/server/run-simulation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  let body: { routeFile?: unknown; solver?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be JSON: { routeFile, solver? }" }, { status: 400 });
  }
  const solver = TSP_SOLVERS.some((s) => s.value === body.solver) ? (body.solver as TspSolver) : undefined;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SimulationEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        for await (const event of runSimulation({ routeFile: body.routeFile, solver })) send(event);
      } catch (err) {
        console.error("[simulate]", err);
        send({ type: "error", message: (err as Error).message || "Simulation failed." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
