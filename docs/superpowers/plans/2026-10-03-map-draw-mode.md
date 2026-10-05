# Draw-on-map Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user tap a Baguio map to place a garage and collection points (add, remove, drag, reorder, undo), then run the existing traditional-vs-optimized comparison on those points instead of an uploaded JSON file.

**Architecture:** All draw logic is a pure reducer plus a `buildRouteFileFromDraft` converter in `@wcro/core` (unit-tested in Node). The web app adds a Leaflet tap-map, a stop list and a `DrawScreen` that reuses the existing `ValidationReportCard` and `SimulationPanel`; `Dashboard` owns the draft and routes between landing, drawing screen and results. The drawn route becomes a normal `RouteFile`, so schema, validation, routing, metrics, results and exports are untouched.

**Tech Stack:** TypeScript, React 19, Next.js 16 (App Router), Tailwind v4, react-leaflet 5 / Leaflet 1.9, lucide-react (already installed), vitest (root config, `packages/**/*.test.ts`).

**Spec:** `docs/superpowers/specs/2026-10-03-map-draw-mode-design.md` (v3). Deviation: the draft reducer lives in `packages/core/src/draft.ts` (not `apps/web`) because vitest only collects `packages/**/*.test.ts`.

## Global Constraints

- Same garage is start and end (round trip only); no separate end point.
- `schema_version` stays `"1.0"`; no changes to `schema.ts`, `types.ts`, `validation.ts`, routing, metrics, exports.
- Drawn route values: vehicle `{ vehicle_id: "GT-001", vehicle_name: "Garbage Truck" }` with no numeric fields (so `VEHICLE_DEFAULTS` apply); driver `{ name: "Not specified" }`; ids `G-01`, `CP-01…`; names `Garage`, `Stop N`; `study_area` = `STUDY_AREA.name`.
- Placement and drags are limited to `STUDY_AREA.fallbackBBox`; refusal message is "That spot is outside Baguio".
- Run requires a garage and at least 2 stops (`MIN_DRAFT_STOPS = 2`) and validation passing.
- List order = traditional visiting order; initially tap order; Up/Down reorders.
- Any committed edit to the draft (including rename) discards the previous result.
- Map: fixed height, scroll-wheel zoom off. Icon buttons at least 40 px; icons from lucide-react only (no emoji).
- JSON upload behaviour is unchanged.
- No new dependencies. This folder is not a git repository, so there are no commit steps; each task ends with a typecheck/test checkpoint instead.
- Commands use `corepack pnpm` (pnpm shims may not be installed); from the repo root `c:\Users\63930\Downloads\waste-route-optimizer\waste-route-optimizer`.

## Review Focus

1. A tap exactly on the bounding-box edge is accepted; just outside is refused with a notice and the draft keeps its identity (Task 1 tests).
2. Removing the garage while stops remain keeps the stops, and the next tap becomes the garage again (Task 1 tests).
3. Deleting stops and then adding more never reuses an internal key, and exported ids stay unique and sequential (Task 1 tests).
4. Two stops at identical coordinates make validation fail with "Duplicate coordinate" and the Run button stays disabled (Task 1 test; Task 5 browser check).
5. Editing points after a finished run removes "View latest results" so a stale result can't be viewed (Task 5 browser check).

---

### Task 1: Draft logic in `@wcro/core`

**Files:**
- Create: `packages/core/src/draft.ts`
- Create: `packages/core/src/draft.test.ts`
- Modify: `packages/core/src/index.ts`

**Interfaces:**
- Consumes: `STUDY_AREA` (`config.ts`), `RouteFile` (`schema.ts`).
- Produces (exported from `@wcro/core`): `DraftPoint`, `RouteDraft`, `DraftState`, `DraftAction`, `initialDraftState`, `draftReducer(state, action): DraftState`, `inStudyArea(lat, lon): boolean`, `buildRouteFileFromDraft(draft, today?): RouteFile | null`, `MIN_DRAFT_STOPS`, `DEFAULT_ROUTE_NAME`, `OUT_OF_BOUNDS_NOTICE`.

