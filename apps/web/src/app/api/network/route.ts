// GET  /api/network          – road network status (memory / disk cache)
// POST /api/network          – preload the road network  { "refresh": true } forces a re-download
import { NextResponse } from "next/server";
import { getNetworkStatus, getRoadNetwork } from "@/server/network-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(await getNetworkStatus());
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { refresh?: boolean };
  try {
    const { summary } = await getRoadNetwork({ refresh: body.refresh === true });
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 502 });
  }
}
