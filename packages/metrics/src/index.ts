// ==========================================================
// Module 6 – Performance Evaluation
// (Listed in the notebook objective: distance, travel time, fuel
//  consumption, fuel cost, CO2 emissions. Not yet coded in the
//  notebook – implemented here.)
// ==========================================================
import type { ComparisonRow, ResolvedVehicle, RouteMetrics } from "@wcro/core";

// Values are kept at full precision here. Rounding happens only when
// they are displayed, so every figure on screen comes from exact inputs.

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
    distanceKm,
    travelTimeMin: (distanceKm / vehicle.averageSpeedKmh) * 60,
    fuelLiters,
    fuelCostPhp: fuelLiters * vehicle.fuelPricePerLiter,
    co2Kg: fuelLiters * vehicle.co2FactorKgPerLiter,
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
      savings,
      savingsPercent: t === 0 ? 0 : (savings / t) * 100,
    };
  });
}