- [ ] **Step 1: Write the failing tests** — create `packages/core/src/draft.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { STUDY_AREA } from "./config";
import {
  buildRouteFileFromDraft,
  draftReducer,
  inStudyArea,
  initialDraftState,
  OUT_OF_BOUNDS_NOTICE,
  type DraftAction,
  type DraftState,
} from "./draft";
import { validateRouteFile } from "./validation";

const [south, west, north, east] = STUDY_AREA.fallbackBBox;
const tap = (lat: number, lon: number): DraftAction => ({ type: "place", lat, lon });
const run = (actions: DraftAction[], from: DraftState = initialDraftState) => actions.reduce(draftReducer, from);

// Four distinct points inside Baguio
const A = tap(16.41, 120.59);
const B = tap(16.42, 120.6);
const C = tap(16.4, 120.61);
const D = tap(16.43, 120.58);

describe("draftReducer", () => {
  it("makes the first tap the garage and later taps stops, in tap order", () => {
    const s = run([A, B, C]);
    expect(s.draft.garage).toEqual({ id: "garage", lat: 16.41, lon: 120.59 });
    expect(s.draft.stops.map((p) => [p.lat, p.lon])).toEqual([
      [16.42, 120.6],
      [16.4, 120.61],
    ]);
  });

  it("accepts taps on the bounding-box edge and refuses taps just outside", () => {
    expect(inStudyArea(south, west)).toBe(true);
    expect(inStudyArea(north, east)).toBe(true);
    expect(inStudyArea(north + 0.0001, west)).toBe(false);
    expect(inStudyArea(south, east + 0.0001)).toBe(false);

    const s = run([A]);
    const refused = draftReducer(s, tap(north + 0.01, west));
    expect(refused.draft).toBe(s.draft); // same object: nothing changed
    expect(refused.notice).toBe(OUT_OF_BOUNDS_NOTICE);
    expect(draftReducer(refused, B).notice).toBeNull();
  });

  it("moves a point and refuses a move outside Baguio", () => {
    const s = run([A, B]);
    const id = s.draft.stops[0].id;
    const moved = draftReducer(s, { type: "move", id, lat: 16.415, lon: 120.595 });
    expect(moved.draft.stops[0]).toMatchObject({ lat: 16.415, lon: 120.595 });
    const refused = draftReducer(moved, { type: "move", id, lat: 20, lon: 120.595 });
    expect(refused.draft).toBe(moved.draft);
    expect(refused.notice).toBe(OUT_OF_BOUNDS_NOTICE);
  });

  it("keeps the stops when the garage is removed, and the next tap becomes the garage", () => {
    const s = run([A, B, C, { type: "remove", id: "garage" }]);
    expect(s.draft.garage).toBeNull();
    expect(s.draft.stops).toHaveLength(2);
    const again = draftReducer(s, D);
    expect(again.draft.garage).toMatchObject({ id: "garage", lat: 16.43, lon: 120.58 });
    expect(again.draft.stops).toHaveLength(2);
  });

  it("never reuses a stop key after deletions", () => {
    let s = run([A, B, C, D]); // garage + s1, s2, s3
    s = draftReducer(s, { type: "remove", id: "s2" });
    s = draftReducer(s, tap(16.415, 120.605));
    expect(s.draft.stops.map((p) => p.id)).toEqual(["s1", "s3", "s4"]);
  });

  it("ignores removing an unknown id", () => {
    const s = run([A, B]);
    expect(draftReducer(s, { type: "remove", id: "nope" })).toBe(s);
  });

  it("reorders stops up and down and ignores moves past either end", () => {
    const s = run([A, B, C, D]); // stops s1 s2 s3
    const up = draftReducer(s, { type: "reorder", id: "s3", direction: "up" });
    expect(up.draft.stops.map((p) => p.id)).toEqual(["s1", "s3", "s2"]);
    const down = draftReducer(up, { type: "reorder", id: "s1", direction: "down" });
    expect(down.draft.stops.map((p) => p.id)).toEqual(["s3", "s1", "s2"]);
    expect(draftReducer(s, { type: "reorder", id: "s1", direction: "up" })).toBe(s);
    expect(draftReducer(s, { type: "reorder", id: "s3", direction: "down" })).toBe(s);
  });

  it("undoes edits one at a time and ignores undo on an empty history", () => {
    expect(draftReducer(initialDraftState, { type: "undo" })).toBe(initialDraftState);
    const s = run([A, B, C]);
    const one = draftReducer(s, { type: "undo" });
    expect(one.draft.stops).toHaveLength(1);
    const two = draftReducer(one, { type: "undo" });
    expect(two.draft.stops).toHaveLength(0);
    expect(two.draft.garage).not.toBeNull();
    expect(draftReducer(two, { type: "undo" }).draft.garage).toBeNull();
  });

  it("keeps a renamed route when undoing, and does not put renames in the history", () => {
    let s = run([A, B]);
    s = draftReducer(s, { type: "rename", name: "Market loop" });
    expect(s.history).toHaveLength(2);
    s = draftReducer(s, { type: "undo" });
    expect(s.draft.stops).toHaveLength(0);
    expect(s.draft.routeName).toBe("Market loop");
  });

  it("clears everything but keeps the route name, and clear is undoable", () => {
    let s = run([A, B, { type: "rename", name: "Hill route" }]);
    const cleared = draftReducer(s, { type: "clear" });
    expect(cleared.draft).toMatchObject({ routeName: "Hill route", garage: null, stops: [] });
    expect(draftReducer(cleared, { type: "undo" }).draft.stops).toHaveLength(1);
    expect(draftReducer(initialDraftState, { type: "clear" })).toBe(initialDraftState);
  });

  it("reset returns to the initial state", () => {
    expect(draftReducer(run([A, B]), { type: "reset" })).toBe(initialDraftState);
  });
});

describe("buildRouteFileFromDraft", () => {
  const today = new Date(2026, 9, 3); // 3 Oct 2026 (month is 0-based)

  it("returns null without a garage", () => {
    expect(buildRouteFileFromDraft(initialDraftState.draft, today)).toBeNull();
  });

  it("builds a file that passes the shared validation (6/6) with the expected defaults", () => {
    const { draft } = run([A, B, C]);
    const file = buildRouteFileFromDraft(draft, today)!;
    const report = validateRouteFile(file);
    expect(report.checks.flatMap((c) => c.errors)).toEqual([]);
    expect(report.score).toBe(6);
    expect(file.created_date).toBe("2026-10-03");
    expect(file.study_area).toBe(STUDY_AREA.name);
    expect(file.vehicle).toEqual({ vehicle_id: "GT-001", vehicle_name: "Garbage Truck" });
    expect(file.driver).toEqual({ name: "Not specified" });
    expect(file.garage).toMatchObject({ id: "G-01", name: "Garage", latitude: 16.41, longitude: 120.59 });
    expect(file.collection_points.map((p) => [p.id, p.name])).toEqual([
      ["CP-01", "Stop 1"],
      ["CP-02", "Stop 2"],
    ]);
  });

  it("numbers stops by list position, so ids stay sequential after reorder and delete", () => {
    let s = run([A, B, C, D]);
    s = draftReducer(s, { type: "remove", id: "s2" });
    s = draftReducer(s, { type: "reorder", id: "s3", direction: "up" });
    const file = buildRouteFileFromDraft(s.draft, today)!;
    expect(file.collection_points.map((p) => p.id)).toEqual(["CP-01", "CP-02"]);
    expect(file.collection_points.map((p) => p.latitude)).toEqual([16.43, 16.42]);
  });

  it("rounds coordinates to 6 decimals and falls back to the default route name when blank", () => {
    const s = run([tap(16.41234567, 120.59876543), B, { type: "rename", name: "   " }]);
    const file = buildRouteFileFromDraft(s.draft, today)!;
    expect(file.garage.latitude).toBe(16.412346);
    expect(file.garage.longitude).toBe(120.598765);
    expect(file.route_name).toBe("Custom route");
  });

  it("fails validation with a duplicate-coordinate error when two stops share a spot", () => {
    const { draft } = run([A, B, B]);
    const report = validateRouteFile(buildRouteFileFromDraft(draft, today));
    expect(report.passed).toBe(false);
    expect(report.checks.find((c) => c.key === "duplicates")!.errors[0]).toMatch(/Duplicate coordinate/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `corepack pnpm exec vitest run packages/core/src/draft.test.ts`
Expected: FAIL — cannot resolve `./draft`.

- [ ] **Step 3: Write the implementation** — create `packages/core/src/draft.ts`:

```ts
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
```

Then add the export — in `packages/core/src/index.ts` add the line `export * from "./draft";` (after `export * from "./config";`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `corepack pnpm exec vitest run packages/core/src/draft.test.ts`
Expected: PASS (all tests in both describe blocks).

- [ ] **Step 5: Checkpoint**

Run: `corepack pnpm test && corepack pnpm --filter "@wcro/core" typecheck`
Expected: every existing test still passes plus the new ones; typecheck prints no errors.

---

### Task 2: Map and stop-list components

**Files:**
- Create: `apps/web/src/features/draw/DrawMap.tsx`
- Create: `apps/web/src/features/draw/DrawMapLoader.tsx`
- Create: `apps/web/src/features/draw/StopList.tsx`

**Interfaces:**
- Consumes: `RouteDraft`, `DraftAction`, `inStudyArea`, `STUDY_AREA` from `@wcro/core` (Task 1); `.stop-marker`, `.stop-marker--garage`, `.stop-marker--file` CSS classes already in `globals.css`.
- Produces: `DrawMapLoader` (client, no-SSR) with props `{ draft: RouteDraft; onAction: (a: DraftAction) => void }`; `StopList` with the same props.

- [ ] **Step 1: Create the map** — `apps/web/src/features/draw/DrawMap.tsx`:

```tsx
"use client";
// Tap-to-place map for draw mode: tap = add, drag = adjust, popup = delete
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, Marker, Popup, Rectangle, TileLayer, useMapEvents } from "react-leaflet";
import { inStudyArea, STUDY_AREA, type DraftAction, type DraftPoint, type RouteDraft } from "@wcro/core";

