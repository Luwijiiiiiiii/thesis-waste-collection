import { describe, expect, it } from "vitest";
import type { ResolvedVehicle } from "@wcro/core";
import { compareRoutes, computeRouteMetrics } from "./index";

const vehicle: ResolvedVehicle = {
  vehicleId: "T1",
  vehicleName: "Test truck",
  averageSpeedKmh: 23,
  fuelEfficiencyKmpl: 3.7,
  fuelPricePerLiter: 61.35,
  co2FactorKgPerLiter: 2.68,
};

describe("computeRouteMetrics", () => {
  it("keeps full precision instead of rounding mid-calculation", () => {
    const m = computeRouteMetrics(12_345.678, vehicle);
    const km = 12.345678;
    const liters = km / 3.7;
    expect(m.distanceKm).toBe(km);
    expect(m.travelTimeMin).toBe((km / 23) * 60);
    expect(m.fuelLiters).toBe(liters);
    expect(m.fuelCostPhp).toBe(liters * 61.35);
    expect(m.co2Kg).toBe(liters * 2.68);
  });
});

describe("compareRoutes", () => {
  it("computes savings from exact values", () => {
    const rows = compareRoutes(computeRouteMetrics(30_011.7, vehicle), computeRouteMetrics(16_271.3, vehicle));
    const distance = rows[0];
    expect(distance.metric).toBe("distanceKm");
    expect(distance.savings).toBeCloseTo(30.0117 - 16.2713, 12);
    expect(distance.savingsPercent).toBeCloseTo(((30.0117 - 16.2713) / 30.0117) * 100, 12);
  });

  it("gives every metric the same savings percent, since all scale with distance", () => {
    const rows = compareRoutes(computeRouteMetrics(30_011.7, vehicle), computeRouteMetrics(16_271.3, vehicle));
    for (const r of rows) expect(r.savingsPercent).toBeCloseTo(rows[0].savingsPercent, 9);
  });

  it("returns 0% when the traditional value is 0", () => {
    const rows = compareRoutes(computeRouteMetrics(0, vehicle), computeRouteMetrics(0, vehicle));
    for (const r of rows) expect(r.savingsPercent).toBe(0);
  });
});
