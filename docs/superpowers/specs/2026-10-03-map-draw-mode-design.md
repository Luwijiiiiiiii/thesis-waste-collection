# Draw-on-map mode – design

Date: 2026-10-03 · Status: draft for review (v3) · Scope: one implementation plan

## 1. Goal

Add a second way to feed the existing comparison: instead of uploading a JSON
file, the user taps a Baguio map to place a **garage** (the truck starts and
ends there) and any number of **collection points**, adding and removing them
freely. Both the traditional route and the optimized route (TSP + A*) are
computed on the points the user drew, exactly as they are for an uploaded file.

Success criteria
- From the landing page, a user can draw points, run, and see results without
  leaving the drawing screen except for the results themselves.
- After results, the user can go back, add or remove points, and run again.
- Routing, metrics, results and exports are unchanged; JSON upload works exactly
  as today.

Non-goals (YAGNI): a separate end point, editing vehicle values (planned for
later; defaults stay), saving or sharing drafts, exporting a drawn route as
JSON, address search, areas outside Baguio.

## 2. What was said vs. assumed

Said: tap to add the garage and any nodes; add and remove nodes; start and end
are the same place; this is just another input mode, both routes use the user's
points; vehicle values stay as they are; the user can reorder stops to set the
traditional order.

Assumed (please correct): the map covers Baguio only (the road network does);
the traditional route visits stops in the list order (initially the order they
were tapped, then whatever the user reorders it to).

## 3. User flow

1. Landing page: a segmented switch **Upload file | Draw on map** above the
   drop zone. Upload stays the default and is unchanged. Choosing **Draw on map**
   opens the drawing screen with an empty draft.
2. Drawing screen (this *is* the setup screen for this mode; there is no
   separate review step):
   - Left: a Leaflet map centred on Baguio, restricted to the study-area bounds
     (`STUDY_AREA.fallbackBBox`).
     - First tap places the garage; later taps add collection points.
     - Remove a point via its popup's Delete button or the list's delete button.
       Markers are draggable to fine-tune a position.
     - Taps outside the bounds are refused with an inline message ("That spot is
       outside Baguio"). Removing the garage is allowed; the next tap places it again.
   - Right: one card with, top to bottom: route name field, the **stop list**
     (garage first, then stops numbered like the map, each with Up, Down and
     Delete; the list order is the traditional route's visiting order), Undo and
     Clear all, the validation summary (existing component), the algorithm
     choice, and **Run simulation** (existing `SimulationPanel`, with progress).
   - Run is enabled when the garage and at least 2 stops exist and validation
     passes; the disabled state says what is missing ("Tap the map to place the
     garage", "Add at least 2 stops").
   - A **Start over** action returns to the landing page.
3. A finished run shows the existing results screen. **Back to setup** returns
   to the drawing screen with the draft intact.
4. Any edit to the draft (add, move, remove, reorder, rename, clear) discards the
   previous result, because it no longer matches the points.

## 4. Data

No schema, type, routing, validation, metrics or export changes.

New pure function in `@wcro/core`: `buildRouteFileFromDraft(draft): RouteFile`,
where a draft is `{ routeName, garage?: {lat, lon}, stops: {id, lat, lon, name?}[] }`
and `stops` is in list order.
- ids: garage `G-01`, points `CP-01…` in list order; default names `Garage`,
  `Stop N`.
- `study_area` = `STUDY_AREA.name`; `schema_version` "1.0"; `created_date` today.
- vehicle `{ vehicle_id: "GT-001", vehicle_name: "Garbage Truck" }` with no
  numeric fields, so `resolveVehicle` applies `VEHICLE_DEFAULTS` (unchanged).
- driver `{ name: "Not specified" }` (the schema requires a name).
- The run request sends this object like an uploaded file, so the same client and
  server validation applies.

## 5. Components and file map

New
- `packages/core/src/draft.ts` – draft types, the pure reducer (place with first
  tap = garage, move, delete, reorder up/down, rename, undo, clear, reset) and
  `buildRouteFileFromDraft` (exported from `index.ts`). Lives in core because the
  repo's vitest config only collects `packages/**/*.test.ts`.
- `apps/web/src/features/draw/DrawScreen.tsx` – the screen above: map + side card;
  receives the run state and handlers from `Dashboard` and renders the existing
  `ValidationReportCard` and `SimulationPanel`.
- `apps/web/src/features/draw/DrawMap.tsx` + `DrawMapLoader.tsx` – Leaflet map with
  click handling, draggable markers, delete popup, bounds guard (dynamic import,
  no SSR, as the existing maps do).
- `apps/web/src/features/draw/StopList.tsx` – numbered list with Up/Down/Delete
  (buttons, keyboard accessible).

Changed
- `apps/web/src/features/dashboard/Landing.tsx` – mode switch.
- `apps/web/src/features/dashboard/Dashboard.tsx` – `source: "file" | "draw"`,
  the draft reducer, `sim.reset()` on any draft edit, validation of the built
  route file, and routing between landing / drawing screen / results.
- README: a short "Draw on map" section.

## 6. Error handling

- Out-of-bounds tap → inline message, nothing placed.
- Server still validates everything; a failing drawn route shows the same
  failed-checks UI as an uploaded file.
- Existing snap-distance warnings already cover taps far from a drivable road.

## 7. Testing

Unit (vitest, existing setup)
- `buildRouteFileFromDraft` output passes `validateRouteFile` (6/6), has unique
  ids in list order, and the expected defaults.
- Draft reducer: first tap becomes the garage; later taps become stops in order;
  delete, move, reorder (including first/last edge cases), undo and clear behave;
  out-of-bounds placement is rejected.

Manual/browser (Edge via Playwright, as used for the redesign)
- On desktop and a 390 px viewport: draw a garage and 4 stops, reorder one,
  remove one, undo, run, check results, go back, add a stop, run again. Compare
  against upload mode using the same coordinates in the same order; the numbers
  should match.

## 8. Risks

- Tap-based placement is pointer-centric; the stop list (buttons) and JSON upload
  are the non-pointer paths.
- Touch dragging inside a scrolling page: the map has a fixed height and
  scroll-wheel zoom stays off, as on the results map, to avoid scroll traps.
