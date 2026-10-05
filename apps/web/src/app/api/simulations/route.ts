// GET /api/simulations – archived simulation runs (newest first)
import { NextResponse } from "next/server";
import { listSimulations } from "@/server/simulation-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await listSimulations());
}
