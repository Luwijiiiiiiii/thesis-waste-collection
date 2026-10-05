// ==========================================================
// Module 3 – Road Network download (notebook CELL 12)
// Replaces `ox.graph_from_place(CITY_NAME, network_type="drive")`.
//
//  1. Resolve the city boundary with Nominatim (as OSMnx does)
//  2. Query Overpass for drivable ways inside that boundary
//  3. Fall back to a bounding box if the boundary cannot be resolved
// ==========================================================
import type { StudyAreaConfig } from "@wcro/core";
import type { OverpassResponse } from "./build-graph";

export const DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter";
export const DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "waste-route-optimizer/0.1 (thesis prototype)";

/**
 * Same filter OSMnx uses for network_type="drive"
 * (osmnx/_overpass.py → _get_network_filter).
 */
export const DRIVE_FILTER =
  '["highway"]["area"!~"yes"]["access"!~"private"]' +
  '["highway"!~"abandoned|bridleway|bus_guideway|construction|corridor|cycleway|elevator|escalator|footway|no|path|pedestrian|planned|platform|proposed|raceway|razed|service|steps|track"]' +
  '["motor_vehicle"!~"no"]["motorcar"!~"no"]' +
  '["service"!~"alley|driveway|emergency_access|parking|parking_aisle|private"]';

export type Boundary =
  | { kind: "relation"; relationId: number }
  | { kind: "bbox"; bbox: [number, number, number, number] };

export interface FetchOptions {
  overpassUrl?: string;
  nominatimUrl?: string;
  /** Overrides config.osmRelationId */
  relationId?: number;
  signal?: AbortSignal;
  log?: (message: string) => void;
}

export async function resolveBoundary(area: StudyAreaConfig, opts: FetchOptions = {}): Promise<Boundary> {
  const relationId = opts.relationId ?? area.osmRelationId;
  if (relationId) return { kind: "relation", relationId };

  try {
    const url = new URL(opts.nominatimUrl ?? DEFAULT_NOMINATIM_URL);
    url.searchParams.set("q", area.placeQuery);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "5");
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal: opts.signal });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    const results = (await res.json()) as { osm_type: string; osm_id: number; category?: string; type?: string }[];
    const match =
      results.find((r) => r.osm_type === "relation" && (r.category === "boundary" || r.type === "administrative")) ??
      results.find((r) => r.osm_type === "relation");
    if (match) {
      opts.log?.(`Boundary resolved via Nominatim: relation ${match.osm_id}`);
      return { kind: "relation", relationId: match.osm_id };
    }
    opts.log?.("Nominatim returned no boundary relation; using fallback bounding box.");
  } catch (err) {
    opts.log?.(`Boundary lookup failed (${(err as Error).message}); using fallback bounding box.`);
  }
  return { kind: "bbox", bbox: area.fallbackBBox };
}

export function buildOverpassQuery(boundary: Boundary): string {
  if (boundary.kind === "relation") {
    // Overpass area ids for relations are 3 600 000 000 + relation id
    const areaId = 3_600_000_000 + boundary.relationId;
    return `[out:json][timeout:180];
area(${areaId})->.searchArea;
(
  way${DRIVE_FILTER}(area.searchArea);
);
(._;>;);
out body qt;`;
  }
  const [s, w, n, e] = boundary.bbox;
  return `[out:json][timeout:180];
(
  way${DRIVE_FILTER}(${s},${w},${n},${e});
);
(._;>;);
out body qt;`;
}

export async function fetchOverpass(query: string, opts: FetchOptions = {}): Promise<OverpassResponse> {
  const res = await fetch(opts.overpassUrl ?? DEFAULT_OVERPASS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
    body: new URLSearchParams({ data: query }).toString(),
    signal: opts.signal,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Overpass API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as OverpassResponse;
}

/** Resolve boundary and download drivable roads. Retries with the bbox if the area query is empty. */
export async function downloadDriveNetwork(
  area: StudyAreaConfig,
  opts: FetchOptions = {},
): Promise<{ response: OverpassResponse; boundary: Boundary }> {
  let boundary = await resolveBoundary(area, opts);
  opts.log?.(`Querying Overpass (${boundary.kind})...`);
  let response = await fetchOverpass(buildOverpassQuery(boundary), opts);

  if (boundary.kind === "relation" && !response.elements.some((e) => e.type === "way")) {
    opts.log?.("Area query returned no roads; retrying with bounding box.");
    boundary = { kind: "bbox", bbox: area.fallbackBBox };
    response = await fetchOverpass(buildOverpassQuery(boundary), opts);
  }
  return { response, boundary };
}
