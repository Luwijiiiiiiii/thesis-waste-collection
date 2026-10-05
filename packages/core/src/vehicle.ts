import { VEHICLE_DEFAULTS } from "./config";
import type { RouteFile } from "./schema";
import type { ResolvedVehicle } from "./types";

/**
 * Merge vehicle values from the route file over the configured defaults.
 * (The notebook had two sources — hardcoded CELL 4 values and the JSON
 * values shown in CELL 10. Here the route file always wins.)
 */
export function resolveVehicle(routeFile: RouteFile): ResolvedVehicle {
  const v = routeFile.vehicle;
  return {
    vehicleId: String(v.vehicle_id),
    vehicleName: v.vehicle_name || VEHICLE_DEFAULTS.vehicleName,
    averageSpeedKmh: v.average_speed_kmh ?? VEHICLE_DEFAULTS.averageSpeedKmh,
    fuelEfficiencyKmpl: v.fuel_efficiency_kmpl ?? VEHICLE_DEFAULTS.fuelEfficiencyKmpl,
    fuelPricePerLiter: v.fuel_price_per_liter ?? VEHICLE_DEFAULTS.fuelPricePerLiter,
    co2FactorKgPerLiter: v.co2_factor ?? VEHICLE_DEFAULTS.co2FactorKgPerLiter,
  };
}
