// ==========================================================
// Route Definition File schema (JSON, schema_version "1.0")
// Mirrors the fields read by notebook CELLS 9–10.
// ==========================================================
import { z } from "zod";

const latitude = z.number().min(-90, "Latitude must be ≥ -90").max(90, "Latitude must be ≤ 90");
const longitude = z.number().min(-180, "Longitude must be ≥ -180").max(180, "Longitude must be ≤ 180");
const id = z.union([z.string().min(1), z.number()]);

export const vehicleSchema = z.object({
  vehicle_id: id,
  vehicle_name: z.string().min(1),
  average_speed_kmh: z.number().positive().optional(),
  fuel_efficiency_kmpl: z.number().positive().optional(),
  fuel_price_per_liter: z.number().nonnegative().optional(),
  co2_factor: z.number().nonnegative().optional(),
});

export const driverSchema = z.object({
  name: z.string().min(1),
});

export const garageSchema = z.object({
  id,
  name: z.string().min(1),
  latitude,
  longitude,
});

export const collectionPointSchema = z.object({
  id,
  name: z.string().min(1),
  latitude,
  longitude,
  waste_type: z.string().optional(),
  priority: z.union([z.string(), z.number()]).optional(),
});

export const routeFileSchema = z.object({
  schema_version: z.literal("1.0"),
  route_name: z.string().min(1),
  study_area: z.string().min(1),
  vehicle: vehicleSchema,
  driver: driverSchema,
  created_date: z.string().min(1),
  garage: garageSchema,
  collection_points: z.array(collectionPointSchema).min(1, "No collection points found."),
});

export type RouteFile = z.infer<typeof routeFileSchema>;
export type Garage = z.infer<typeof garageSchema>;
export type CollectionPoint = z.infer<typeof collectionPointSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
