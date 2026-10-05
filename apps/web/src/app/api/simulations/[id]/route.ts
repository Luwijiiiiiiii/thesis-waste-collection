// GET /api/simulations/:id – full archived SimulationResult
import { NextResponse } from "next/server";
import { getSimulation } from "@/server/simulation-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getSimulation(id);
  if (!result) return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  return NextResponse.json(result);
}
