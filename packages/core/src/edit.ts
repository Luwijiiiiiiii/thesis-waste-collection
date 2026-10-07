// ==========================================================
// Editing a route's details after it was uploaded or drawn.
// Coordinates are not edited here: they come from the file or the map.
// ==========================================================
import type { RouteFile, Vehicle } from "./schema";

/** Route-level fields the details form can change */
export interface RouteDetailsPatch {
  route_name?: string;
  driver_name?: string;
  /** A numeric field set to undefined falls back to VEHICLE_DEFAULTS */
  vehicle?: Partial<Vehicle>;
}

/** Fields of the garage or a collection point the points table can change */
export interface StopInfo {
  id?: string;
  name?: string;
  waste_type?: string;
  priority?: string;
}

/** Which row of the points table: the garage or a collection point by list index */
export type StopTarget = "garage" | number;

export function applyRouteDetails(file: RouteFile, patch: RouteDetailsPatch): RouteFile {
  return {
    ...file,
    route_name: patch.route_name ?? file.route_name,
    driver: patch.driver_name === undefined ? file.driver : { ...file.driver, name: patch.driver_name },
    vehicle: patch.vehicle ? { ...file.vehicle, ...patch.vehicle } : file.vehicle,
  };
}

export function applyStopInfo(file: RouteFile, target: StopTarget, patch: StopInfo): RouteFile {
  if (target === "garage") {
    // The garage has no waste type or priority
    const { waste_type: _w, priority: _p, ...garage } = patch;
    return { ...file, garage: { ...file.garage, ...garage } };
  }
  return {
    ...file,
    collection_points: file.collection_points.map((p, i) => (i === target ? { ...p, ...patch } : p)),
  };
}
