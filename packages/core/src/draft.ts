// ==========================================================
// Draw-on-map mode: pure draft state + conversion to a route file.
// No React / Leaflet here so it can be unit-tested in Node.
// ==========================================================
import { STUDY_AREA } from "./config";
import type { RouteFile } from "./schema";

export interface DraftPoint {
  /** Stable client-side key ("garage", "s1", "s2", …) – never reused */
  id: string;
  lat: number;
  lon: number;
}

export interface RouteDraft {
  routeName: string;
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
  | { type: "undo" }
  | { type: "clear" }
  | { type: "reset" };

export const DEFAULT_ROUTE_NAME = "Custom route";
/** With fewer stops there is nothing to optimize */
export const MIN_DRAFT_STOPS = 2;
export const OUT_OF_BOUNDS_NOTICE = "That spot is outside Baguio";

const emptyDraft = (routeName = DEFAULT_ROUTE_NAME): RouteDraft => ({ routeName, garage: null, stops: [] });

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
    case "rename":
      // Not an undo step, but it still changes the draft so results go stale
      return { ...state, draft: { ...draft, routeName: action.name }, notice: null };
    case "undo": {
      const previous = state.history[state.history.length - 1];
      if (!previous) return state;
      // Undo moves points, never the name the user typed
      return {
        ...state,
        draft: { ...previous, routeName: draft.routeName },
        history: state.history.slice(0, -1),
        notice: null,
      };
    }
    case "clear": {
      if (!draft.garage && draft.stops.length === 0) return state;
      return commit(state, emptyDraft(draft.routeName));
    }
    case "reset":
      return initialDraftState;
  }
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Turn the draft into the same route file an upload produces. Returns null
 * until a garage exists. Stops are numbered by list position.
 */
export function buildRouteFileFromDraft(draft: RouteDraft, today: Date = new Date()): RouteFile | null {
  if (!draft.garage) return null;
  return {
    schema_version: "1.0",
    route_name: draft.routeName.trim() || DEFAULT_ROUTE_NAME,
    study_area: STUDY_AREA.name,
    vehicle: { vehicle_id: "GT-001", vehicle_name: "Garbage Truck" },
    driver: { name: "Not specified" },
    created_date: `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`,
    garage: {
      id: "G-01",
      name: "Garage",
      latitude: round6(draft.garage.lat),
      longitude: round6(draft.garage.lon),
    },
    collection_points: draft.stops.map((s, i) => ({
      id: `CP-${pad2(i + 1)}`,
      name: `Stop ${i + 1}`,
      latitude: round6(s.lat),
      longitude: round6(s.lon),
    })),
  };
}
