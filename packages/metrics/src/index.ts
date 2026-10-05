// ==========================================================
// Module 6 – Performance Evaluation
// (Listed in the notebook objective: distance, travel time, fuel
//  consumption, fuel cost, CO2 emissions. Not yet coded in the
//  notebook – implemented here.)
// ==========================================================
import type { ComparisonRow, ResolvedVehicle, RouteMetrics } from "@wcro/core";

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/**
 *  distance_km  = route length / 1000
 *  time_min     = distance_km / average_speed_kmh × 60
 *  fuel_L       = distance_km / fuel_efficiency_kmpl
 *  cost_PHP     = fuel_L × fuel_price_per_liter
 *  co2_kg       = fuel_L × co2_factor
 */
export function computeRouteMetrics(distanceM: number, vehicle: ResolvedVehicle): RouteMetrics {
  const distanceKm = distanceM / 1000;
  const fuelLiters = distanceKm / vehicle.fuelEfficiencyKmpl;
  return {
    distanceKm: round(distanceKm, 3),
    travelTimeMin: round((distanceKm / vehicle.averageSpeedKmh) * 60),
    fuelLiters: round(fuelLiters, 3),
    fuelCostPhp: round(fuelLiters * vehicle.fuelPricePerLiter),
    co2Kg: round(fuelLiters * vehicle.co2FactorKgPerLiter, 3),
  };
}

export const METRIC_DEFINITIONS: { metric: keyof RouteMetrics; label: string; unit: string }[] = [
  { metric: "distanceKm", label: "Total Distance", unit: "km" },
  { metric: "travelTimeMin", label: "Travel Time", unit: "min" },
  { metric: "fuelLiters", label: "Fuel Consumption", unit: "L" },
  { metric: "fuelCostPhp", label: "Fuel Cost", unit: "PHP" },
  { metric: "co2Kg", label: "CO₂ Emissions", unit: "kg" },
];

/** Traditional vs optimized comparison table. Positive savings = optimized is better. */
export function compareRoutes(traditional: RouteMetrics, optimized: RouteMetrics): ComparisonRow[] {
  return METRIC_DEFINITIONS.map(({ metric, label, unit }) => {
    const t = traditional[metric];
    const o = optimized[metric];
    const savings = t - o;
    return {
      metric,
      label,
      unit,
      traditional: t,
      optimized: o,
      savings: round(savings, 3),
      savingsPercent: t === 0 ? 0 : round((savings / t) * 100),
    };
  });
}