const [south, west, north, east] = STUDY_AREA.fallbackBBox;
const BOUNDS = L.latLngBounds([south, west], [north, east]);

const icon = (label: string, garage: boolean) =>
  L.divIcon({
    className: "",
    html: `<div class="stop-marker ${garage ? "stop-marker--garage" : "stop-marker--file"}" style="width:${garage ? 28 : 26}px;height:${garage ? 28 : 26}px">${label}</div>`,
    iconSize: garage ? [28, 28] : [26, 26],
    iconAnchor: garage ? [14, 14] : [13, 13],
  });

function TapToPlace({ onAction }: { onAction: (a: DraftAction) => void }) {
  useMapEvents({ click: (e) => onAction({ type: "place", lat: e.latlng.lat, lon: e.latlng.lng }) });
  return null;
}

function PointMarker({
  point,
  label,
  title,
  garage,
  onAction,
}: {
  point: DraftPoint;
  label: string;
  title: string;
  garage: boolean;
  onAction: (a: DraftAction) => void;
}) {
  return (
    <Marker
      position={[point.lat, point.lon]}
      icon={icon(label, garage)}
      draggable
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target as L.Marker;
          const { lat, lng } = marker.getLatLng();
          // Snap back visually when dropped outside Baguio; the reducer shows the notice
          if (!inStudyArea(lat, lng)) marker.setLatLng([point.lat, point.lon]);
          onAction({ type: "move", id: point.id, lat, lon: lng });
        },
      }}
    >
      <Popup>
        <div className="space-y-2">
          <p className="text-sm font-semibold">{title}</p>
          <button
            type="button"
            onClick={() => onAction({ type: "remove", id: point.id })}
            className="inline-flex min-h-9 items-center rounded-lg bg-[#b91c1c] px-3 text-sm font-medium text-white"
          >
            Delete
          </button>
        </div>
      </Popup>
    </Marker>
  );
}

