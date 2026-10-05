import { describe, expect, it } from "vitest";
import sample from "../../../apps/web/public/samples/baguio-sample-route.json";
import { validateRouteFile, validateRouteFileText } from "./validation";

describe("validation engine", () => {
  it("passes the bundled sample file (6/6)", () => {
    const r = validateRouteFile(sample);
    expect(r.checks.flatMap((c) => c.errors)).toEqual([]);
    expect(r.score).toBe(6);
    expect(r.passed).toBe(true);
    expect(r.data?.collection_points.length).toBeGreaterThan(0);
  });

  it("reports duplicates, bad coordinates and unsupported version", () => {
    const bad = structuredClone(sample) as any;
    bad.schema_version = "2.0";
    bad.collection_points[1].id = bad.collection_points[0].id;
    bad.collection_points[2].latitude = 123;
    delete bad.garage.name;
    const r = validateRouteFile(bad);
    expect(r.passed).toBe(false);
    const byKey = Object.fromEntries(r.checks.map((c) => [c.key, c]));
    expect(byKey.schemaVersion.passed).toBe(false);
    expect(byKey.duplicates.errors[0]).toMatch(/Duplicate ID/);
    expect(byKey.coordinates.errors[0]).toMatch(/Invalid latitude/);
    expect(byKey.garage.errors).toContain("Garage missing 'name'");
    expect(r.data).toBeUndefined();
  });

  it("handles invalid JSON text", () => {
    const r = validateRouteFileText("{ nope");
    expect(r.passed).toBe(false);
    expect(r.checks[0].errors[0]).toMatch(/Invalid JSON/);
  });
});
