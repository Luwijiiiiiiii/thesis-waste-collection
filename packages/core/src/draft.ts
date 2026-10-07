// ==========================================================
// Draw-on-map mode: pure draft state + conversion to a route file.
// No React / Mapbox here so it can be unit-tested in Node.
// ==========================================================
import { STUDY_AREA } from "./config";
import type { RouteDetailsPatch, StopInfo } from "./edit";
import type { RouteFile, Vehicle } from "./schema";

export interface DraftPoint {
  /** Stable client-side key ("garage", "s1", "s2", …) – never reused */
  id: string;
  lat: number;
  lon: number;
  /** Details typed in the points table; unset fields use the numbered defaults */
  info?: StopInfo;
}

export interface RouteDraft {
  routeName: string;
  driverName: string;
  vehicle: Vehicle;
  garage: DraftPoint | null;
  /** Collection points in list order = the traditional route's visiting order */
  stops: DraftPoint[];
}

export interface DraftState {
  draft: RouteDraft;
  /** Previous drafts, newest last (for undo) */
  history: RouteDraft[];
  /** Counter for stop keys; only ever increases */
  nextId: number;
  /** Message to show when the last action was refused, otherwise null */
  notice: string | null;
}

export type DraftAction =
  | { type: "place"; lat: number; lon: number }
  | { type: "move"; id: string; lat: number; lon: number }
  | { type: "remove"; id: string }
  | { type: "reorder"; id: string; direction: "up" | "down" }
  | { type: "rename"; name: string }
  | { type: "editDetails"; patch: RouteDetailsPatch }
  | { type: "editStop"; id: string; patch: StopInfo }
  | { type: "undo" }
  | { type: "clear" }
  | { type: "reset" };

export const DEFAULT_ROUTE_NAME = "Custom route";
export const DEFAULT_DRIVER_NAME = "Not specified";
export const DEFAULT_DRAFT_VEHICLE: Vehicle = { vehicle_id: "GT-001", vehicle_name: "Garbage Truck" };
/** With fewer stops there is nothing to optimize */
export const MIN_DRAFT_STOPS = 2;
export const OUT_OF_BOUNDS_NOTICE = "That spot is outside Baguio";

type DraftDetails = Pick<RouteDraft, "routeName" | "driverName" | "vehicle">;

const DEFAULT_DETAILS: DraftDetails = {
  routeName: DEFAULT_ROUTE_NAME,
  driverName: DEFAULT_DRIVER_NAME,
  vehicle: DEFAULT_DRAFT_VEHICLE,
};

const emptyDraft = ({ routeName, driverName, vehicle }: DraftDetails = DEFAULT_DETAILS): RouteDraft => ({
  routeName,
  driverName,
  vehicle,
  garage: null,
  stops: [],
});

export const initialDraftState: DraftState = { draft: emptyDraft(), history: [], nextId: 1, notice: null };

/** Inclusive check against the study-area bounding box */
export function inStudyArea(lat: number, lon: number): boolean {
  const [south, west, north, east] = STUDY_AREA.fallbackBBox;
  return lat >= south && lat <= north && lon >= west && lon <= east;
}

function commit(state: DraftState, next: RouteDraft): DraftState {
  return { ...state, draft: next, history: [...state.history, state.draft], notice: null };
}

const refuse = (state: DraftState): DraftState => ({ ...state, notice: OUT_OF_BOUNDS_NOTICE });