export default function DrawMap({ draft, onAction }: { draft: RouteDraft; onAction: (a: DraftAction) => void }) {
  return (
    <MapContainer
      center={STUDY_AREA.mapCenter}
      zoom={14}
      minZoom={12}
      maxBounds={BOUNDS}
      maxBoundsViscosity={1}
      scrollWheelZoom={false}
      className="h-[420px] w-full rounded-xl border border-line lg:h-[600px]"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Rectangle bounds={BOUNDS} pathOptions={{ color: "#2563eb", weight: 2, fill: false, dashArray: "6 6", interactive: false }} />
      <TapToPlace onAction={onAction} />
      {draft.garage && <PointMarker point={draft.garage} label="G" title="Garage" garage onAction={onAction} />}
      {draft.stops.map((s, i) => (
        <PointMarker key={s.id} point={s} label={String(i + 1)} title={`Stop ${i + 1}`} garage={false} onAction={onAction} />
      ))}
    </MapContainer>
  );
}
```

- [ ] **Step 2: Create the loader** — `apps/web/src/features/draw/DrawMapLoader.tsx`:

```tsx
"use client";
import dynamic from "next/dynamic";

// Leaflet touches `window`, so the map renders on the client only
export const DrawMapLoader = dynamic(() => import("./DrawMap"), {
  ssr: false,
  loading: () => <div className="h-[420px] w-full animate-pulse rounded-xl bg-surface-2 lg:h-[600px]" />,
});
```

- [ ] **Step 3: Create the stop list** — `apps/web/src/features/draw/StopList.tsx`:

```tsx
"use client";
import { ArrowDown, ArrowUp, Home, Trash2 } from "lucide-react";
import type { DraftAction, DraftPoint, RouteDraft } from "@wcro/core";

const iconButton =
  "grid size-10 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

const coords = (p: DraftPoint) => `${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;

export function StopList({ draft, onAction }: { draft: RouteDraft; onAction: (a: DraftAction) => void }) {
  if (!draft.garage && draft.stops.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line-strong px-4 py-6 text-center text-sm text-muted">
        Nothing placed yet. Tap the map to place the garage.
      </p>
    );
  }
  return (
    <ol className="divide-y divide-line rounded-xl border border-line">
      {draft.garage && (
        <li className="flex items-center gap-3 px-3 py-1.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#0f172a] text-white dark:bg-slate-600" aria-hidden>
            <Home className="size-3" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Garage</span>
            <span className="num block truncate text-xs text-muted">{coords(draft.garage)}</span>
          </span>
          <button type="button" className={iconButton} aria-label="Delete Garage" onClick={() => onAction({ type: "remove", id: "garage" })}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      )}
      {draft.stops.map((s, i) => (
        <li key={s.id} className="flex items-center gap-3 px-3 py-1.5">
          <span className="num grid size-6 shrink-0 place-items-center rounded-full bg-brand text-[11px] font-semibold text-white" aria-hidden>
            {i + 1}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">Stop {i + 1}</span>
            <span className="num block truncate text-xs text-muted">{coords(s)}</span>
          </span>
          <button
            type="button"
            className={iconButton}
            aria-label={`Move Stop ${i + 1} up`}
            disabled={i === 0}
            onClick={() => onAction({ type: "reorder", id: s.id, direction: "up" })}
          >
            <ArrowUp className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className={iconButton}
            aria-label={`Move Stop ${i + 1} down`}
            disabled={i === draft.stops.length - 1}
            onClick={() => onAction({ type: "reorder", id: s.id, direction: "down" })}
          >
            <ArrowDown className="size-4" aria-hidden />
          </button>
          <button type="button" className={iconButton} aria-label={`Delete Stop ${i + 1}`} onClick={() => onAction({ type: "remove", id: s.id })}>
            <Trash2 className="size-4" aria-hidden />
          </button>
        </li>
      ))}
    </ol>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `corepack pnpm --filter "@wcro/web" typecheck`
Expected: no errors. (If `Popup` children or `eventHandlers` types complain, fix the types in this task; do not loosen to `any`.)

---

### Task 3: `DrawScreen` and the panel's disabled hint

**Files:**
- Modify: `apps/web/src/features/simulation/SimulationPanel.tsx`
- Create: `apps/web/src/features/draw/DrawScreen.tsx`

**Interfaces:**
- Consumes: `DraftState`, `DraftAction`, `MIN_DRAFT_STOPS`, `ValidationReport`, `TspSolver` from `@wcro/core`; `DrawMapLoader`, `StopList` (Task 2); existing `SimulationPanel`, `ValidationReportCard`, `StageState`, `Card`, `CardBody`, `PageHeader`, `Button`.
- Produces: `DrawScreen` with props:
  `{ state: DraftState; onAction: (a: DraftAction) => void; report: ValidationReport | null; solver: TspSolver; onSolverChange: (s: TspSolver) => void; running: boolean; hasResult: boolean; onRun: () => void; onCancel: () => void; onViewResults: () => void; stages: StageState; error: { message: string; details?: string[] } | null; onStartOver: () => void }`.
  `SimulationPanel` gains optional `disabledHint?: string`.

- [ ] **Step 1: Add the optional hint to `SimulationPanel`** — in `apps/web/src/features/simulation/SimulationPanel.tsx`: add `disabledHint = "Fix the validation errors above to enable the simulation.",` to the destructured props (after `error,`), add `disabledHint?: string;` to the props type (after `error: ...;`), and replace the hint paragraph

```tsx
        <p className="text-center text-xs text-muted">Fix the validation errors above to enable the simulation.</p>
