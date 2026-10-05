// ==========================================================
// Module 1 – Configuration
// Ported from notebook CELL 4 (Configuration and Helper Functions)
// ==========================================================

export interface StudyAreaConfig {
  /** Human-readable name shown in the UI */
  name: string;
  /** Free-text query sent to Nominatim to find the administrative boundary (OSMnx used "City of Baguio") */
  placeQuery: string;
  /**
   * Optional OSM relation id of the boundary. When set, Nominatim is skipped.
   * Can also be overridden at runtime with the OSM_RELATION_ID env variable.
   */
  osmRelationId?: number;
  /** Fallback bounding box [south, west, north, east] used if the boundary lookup fails */
  fallbackBBox: [number, number, number, number];
  /** Map center [lat, lon] for the frontend */
  mapCenter: [number, number];
}

export type NetworkType = "drive";

export interface VehicleDefaults {
  vehicleName: string;
  /** km/h */
  averageSpeedKmh: number;
  /** km per liter */
  fuelEfficiencyKmpl: number;
  /** PHP per liter */
  fuelPricePerLiter: number;
  /** kg CO2 per liter of diesel */
  co2FactorKgPerLiter: number;
}

export const STUDY_AREA: StudyAreaConfig = {
  name: "City of Baguio",
  placeQuery: "City of Baguio, Benguet, Philippines",
  fallbackBBox: [16.355, 120.545, 16.445, 120.64],
  mapCenter: [16.4123, 120.596],
};

/** "drive" = roads accessible to garbage collection vehicles (same filter OSMnx uses) */
export const NETWORK_TYPE: NetworkType = "drive";

/**
 * Default vehicle parameters (notebook CELL 4).
 * Precedence rule: values inside the uploaded route file's `vehicle` object
 * override these defaults. Missing values fall back to these.
 */
export const VEHICLE_DEFAULTS: VehicleDefaults = {
  vehicleName: "Garbage Truck",
  averageSpeedKmh: 16.0,
  fuelEfficiencyKmpl: 1.0,
  fuelPricePerLiter: 56.3,
  co2FactorKgPerLiter: 2.68,
};

/** Only this route-file schema version is accepted (notebook validate_schema) */
export const SUPPORTED_SCHEMA_VERSION = "1.0";

/**
 * A collection point whose nearest drivable road node is farther than this
 * is flagged as a warning (it is probably outside the study area or mistyped).
 */
export const SNAP_WARNING_DISTANCE_M = 300;

export type TspSolver = "christofides" | "christofides-2opt" | "nearest-neighbor-2opt";

export const TSP_SOLVERS: { value: TspSolver; label: string; description: string }[] = [
  {
    value: "christofides",
    label: "Christofides (thesis default)",
    description: "Same approximation algorithm used in the notebook (networkx christofides).",
  },
  {
    value: "christofides-2opt",
    label: "Christofides + 2-opt",
    description: "Christofides tour improved with 2-opt local search.",
  },
  {
    value: "nearest-neighbor-2opt",
    label: "Nearest Neighbor + 2-opt",
    description: "Greedy construction followed by 2-opt. Useful for algorithm comparison.",
  },
];

export const DEFAULT_TSP_SOLVER: TspSolver = "christofides";
