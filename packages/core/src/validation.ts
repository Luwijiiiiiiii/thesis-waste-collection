// ==========================================================
// Module 2 – Validation Engine
// Ported from notebook CELL 9 (Validation Engine) and CELL 11
// (Validate Collection Points), merged into one shared engine that
// runs on both the client (instant feedback) and the server (enforced).
// ==========================================================
import { SUPPORTED_SCHEMA_VERSION } from "./config";
import { routeFileSchema, type RouteFile } from "./schema";

export type ValidationCheckKey =
  | "schemaVersion"
  | "metadata"
  | "garage"
  | "collectionPoints"
  | "coordinates"
  | "duplicates";

export interface ValidationCheck {
  key: ValidationCheckKey;
  label: string;
  passed: boolean;
  errors: string[];
}

export interface ValidationReport {
  /** true only when every check passed – "READY FOR SIMULATION" */
  passed: boolean;
  score: number;
  total: number;
  checks: ValidationCheck[];
  /** Typed route file, present only when passed === true */
  data?: RouteFile;
}

type Obj = Record<string, unknown>;

const isObject = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const has = (o: Obj, k: string) => o[k] !== undefined && o[k] !== null && o[k] !== "";

const REQUIRED_TOP_LEVEL = [
  "schema_version",
  "route_name",
  "study_area",
  "vehicle",
  "driver",
  "created_date",
  "garage",
  "collection_points",
] as const;

const REQUIRED_LOCATION_FIELDS = ["id", "name", "latitude", "longitude"] as const;

function checkSchemaVersion(input: Obj): string[] {
  if (!has(input, "schema_version")) return ["Missing required field: schema_version"];
  if (String(input.schema_version) !== SUPPORTED_SCHEMA_VERSION) {
    return [`Unsupported schema version "${String(input.schema_version)}" (expected "${SUPPORTED_SCHEMA_VERSION}").`];
  }
  return [];
}

function checkMetadata(input: Obj): string[] {
  const errors: string[] = [];
  for (const field of REQUIRED_TOP_LEVEL) {
    if (field === "schema_version" || field === "garage" || field === "collection_points") continue;
    if (!has(input, field)) errors.push(`Missing required field: ${field}`);
  }

  const vehicle = input.vehicle;
  if (vehicle !== undefined) {
    if (!isObject(vehicle)) {
      errors.push("vehicle must be an object");
    } else {
      for (const f of ["vehicle_id", "vehicle_name"]) {
        if (!has(vehicle, f)) errors.push(`Vehicle missing '${f}'`);
      }
      for (const f of ["average_speed_kmh", "fuel_efficiency_kmpl"]) {
        if (vehicle[f] !== undefined && (!isNumber(vehicle[f]) || (vehicle[f] as number) <= 0)) {
          errors.push(`Vehicle '${f}' must be a positive number`);
        }
      }
      for (const f of ["fuel_price_per_liter", "co2_factor"]) {
        if (vehicle[f] !== undefined && (!isNumber(vehicle[f]) || (vehicle[f] as number) < 0)) {
          errors.push(`Vehicle '${f}' must be a non-negative number`);
        }
      }
    }
  }

  const driver = input.driver;
  if (driver !== undefined) {
    if (!isObject(driver)) errors.push("driver must be an object");
    else if (!has(driver, "name")) errors.push("Driver missing 'name'");
  }
  return errors;
}

function checkGarage(input: Obj): string[] {
  if (!has(input, "garage")) return ["Missing required field: garage"];
  const garage = input.garage;
  if (!isObject(garage)) return ["garage must be an object"];
  return REQUIRED_LOCATION_FIELDS.filter((f) => !has(garage, f)).map((f) => `Garage missing '${f}'`);
}

function getPoints(input: Obj): Obj[] | null {
  return Array.isArray(input.collection_points) ? (input.collection_points as unknown[]).filter(isObject) : null;
}

function pointLabel(p: Obj, index: number) {
  return has(p, "id") ? String(p.id) : `#${index + 1}`;
}

function checkCollectionPoints(input: Obj): string[] {
  if (!has(input, "collection_points")) return ["Missing required field: collection_points"];
  if (!Array.isArray(input.collection_points)) return ["collection_points must be an array"];
  const raw = input.collection_points as unknown[];
  if (raw.length === 0) return ["No collection points found."];

  const errors: string[] = [];
  raw.forEach((p, i) => {
    if (!isObject(p)) {
      errors.push(`Collection Point #${i + 1} is not an object`);
      return;
    }
    for (const f of REQUIRED_LOCATION_FIELDS) {
      if (!has(p, f)) errors.push(`Collection Point ${pointLabel(p, i)} missing '${f}'`);
    }
  });
  return errors;
}