```

with

```tsx
        <p className="text-center text-xs text-muted">{disabledHint}</p>
```

- [ ] **Step 2: Create the screen** — `apps/web/src/features/draw/DrawScreen.tsx`:

```tsx
"use client";
import { MIN_DRAFT_STOPS, type DraftAction, type DraftState, type TspSolver, type ValidationReport } from "@wcro/core";
import { Eraser, RotateCcw, X } from "lucide-react";
import { Button, Card, CardBody, PageHeader } from "@/components/ui";
import { SimulationPanel } from "@/features/simulation/SimulationPanel";
import type { StageState } from "@/features/simulation/useSimulation";
import { ValidationReportCard } from "@/features/validation/ValidationReportCard";
import { DrawMapLoader } from "./DrawMapLoader";
import { StopList } from "./StopList";

export interface DrawScreenProps {
  state: DraftState;
  onAction: (a: DraftAction) => void;
  report: ValidationReport | null;
  solver: TspSolver;
  onSolverChange: (s: TspSolver) => void;
  running: boolean;
  hasResult: boolean;
  onRun: () => void;
  onCancel: () => void;
  onViewResults: () => void;
  stages: StageState;
  error: { message: string; details?: string[] } | null;
  onStartOver: () => void;
}

export function DrawScreen(props: DrawScreenProps) {
  const { state, onAction, report, running } = props;
  const { draft, notice } = state;
  const stopCount = draft.stops.length;
  const enoughStops = stopCount >= MIN_DRAFT_STOPS;
  const canRun = enoughStops && Boolean(report?.passed);
  const hint = !draft.garage
    ? "Tap the map to place the garage."
    : !enoughStops
      ? `Add at least ${MIN_DRAFT_STOPS} stops (${stopCount} so far).`
      : "Fix the validation errors above to enable the simulation.";

  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="Draw on map"
        title="Draw your route"
        description="Tap the map to place the garage, then tap to add collection points. The truck starts and ends at the garage."
        actions={
          <Button onClick={props.onStartOver} disabled={running}>
            <X className="size-4" aria-hidden />
            Start over
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* `inert` blocks every interaction while a run is in progress */}
        <Card className="order-2 min-w-0 lg:order-1">
          <CardBody>
            <div inert={running}>
              <DrawMapLoader draft={draft} onAction={onAction} />
            </div>
            <p role="status" className={`mt-2 min-h-5 text-sm ${notice ? "font-medium text-danger" : "text-muted"}`}>
              {notice ?? "Tap to add a point. Drag a marker to adjust it. Select a marker to delete it."}
            </p>
          </CardBody>
        </Card>

        <Card className="order-1 min-w-0 lg:sticky lg:top-6 lg:order-2">
          <CardBody className="space-y-4">
            <div inert={running} className="space-y-4">
              <div>
                <label htmlFor="route-name" className="text-sm font-medium">
                  Route name
                </label>
                <input
                  id="route-name"
                  type="text"
                  value={draft.routeName}
                  maxLength={80}
                  onChange={(e) => onAction({ type: "rename", name: e.target.value })}
                  className="mt-1.5 min-h-11 w-full rounded-xl border border-line-strong bg-surface px-3 text-sm"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium">
                    Stops <span className="num text-muted">({stopCount})</span>
                  </h2>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={state.history.length === 0} onClick={() => onAction({ type: "undo" })}>
                      <RotateCcw className="size-4" aria-hidden />
                      Undo
                    </Button>
                    <Button size="sm" variant="ghost" disabled={!draft.garage && stopCount === 0} onClick={() => onAction({ type: "clear" })}>
                      <Eraser className="size-4" aria-hidden />
                      Clear all
                    </Button>
                  </div>
                </div>
                <StopList draft={draft} onAction={onAction} />
                <p className="mt-2 text-xs leading-5 text-muted">
                  The order here is the traditional route&apos;s visiting order. Use the arrows to change it.
                </p>
              </div>
            </div>

            {enoughStops && report && <ValidationReportCard report={report} />}

            <SimulationPanel
              canRun={canRun}
              running={running}
              hasResult={props.hasResult}
              solver={props.solver}
              onSolverChange={props.onSolverChange}
              onRun={props.onRun}
              onCancel={props.onCancel}
              onViewResults={props.onViewResults}
              stages={props.stages}
              error={props.error}
              disabledHint={hint}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `corepack pnpm --filter "@wcro/web" typecheck`
Expected: no errors. (`inert={running}` is valid on React 19 DOM elements; if the installed `@types/react` rejects it, use `{...(running ? { inert: true } : {})}` instead.)

---

### Task 4: Wire it into `Landing` and `Dashboard`

**Files:**
- Modify: `apps/web/src/features/dashboard/Landing.tsx`
- Modify: `apps/web/src/features/dashboard/Dashboard.tsx` (full replacement below)

**Interfaces:**
- Consumes: `DrawScreen` (Task 3); `draftReducer`, `initialDraftState`, `buildRouteFileFromDraft`, `validateRouteFile` (core).
- Produces: `Landing` gains required prop `onDraw: () => void`.

- [ ] **Step 1: Add the mode switch to `Landing`** — in `Landing.tsx`: change the lucide import to `import { ArrowRight, BarChart3, FileCheck2, FileUp, MapPin, Route } from "lucide-react";`, change the props to `{ recent, onLoad, onDraw }: { recent: SimulationLogEntry[]; onLoad: (fileName: string, text: string) => void; onDraw: () => void; }`, and replace

```tsx
        <div className="animate-rise [animation-delay:80ms]">
          <DropZone onLoad={onLoad} />
        </div>
```

with

```tsx
        <div className="animate-rise [animation-delay:80ms]">
          <div role="group" aria-label="Input method" className="mb-3 inline-flex rounded-xl border border-line bg-surface p-1">
            <button
              type="button"
              aria-pressed="true"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-soft px-4 text-sm font-medium text-brand-ink"
            >
              <FileUp className="size-4" aria-hidden />
              Upload file
            </button>
            <button
              type="button"
              aria-pressed="false"
              onClick={onDraw}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-muted transition-colors duration-200 hover:text-ink"
            >
              <MapPin className="size-4" aria-hidden />
              Draw on map
            </button>
          </div>
          <DropZone onLoad={onLoad} />
        </div>
```

- [ ] **Step 2: Replace `Dashboard.tsx`** with:

```tsx
"use client";
import { useEffect, useMemo, useReducer, useState } from "react";
import {
  buildRouteFileFromDraft,
  DEFAULT_TSP_SOLVER,
  draftReducer,
  initialDraftState,
  validateRouteFile,
  validateRouteFileText,
  type DraftAction,
  type SimulationLogEntry,
  type TspSolver,
} from "@wcro/core";
import { ArrowLeft, Download, FileWarning, ListChecks, Map as MapIcon, SlidersHorizontal } from "lucide-react";
import { Tabs } from "@/components/Tabs";
import { Badge, buttonClasses, Button, Card, CardBody, EmptyState, PageHeader } from "@/components/ui";
import { ConfigPanel } from "@/features/config/ConfigPanel";
import { CollectionPointsTable, DatasetDetails } from "@/features/dataset/DatasetSummary";
import { StopsPreviewMapLoader } from "@/features/dataset/StopsPreviewMapLoader";
import { DrawScreen } from "@/features/draw/DrawScreen";
import { ResultsView } from "@/features/results/ResultsView";
import { SimulationPanel } from "@/features/simulation/SimulationPanel";
import { useSimulation } from "@/features/simulation/useSimulation";
import { LoadedFile, SAMPLE_URL } from "@/features/upload/RouteFileInput";
import { ValidationReportCard } from "@/features/validation/ValidationReportCard";
import { Landing } from "./Landing";

export function Dashboard({ recent }: { recent: SimulationLogEntry[] }) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string | null>(null);
  const [solver, setSolver] = useState<TspSolver>(DEFAULT_TSP_SOLVER);
  const [showResults, setShowResults] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [draftState, dispatchDraft] = useReducer(draftReducer, initialDraftState);
  const sim = useSimulation();
  const resetSim = sim.reset;

  // Same validation engine the server enforces – instant feedback on upload
  const report = useMemo(() => (fileText === null ? null : validateRouteFileText(fileText)), [fileText]);

  // The drawn route goes through the very same validation
  const drawnFile = useMemo(() => buildRouteFileFromDraft(draftState.draft), [draftState.draft]);
  const drawnReport = useMemo(() => (drawnFile ? validateRouteFile(drawnFile) : null), [drawnFile]);

  // A finished run takes over the screen; scroll to the top so it starts at the summary
  useEffect(() => {
    if (sim.result) {
      setShowResults(true);
      window.scrollTo({ top: 0 });
    }
  }, [sim.result]);

  // Editing the drawn points makes any earlier result stale – discard it.
  // `draft` keeps its identity when an action was refused, so those don't reset.
  useEffect(() => {
    resetSim();
  }, [draftState.draft, resetSim]);

  const handleLoad = (name: string, text: string) => {
    setFileName(name);
    setFileText(text);
    setShowResults(false);
    setDrawing(false);
    sim.reset();
  };

  const startDrawing = () => {
    sim.reset();
    setShowResults(false);
    setDrawing(true);
  };

  const startOver = () => {
    dispatchDraft({ type: "reset" });
    sim.reset();
    setShowResults(false);
    setDrawing(false);
  };

  // Results (for an uploaded file or a drawn route)
  if (showResults && sim.result) {
    return (
      <ResultsView
        result={sim.result}
        actions={
          <Button onClick={() => setShowResults(false)}>
            <ArrowLeft className="size-4" aria-hidden />
            Back to setup
          </Button>
        }
      />
    );
  }

  // Draw on map
  if (drawing) {
    return (
      <DrawScreen
        state={draftState}
        onAction={(a: DraftAction) => dispatchDraft(a)}
        report={drawnReport}
        solver={solver}
        onSolverChange={setSolver}
        running={sim.running}
        hasResult={Boolean(sim.result)}
        onRun={() => drawnReport?.data && sim.run(drawnReport.data, solver)}
        onCancel={sim.reset}
        onViewResults={() => setShowResults(true)}
        stages={sim.stages}
        error={sim.error}
        onStartOver={startOver}
      />
    );
  }

  // Nothing loaded yet
  if (fileText === null || !report) {
    return <Landing recent={recent} onLoad={handleLoad} onDraw={startDrawing} />;
  }

  // Review the uploaded data and run
  const data = report.data;
  return (
    <div className="animate-rise space-y-6">
      <PageHeader
        eyebrow="New simulation"
        title={data?.route_name ?? "Route file needs attention"}
        description={
          data
            ? `${data.collection_points.length} collection points around ${data.garage.name}. Review the data, pick an algorithm, then run.`
            : "The file didn't pass validation. Fix the issues listed on the right, or load a different file."
        }
        actions={data && <Badge tone={report.passed ? "ok" : "danger"}>{report.passed ? "Ready to run" : "Validation failed"}</Badge>}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="order-2 min-w-0 lg:order-1">
          <CardBody>
            {data ? (
              <Tabs
                label="Route data"
                items={[
                  {
                    id: "map",
                    label: "Map",
                    icon: <MapIcon className="size-4" />,
                    content: (
                      <div>
                        <StopsPreviewMapLoader data={data} />
                        <p className="mt-2 text-xs text-muted">
                          Numbers follow the order in your file. <span className="font-medium">G</span> marks the garage.
                        </p>
                      </div>
                    ),
                  },
                  {
                    id: "points",
                    label: "Collection points",
                    icon: <ListChecks className="size-4" />,
                    badge: <Badge>{data.collection_points.length}</Badge>,
                    content: <CollectionPointsTable data={data} />,
                  },
                  {
                    id: "details",
                    label: "Details",
                    icon: <SlidersHorizontal className="size-4" />,
                    content: (
                      <div className="space-y-8">
                        <DatasetDetails data={data} />
                        <ConfigPanel />
                      </div>
                    ),
                  },
                ]}
              />
            ) : (
              <EmptyState
                icon={<FileWarning className="size-7" />}
                title="We couldn't read this route"
                description="Check the messages in the validation panel. Starting from the template is the quickest way to get a valid file."
                action={
                  <a href={SAMPLE_URL} download className={buttonClasses("secondary", "md")}>
                    <Download className="size-4" aria-hidden />
                    Download the template
                  </a>
                }
              />
            )}
          </CardBody>
        </Card>

        <Card className="order-1 min-w-0 lg:sticky lg:top-6 lg:order-2">
          <CardBody className="space-y-4">
            <LoadedFile fileName={fileName ?? "route.json"} pointCount={data?.collection_points.length} onLoad={handleLoad} />
            <ValidationReportCard report={report} />
            <SimulationPanel
              canRun={report.passed}
              running={sim.running}
              hasResult={Boolean(sim.result)}
              solver={solver}
              onSolverChange={setSolver}
              onRun={() => data && sim.run(data, solver)}
              onCancel={sim.reset}
              onViewResults={() => setShowResults(true)}
              stages={sim.stages}
              error={sim.error}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and run all unit tests**

Run: `corepack pnpm --filter "@wcro/web" typecheck && corepack pnpm test`
Expected: no type errors; all tests pass.

---

### Task 5: Docs and browser verification

**Files:**
- Modify: `README.md` (add a section)
- Create (scratch, outside the repo): `<scratchpad>/verify-draw.mjs`

**Interfaces:**
- Consumes: the running dev server at `http://localhost:3000` (start with `corepack pnpm --filter "@wcro/web" dev` if it is not running); `playwright-core` is already installed in the scratchpad and Microsoft Edge is used via `channel: "msedge"`.
- Produces: screenshots and a pass/fail printout.

- [ ] **Step 1: Document the mode** — in `README.md`, after the "Quick start" steps, add:

```markdown
### Draw on map (no JSON needed)

On the home page choose **Draw on map**. Tap the map to place the garage (first tap), then tap to add collection
points. Drag a marker to adjust it, select it to delete it, and use the arrows in the list to change the order. The
list order is the traditional route's visiting order; the truck starts and ends at the garage. At least 2 stops are
needed. Vehicle values use the same defaults as the JSON mode. Editing the points after a run discards that run's
result so you never see numbers that don't match the map.
```

- [ ] **Step 2: Write the browser check** — `verify-draw.mjs` in the scratchpad:

```js
import { chromium } from "playwright-core";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const problems = [];
const check = (ok, msg) => { console.log((ok ? "PASS " : "FAIL ") + msg); if (!ok) problems.push(msg); };

async function drawAndRun(viewport, tag) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => problems.push(`${tag} pageerror: ${e.message}`));
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Draw on map" }).click();
  const map = page.locator(".leaflet-container");
  await map.waitFor();
  await page.waitForTimeout(1500);
  const box = await map.boundingBox();
  const at = (fx, fy) => ({ x: box.x + box.width * fx, y: box.y + box.height * fy });
  const tapAt = async (fx, fy) => { const p = at(fx, fy); await page.mouse.click(p.x, p.y); await page.waitForTimeout(250); };

  check(await page.getByRole("button", { name: "Run simulation" }).isDisabled(), `${tag}: Run disabled before any taps`);
  await tapAt(0.5, 0.5);                                   // garage
  await tapAt(0.3, 0.35); await tapAt(0.7, 0.35);          // two stops
  check((await page.getByRole("listitem").filter({ hasText: "Stop" }).count()) === 2, `${tag}: two stops listed`);
  check(await page.getByRole("button", { name: "Run simulation" }).isEnabled(), `${tag}: Run enabled with garage + 2 stops`);

  await tapAt(0.3, 0.7); await tapAt(0.7, 0.7);            // two more
  await page.getByRole("button", { name: "Move Stop 4 up" }).click();
  await page.getByRole("button", { name: "Delete Stop 1" }).click();
  await page.getByRole("button", { name: "Undo" }).click();
  check((await page.getByRole("listitem").filter({ hasText: "Stop" }).count()) === 4, `${tag}: undo restored the deleted stop`);
  await page.screenshot({ path: `draw-${tag}-editing.png`, fullPage: true });

  await page.getByRole("button", { name: "Run simulation" }).click();
  await page.waitForSelector("text=Simulation results", { timeout: 180000 });
  check(true, `${tag}: results screen reached`);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `draw-${tag}-results.png` });

  await page.getByRole("button", { name: "Back to setup" }).click();
  check(await page.getByRole("button", { name: "View latest results" }).isVisible(), `${tag}: "View latest results" shown after Back to setup (draft unchanged)`);
  await tapAt(0.5, 0.2);                                   // edit -> result is stale
  check(!(await page.getByRole("button", { name: "View latest results" }).isVisible().catch(() => false)), `${tag}: stale result discarded after an edit`);

  if (viewport.width < 500) check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), `${tag}: no horizontal overflow`);
  await ctx.close();
}

await drawAndRun({ width: 1440, height: 900 }, "desktop");
await drawAndRun({ width: 390, height: 844 }, "mobile");

// Upload mode must be unchanged
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /Try the Baguio sample/ }).click();
await page.waitForSelector("text=Route file is valid");
check(true, "upload mode: sample still loads and validates");

await browser.close();
console.log(problems.length ? `\n${problems.length} problem(s):\n- ${problems.join("\n- ")}` : "\nAll checks passed");
process.exit(problems.length ? 1 : 0);
```

- [ ] **Step 3: Run it**

Run (from the scratchpad directory): `node verify-draw.mjs`
Expected: every line starts with `PASS`, final line `All checks passed`. Open `draw-desktop-editing.png`, `draw-mobile-editing.png` and the results screenshots and confirm the map shows the numbered markers, the list matches, and the layout has no overlap.

- [ ] **Step 4: Duplicate-spot check (Review Focus 4)**

Tapping the exact same spot twice in a browser is unreliable (pixel positions map to slightly different floats), so this case is pinned by the Task 1 unit test instead. Run `corepack pnpm exec vitest run packages/core/src/draft.test.ts -t "duplicate"` and expect PASS. The Run button staying disabled in that case follows from `canRun = enoughStops && report.passed` in `DrawScreen` (Task 3).

- [ ] **Step 5: Final checkpoint**

Run: `corepack pnpm test && corepack pnpm --filter "@wcro/web" typecheck`
Expected: all tests pass and no type errors.