export function draftReducer(state: DraftState, action: DraftAction): DraftState {
  const { draft } = state;
  switch (action.type) {
    case "place": {
      if (!inStudyArea(action.lat, action.lon)) return refuse(state);
      if (!draft.garage) {
        return commit(state, { ...draft, garage: { id: "garage", lat: action.lat, lon: action.lon } });
      }
      const stop: DraftPoint = { id: `s${state.nextId}`, lat: action.lat, lon: action.lon };
      return commit({ ...state, nextId: state.nextId + 1 }, { ...draft, stops: [...draft.stops, stop] });
    }
    case "move": {
      if (!inStudyArea(action.lat, action.lon)) return refuse(state);
      const moved = (p: DraftPoint) => (p.id === action.id ? { ...p, lat: action.lat, lon: action.lon } : p);
      return commit(state, { ...draft, garage: draft.garage && moved(draft.garage), stops: draft.stops.map(moved) });
    }
    case "remove": {
      if (draft.garage?.id === action.id) return commit(state, { ...draft, garage: null });
      if (!draft.stops.some((s) => s.id === action.id)) return state;
      return commit(state, { ...draft, stops: draft.stops.filter((s) => s.id !== action.id) });
    }
    case "reorder": {
      const i = draft.stops.findIndex((s) => s.id === action.id);
      const j = action.direction === "up" ? i - 1 : i + 1;
      if (i < 0 || j < 0 || j >= draft.stops.length) return state;
      const stops = draft.stops.slice();
      [stops[i], stops[j]] = [stops[j], stops[i]];
      return commit(state, { ...draft, stops });
    }
    // Typed details are not undo steps, but they still change the draft so results go stale
    case "rename":
      return { ...state, draft: { ...draft, routeName: action.name }, notice: null };
    case "editDetails": {
      const { route_name, driver_name, vehicle } = action.patch;
      const next: RouteDraft = {
        ...draft,
        routeName: route_name ?? draft.routeName,
        driverName: driver_name ?? draft.driverName,
        vehicle: vehicle ? { ...draft.vehicle, ...vehicle } : draft.vehicle,
      };
      return { ...state, draft: next, notice: null };
    }
    case "editStop": {
      const edited = (p: DraftPoint) => (p.id === action.id ? { ...p, info: { ...p.info, ...action.patch } } : p);
      if (draft.garage?.id !== action.id && !draft.stops.some((s) => s.id === action.id)) return state;
      return {
        ...state,
        draft: { ...draft, garage: draft.garage && edited(draft.garage), stops: draft.stops.map(edited) },
        notice: null,
      };
    }
    case "undo": {
      const previous = state.history[state.history.length - 1];
      if (!previous) return state;
      // Undo moves points, never the details the user typed
      const info = new Map<string, StopInfo | undefined>();
      for (const p of [draft.garage, ...draft.stops]) if (p) info.set(p.id, p.info);
      const withInfo = (p: DraftPoint): DraftPoint => {
        if (!info.has(p.id)) return p;
        const { info: _old, ...rest } = p;
        const current = info.get(p.id);
        return current ? { ...rest, info: current } : rest;
      };
      return {
        ...state,
        draft: {
          ...previous,
          routeName: draft.routeName,
          driverName: draft.driverName,
          vehicle: draft.vehicle,
          garage: previous.garage && withInfo(previous.garage),
          stops: previous.stops.map(withInfo),
        },
        history: state.history.slice(0, -1),
        notice: null,
      };
    }
    case "clear": {
      if (!draft.garage && draft.stops.length === 0) return state;
      return commit(state, emptyDraft(draft));
    }
    case "reset":
      return initialDraftState;
  }
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Turn the draft into the same route file an upload produces. Returns null
 * until a garage exists. Stops without typed details are numbered by list position.
 */
export function buildRouteFileFromDraft(draft: RouteDraft, today: Date = new Date()): RouteFile | null {
  if (!draft.garage) return null;
  return {
    schema_version: "1.0",
    route_name: draft.routeName.trim() || DEFAULT_ROUTE_NAME,
    study_area: STUDY_AREA.name,
    vehicle: draft.vehicle,
    driver: { name: draft.driverName.trim() || DEFAULT_DRIVER_NAME },
    created_date: `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`,
    garage: {
      id: draft.garage.info?.id ?? "G-01",
      name: draft.garage.info?.name ?? "Garage",
      latitude: round6(draft.garage.lat),
      longitude: round6(draft.garage.lon),
    },
    collection_points: draft.stops.map((s, i) => ({
      id: s.info?.id ?? `CP-${pad2(i + 1)}`,
      name: s.info?.name ?? `Stop ${i + 1}`,
      latitude: round6(s.lat),
      longitude: round6(s.lon),
      ...(s.info?.waste_type && { waste_type: s.info.waste_type }),
      ...(s.info?.priority && { priority: s.info.priority }),
    })),
  };
}
