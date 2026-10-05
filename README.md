# Waste Collection Route Optimizer (Next.js monorepo)

TypeScript port of the thesis notebook **Ancheta/Pasing-Thesis-V2.ipynb** – a decision-support prototype that compares a
**Simulated Traditional Route** against an **Optimized Route** (TSP for stop order + A* for road paths) on the
OpenStreetMap road network of **Baguio City**.

No Python is required. OSMnx and NetworkX are replaced by TypeScript modules.

## Quick start

```bash
# Node 20.9+ and pnpm 10 (corepack enable && corepack prepare pnpm@10 --activate)
pnpm install
pnpm dev            # http://localhost:3000
```

1. Click **Use sample Baguio route** (or upload your own JSON).
2. Check the validation report (6/6).
3. Press **Run simulation**. The first run downloads Baguio's drivable roads from OpenStreetMap
   (around 30–60 s). The graph is then cached in `apps/web/.data/cache/` and reused.

### Draw on map (no JSON needed)

On the home page choose **Draw on map**. Tap the map to place the garage (first tap), then tap to add collection
points. Drag a marker to adjust it, select it to delete it, and use the arrows in the list to change the order. The
list order is the traditional route's visiting order; the truck starts and ends at the garage. At least 2 stops are
needed. Vehicle values use the same defaults as the JSON mode. Editing the points after a run discards that run's
result so you never see numbers that don't match the map.

Other commands:

```bash
pnpm test        # unit tests (A*, Dijkstra, Christofides, matching, validation)
pnpm typecheck   # all packages
pnpm build       # production build
pnpm start       # serve the production build
```

## Structure

```
apps/
  web/                         Next.js 16 (App Router) – frontend + backend (route handlers)
    src/app/api/
      validate/                POST  run the validation engine
      network/                 GET status · POST preload/refresh the road network
      simulate/                POST  run the pipeline, streams NDJSON progress events
      simulations/[id]/        GET   simulation log
    src/server/                server-only code
      network-store.ts         download + memory/disk cache of the road graph
      run-simulation.ts        pipeline: validate → network → snap → traditional → optimized → metrics → archive
      simulation-log.ts        archive each run as JSON
    src/features/              UI modules (upload, validation, dataset, simulation, results)
    public/samples/            sample route file / template
packages/
  core/          @wcro/core          config, route-file schema (zod), validation engine, shared types
  road-network/  @wcro/road-network  Overpass/Nominatim download, graph build, one-way handling, SCC, nearest node
  routing/       @wcro/routing       A*, Dijkstra, distance matrix, Christofides / NN / 2-opt, route builders
  metrics/       @wcro/metrics       distance, time, fuel, cost, CO₂ + comparison
  exports/       @wcro/exports       CSV / JSON / GeoJSON builders
```

## Notebook → monorepo mapping

| Notebook | Module | Where |
|---|---|---|
| Cell 2–3 Install / import libraries | – | `package.json` files |
| Cell 4 Configuration, output folders, save helpers | Config | `packages/core/src/config.ts`, `packages/exports`, `apps/web/src/server/paths.ts` |
| Cell 5 Prototype dashboard | Config | `features/config/ConfigPanel.tsx`, `features/simulation/SimulationPanel.tsx` (stage status) |
| Cell 7–8 Upload + read JSON | Route file | `features/upload/RouteFileInput.tsx` |
| Cell 9 + 11 Validation engine | Validation | `packages/core/src/validation.ts` (shared by client and server) |
| Cell 10 Dataset summary, points preview | Dataset | `features/dataset/DatasetSummary.tsx` |
| Cell 12 Download OSM road network (cached) | Road network | `packages/road-network/src/overpass.ts`, `build-graph.ts`, `server/network-store.ts` |
| Cell 13 Coordinates → nearest nodes | Snapping | `packages/routing/src/snap.ts`, `road-network/src/nearest.ts` |
| Cell 14 Road network summary + exports | Road network | `features/results/NetworkAndRegistry.tsx`, `exports.nodeRegistryCsv` |
| Cell 16–18 Simulated traditional route (A*) | Routing | `packages/routing/src/routes.ts → computeTraditionalRoute` |
| Cell 20–22 TSP order + A* optimized route | Routing | `packages/routing/src/routes.ts → computeOptimizedRoute`, `tsp/` |
| Objective: metrics, comparison table | Metrics | `packages/metrics` (new; not coded in the notebook yet) |
| Objective: interactive map, HTML export | Map | `features/results/RouteMap.tsx` (Leaflet), GeoJSON export |
| Objective: CSV export, simulation logging | Exports / log | `packages/exports`, `server/simulation-log.ts`, `/simulations` page |

