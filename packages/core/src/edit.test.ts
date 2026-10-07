import { describe, expect, it } from "vitest";
import { applyRouteDetails, applyStopInfo } from "./edit";
import type { RouteFile } from "./schema";

const file: RouteFile = {
  schema_version: "1.0",
  route_name: "Loop",
  study_area: "City of Baguio",
  vehicle: { vehicle_id: "GT-001", vehicle_name: "Garbage Truck", fuel_price_per_liter: 56.3 },
  driver: { name: "Ana" },
  created_date: "2026-10-03",
  garage: { id: "G-01", name: "Garage", latitude: 16.41, longitude: 120.59 },
  collection_points: [
    { id: "CP-01", name: "Market", latitude: 16.42, longitude: 120.6, waste_type: "Residual", priority: "High" },
    { id: "CP-02", name: "Park", latitude: 16.4, longitude: 120.61 },
  ],
};

describe("applyRouteDetails", () => {
  it("changes only the given fields", () => {
    const next = applyRouteDetails(file, { driver_name: "Ben", vehicle: { fuel_price_per_liter: 60 } });
    expect(next.driver).toEqual({ name: "Ben" });
    expect(next.vehicle).toEqual({ vehicle_id: "GT-001", vehicle_name: "Garbage Truck", fuel_price_per_liter: 60 });
    expect(next.route_name).toBe("Loop");
    expect(file.driver.name).toBe("Ana");
  });

  it("clears a vehicle value so the default applies", () => {
    const next = applyRouteDetails(file, { vehicle: { fuel_price_per_liter: undefined } });
    expect(next.vehicle.fuel_price_per_liter).toBeUndefined();
  });
});

describe("applyStopInfo", () => {
  it("edits one collection point by index", () => {
    const next = applyStopInfo(file, 1, { name: "Burnham Park", priority: "Low" });
    expect(next.collection_points[1]).toMatchObject({ id: "CP-02", name: "Burnham Park", priority: "Low" });
    expect(next.collection_points[0]).toBe(file.collection_points[0]);
  });

  it("edits the garage and ignores waste type and priority for it", () => {
    const next = applyStopInfo(file, "garage", { name: "Depot", waste_type: "Residual" });
    expect(next.garage).toEqual({ id: "G-01", name: "Depot", latitude: 16.41, longitude: 120.59 });
  });
});
