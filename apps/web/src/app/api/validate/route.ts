// POST /api/validate – run the validation engine on a raw route file (JSON body)
import { NextResponse } from "next/server";
import { validateRouteFile, validateRouteFileText } from "@wcro/core";

export async function POST(request: Request) {
  const text = await request.text();
  const report = text.trim().startsWith("{") ? validateRouteFileText(text) : validateRouteFile(null);
  // Don't echo the parsed data back
  const { data: _data, ...rest } = report;
  return NextResponse.json(rest, { status: report.passed ? 200 : 422 });
}