## How the Python pieces were replaced

| Python | TypeScript |
|---|---|
| `ox.graph_from_place("City of Baguio", network_type="drive")` | Nominatim → boundary relation → Overpass query with the **same drive filter OSMnx uses** (falls back to a bounding box) |
| OSMnx one-way handling | `oneway=yes/true/1`, `oneway=-1`, `junction=roundabout` |
| `ox.settings.use_cache` / `if "road_graph" not in globals()` | disk JSON cache + in-memory singleton |
| `ox.distance.nearest_nodes` | `nearestNode()` (also returns snap distance) |
| `nx.astar_path(..., weight="length")` | `astarPath()` with a great-circle heuristic (admissible, so results equal Dijkstra) |
| `traveling_salesman_problem(..., method=christofides)` on `to_undirected()` | distance matrix (Dijkstra on the undirected graph) → `christofidesTour()` with **exact** min-weight perfect matching (≤ 20 odd-degree stops, greedy above that) |

## Changes compared to the notebook

These are deliberate fixes, not ports:

1. **TSP returns only stops, starting at the garage.** networkx's `traveling_salesman_problem` returns the full road walk
   (including intermediate nodes), which caused "Unknown Node" lines and a tour that might not begin at the garage. The
   TSP here runs on a stop-to-stop distance matrix, so the result is always `garage → … → garage`.
2. **Validation blocks the run.** The server re-validates and refuses invalid files. The duplicated checks from cells 9
   and 11 are merged into one engine.
3. **One source of vehicle values.** Values in the route file override the defaults in `packages/core/src/config.ts`.
4. **Largest strongly connected component.** OSMnx keeps the largest *weakly* connected component. Here the *strongly*
   connected one is kept, so A* always finds a drivable path on one-way streets.
5. **Graph is not simplified.** OSMnx merges intermediate way nodes, so node/edge counts will be higher than in the notebook.
   Distances are unaffected.
6. **Snap warnings.** Stops more than 300 m from a drivable road, or sharing a road node, are flagged.

The exact optimized order can differ slightly from networkx because of tie-breaking in the MST and Euler tour. Use
`christofides` for thesis results. `christofides-2opt` and `nearest-neighbor-2opt` are there for algorithm comparison.

## Route file format (schema 1.0)

See `apps/web/public/samples/baguio-sample-route.json`. Required: `schema_version`, `route_name`, `study_area`,
`vehicle {vehicle_id, vehicle_name}`, `driver {name}`, `created_date`, `garage {id, name, latitude, longitude}`,
`collection_points[] {id, name, latitude, longitude}`. Optional: `vehicle.average_speed_kmh`,
`fuel_efficiency_kmpl`, `fuel_price_per_liter`, `co2_factor`, and per point `waste_type`, `priority`.

> The sample coordinates are approximate landmark locations for demo purposes. Replace them with real collection points.

## Configuration

`apps/web/.env.example`:

- `DATA_DIR` – where the road-network cache and simulation logs are written (default `apps/web/.data`)
- `OVERPASS_URL`, `NOMINATIM_URL` – alternative OSM endpoints
- `OSM_RELATION_ID` – skip Nominatim by giving the boundary relation id directly

To re-download the road network: delete `apps/web/.data/cache/` or `POST /api/network {"refresh": true}`.

## Deployment note

The app writes to the local filesystem (cache + logs), so run it with `pnpm build && pnpm start` on a server or your own
machine. On serverless hosts (e.g. Vercel) set `DATA_DIR=/tmp/wcro` (non-persistent) or swap
`simulation-log.ts`/`network-store.ts` for a database or object storage (S3).
