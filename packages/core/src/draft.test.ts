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
    const s = run([A, B, { type: "rename", name: "Hill route" }]);
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