function checkCoordinates(input: Obj): string[] {
  const errors: string[] = [];
  const validate = (label: string, lat: unknown, lon: unknown) => {
    if (lat === undefined || lon === undefined) return; // reported by garage / points checks
    if (!isNumber(lat) || lat < -90 || lat > 90) errors.push(`Invalid latitude at ${label}`);
    if (!isNumber(lon) || lon < -180 || lon > 180) errors.push(`Invalid longitude at ${label}`);
  };

  if (isObject(input.garage)) validate("Garage", input.garage.latitude, input.garage.longitude);
  getPoints(input)?.forEach((p, i) => validate(`Point ${pointLabel(p, i)}`, p.latitude, p.longitude));
  return errors;
}

function checkDuplicates(input: Obj): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const coords = new Set<string>();

  getPoints(input)?.forEach((p) => {
    if (has(p, "id")) {
      const key = String(p.id);
      if (ids.has(key)) errors.push(`Duplicate ID: ${key}`);
      ids.add(key);
    }
    if (isNumber(p.latitude) && isNumber(p.longitude)) {
      const key = `${p.latitude},${p.longitude}`;
      if (coords.has(key)) errors.push(`Duplicate coordinate: (${p.latitude}, ${p.longitude})`);
      coords.add(key);
    }
  });

  if (isObject(input.garage) && has(input.garage, "id") && ids.has(String(input.garage.id))) {
    errors.push(`Collection point ID clashes with garage ID: ${String(input.garage.id)}`);
  }
  return errors;
}

/**
 * Validate an uploaded route definition file.
 * Accepts `unknown` so it can safely run on raw JSON.parse output.
 */
export function validateRouteFile(input: unknown): ValidationReport {
  if (!isObject(input)) {
    const checks: ValidationCheck[] = [
      { key: "schemaVersion", label: "Schema Version", passed: false, errors: ["File is not a JSON object."] },
      { key: "metadata", label: "Metadata", passed: false, errors: [] },
      { key: "garage", label: "Garage", passed: false, errors: [] },
      { key: "collectionPoints", label: "Collection Points", passed: false, errors: [] },
      { key: "coordinates", label: "Coordinate Validation", passed: false, errors: [] },
      { key: "duplicates", label: "Duplicate Check", passed: false, errors: [] },
    ];
    return { passed: false, score: 0, total: checks.length, checks };
  }

  const checks: ValidationCheck[] = [
    { key: "schemaVersion", label: "Schema Version", errors: checkSchemaVersion(input) },
    { key: "metadata", label: "Metadata", errors: checkMetadata(input) },
    { key: "garage", label: "Garage", errors: checkGarage(input) },
    { key: "collectionPoints", label: "Collection Points", errors: checkCollectionPoints(input) },
    { key: "coordinates", label: "Coordinate Validation", errors: checkCoordinates(input) },
    { key: "duplicates", label: "Duplicate Check", errors: checkDuplicates(input) },
  ].map((c) => ({ ...c, passed: c.errors.length === 0 })) as ValidationCheck[];

  let data: RouteFile | undefined;
  if (checks.every((c) => c.passed)) {
    // Final type-level parse. Anything the hand-written checks missed
    // (e.g. a string where a number is expected) lands under "Metadata".
    const parsed = routeFileSchema.safeParse(input);
    if (parsed.success) {
      data = parsed.data;
    } else {
      const metadata = checks.find((c) => c.key === "metadata")!;
      metadata.errors.push(
        ...parsed.error.issues.map((issue) => `${issue.path.join(".") || "file"}: ${issue.message}`),
      );
      metadata.passed = false;
    }
  }

  const score = checks.filter((c) => c.passed).length;
  return { passed: score === checks.length, score, total: checks.length, checks, data };
}

/** Parse a JSON string and validate it. JSON syntax errors become a failed report. */
export function validateRouteFileText(text: string): ValidationReport {
  try {
    return validateRouteFile(JSON.parse(text));
  } catch (err) {
    const report = validateRouteFile(null);
    report.checks[0].errors = [`Invalid JSON: ${(err as Error).message}`];
    return report;
  }
}
