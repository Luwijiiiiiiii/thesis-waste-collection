# Waste Collection Route Optimizer (Next.js monorepo)

TypeScript port of the thesis notebook **Ancheta/Pasing-Thesis-V2.ipynb** – a decision-support prototype that compares a
**Simulated Traditional Route** against an **Optimized Route** (TSP for stop order + A* for road paths) on the
OpenStreetMap road network of **Baguio City**.

No Python is required. OSMnx and NetworkX are replaced by TypeScript modules.

## Quick start

Already set up? This is all you need each time:

```bash
docker compose -f apps/api/docker-compose.yml up -d   # start PostgreSQL (skip if it is already running)
pnpm dev:all                                          # web http://localhost:3000 · API http://localhost:3001
```

First time on this machine? Follow [Setup](#setup) below.

## Setup

### How the system fits together

```
Browser ──► Web app (Next.js, :3000) ──► API (Express + Prisma, :3001) ──► PostgreSQL (:5432)
                                                     │
                                                     └──► OpenStreetMap (Overpass / Nominatim), first run only
```

- **Web app** (`apps/web`): the UI only. It holds no data and calls the API.
- **API** (`apps/api`): validates route files, downloads and caches the road network, runs the simulations and saves
  the simulation log.
- **PostgreSQL**: stores the simulation log and the cached road network. The API will not start without it.
- **Redis**: optional. The API runs without it.

Nothing is built into a Docker image. Docker is only one convenient way to get a PostgreSQL server; the apps themselves
run directly on your machine with Node.

### 1. Install the prerequisites

| Tool | Version | Check with | Notes |
|---|---|---|---|
| Node.js | 20.9 or newer | `node -v` | [nodejs.org](https://nodejs.org) (LTS) |
| pnpm | 10 | `pnpm -v` | Run `corepack enable`. Corepack then uses the version pinned in `package.json`. |
| Git | any | `git --version` | |
| Docker Desktop | any | `docker compose version` | Optional. Only needed for database option A below. |

### 2. Get the code and install dependencies

```bash
git clone https://github.com/Luwijiiiiiiii/thesis-waste-collection.git
cd thesis-waste-collection
pnpm install
```

`pnpm install` installs every app and package in the monorepo and generates the Prisma Client for the API. Run all
commands in this guide from the repository root unless a step says otherwise.

### 3. Start a PostgreSQL database

Pick **one** option.

**Option A: Docker (recommended).** Start Docker Desktop, then:

```bash
cd apps/api
docker compose up -d
cd ../..
```

This downloads the official `postgres:17` and `redis:7` images (first time only) and starts them in the background.
The database is `wcro` with user `postgres` and password `postgres` on port 5432. This matches the default
`DATABASE_URL`, so you don't need to change anything. Data is kept in a Docker volume between restarts. Check that it
is running with `docker compose ps` (from `apps/api`).

**Option B: Prisma's local Postgres (no Docker).**

```bash
pnpm --filter @wcro/api exec prisma dev
```

It starts a local Postgres and prints a connection URL. Copy that URL into `DATABASE_URL` in step 4. It keeps
running in the background but not across reboots. Start it again with
`pnpm --filter @wcro/api exec prisma dev start <name>`.

**Option C: a PostgreSQL you already have** (local install or hosted). Create an empty database and use its
connection string in step 4, in the form `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`.

### 4. Create the environment files

API (required):

```bash
cp apps/api/.env.example apps/api/.env            # macOS / Linux / Git Bash
copy apps\api\.env.example apps\api\.env          # Windows Command Prompt / PowerShell
```

Open `apps/api/.env` and check `DATABASE_URL`. With option A, leave the default. The other values in the file are
optional for local development. For example, leave `REDIS_HOST` empty to run without Redis, or set it to `localhost` to
use the Redis container from option A.

Web app (optional): the defaults already point to `http://localhost:3001`. Create `apps/web/.env.local` only if you
want to change something:

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001   # where the browser reaches the API
NEXT_PUBLIC_MAPBOX_TOKEN=pk....             # Mapbox basemap; OpenStreetMap tiles are used when empty
```

Both `NEXT_PUBLIC_*` values are read when the web app starts, so restart `pnpm dev:all` after changing them.

### 5. Create the database tables

```bash
pnpm db:migrate
```

This applies the migrations in `apps/api/prisma/migrations` (`simulations`, `road_networks`, `logs`, `todos`). It is
needed once per new database, and again whenever someone adds a migration (after a `git pull` that changes
`apps/api/prisma/`).

Optional: if you have data from the old Next.js-only version in `apps/web/.data`, import it once with
`pnpm --filter @wcro/api db:import-legacy`. It is safe to re-run.

### 6. Run the system

```bash
pnpm dev:all
```

This starts both apps in watch mode (they reload when you edit code):

- Web app: http://localhost:3000
- API: http://localhost:3001/api/v1 (opening it in the browser shows a welcome message)

Other ways to run:

| Command | Starts |
|---|---|
| `pnpm dev:all` | web app and API |
| `pnpm dev` | web app only (the pages that run or list simulations still need the API) |
| `pnpm dev:api` | API only |

Stop everything with `Ctrl+C`. To stop the database too, run `docker compose down` from `apps/api`. Your data stays
in the volume. `docker compose down -v` also deletes the data, so run `pnpm db:migrate` again afterwards.

### 7. Run your first simulation

1. Open http://localhost:3000 and click **Use sample Baguio route** (or upload your own JSON).
2. Check the validation report (6/6).
3. Press **Run simulation**. The first run downloads Baguio's drivable roads from OpenStreetMap, which takes about
   30–60 s and needs internet access. The API then caches the graph in the database (`road_networks` table) and
   reuses it, so later runs are much faster.
4. Past runs are listed on the **Simulations** page (http://localhost:3000/simulations).

### Troubleshooting

| Problem | Fix |
|---|---|
| API exits with `Failed to start server. Is Postgres running and DATABASE_URL set?` | The database is not reachable. Check `docker compose ps` in `apps/api` (option A) and `DATABASE_URL` in `apps/api/.env`. |
| `docker compose up` fails with `port 5432 is already allocated` | Another Postgres is running on your machine. Stop it, or change the port mapping in `apps/api/docker-compose.yml` (e.g. `"5433:5432"`) and use that port in `DATABASE_URL`. |
| `The table ... does not exist` errors | Run `pnpm db:migrate`. |
| `Cannot find module '.../generated/prisma'` | Run `pnpm --filter @wcro/api db:generate` (normally done by `pnpm install`). |
| Web app shows network or CORS errors | Make sure the API is running on port 3001. `CORS_ORIGIN` in `apps/api/.env` must match the web app's address (`http://localhost:3000`), and `NEXT_PUBLIC_API_URL` must point to the API. |
| First simulation hangs or fails while loading the road network | OpenStreetMap's public servers are busy or unreachable. Try again, or set `OVERPASS_URL` to another Overpass mirror in `apps/api/.env`. |
| Port 3000 or 3001 is already in use | Stop the other process, or change `PORT` in `apps/api/.env` and update `NEXT_PUBLIC_API_URL` to match. |

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
pnpm start       # serve the web production build
pnpm start:api   # serve the API production build (apps/api/dist)
```

## Structure

```
apps/
  api/                         Express 5 + Prisma (PostgreSQL) backend – details in apps/api/README.md
    prisma/schema.prisma       simulations, road_networks (+ template todos, logs)
    src/routes/                /api/v1 endpoints
      POST /validate             run the validation engine
      GET|POST /network          road network status · preload/refresh
      POST /simulate             run the pipeline, streams NDJSON progress events
      GET /simulations[/:id]     simulation log
    src/services/
      road-network.service.ts  download + memory/database cache of the road graph
      simulation.service.ts    pipeline: validate → network → snap → traditional → optimized → metrics → archive
    src/repositories/          Prisma queries (simulation log, road-network cache)
  web/                         Next.js 16 (App Router) – frontend only
    src/lib/api.ts             client for the API
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
| Cell 4 Configuration, output folders, save helpers | Config | `packages/core/src/config.ts`, `packages/exports` |
| Cell 5 Prototype dashboard | Config | `features/config/ConfigPanel.tsx`, `features/simulation/SimulationPanel.tsx` (stage status) |
| Cell 7–8 Upload + read JSON | Route file | `features/upload/RouteFileInput.tsx` |
| Cell 9 + 11 Validation engine | Validation | `packages/core/src/validation.ts` (shared by client and server) |
| Cell 10 Dataset summary, points preview | Dataset | `features/dataset/DatasetSummary.tsx` |
| Cell 12 Download OSM road network (cached) | Road network | `packages/road-network/src/overpass.ts`, `build-graph.ts`, `apps/api/src/services/road-network.service.ts` |
| Cell 13 Coordinates → nearest nodes | Snapping | `packages/routing/src/snap.ts`, `road-network/src/nearest.ts` |
| Cell 14 Road network summary + exports | Road network | `features/results/NetworkAndRegistry.tsx`, `exports.nodeRegistryCsv` |
| Cell 16–18 Simulated traditional route (A*) | Routing | `packages/routing/src/routes.ts → computeTraditionalRoute` |
| Cell 20–22 TSP order + A* optimized route | Routing | `packages/routing/src/routes.ts → computeOptimizedRoute`, `tsp/` |
| Objective: metrics, comparison table | Metrics | `packages/metrics` (new; not coded in the notebook yet) |
| Objective: interactive map, HTML export | Map | `features/results/RouteMap.tsx` (Leaflet), GeoJSON export |
| Objective: CSV export, simulation logging | Exports / log | `packages/exports`, `apps/api` (`simulations` table), `/simulations` page |

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

`apps/api/.env.example`:

- `DATABASE_URL` – PostgreSQL connection (required)
- `CORS_ORIGIN` – the web app's origin (default `*`)
- `OVERPASS_URL`, `NOMINATIM_URL` – alternative OSM endpoints
- `OSM_RELATION_ID` – skip Nominatim by giving the boundary relation id directly

`apps/web/.env.example`:

- `NEXT_PUBLIC_API_URL` – where the browser reaches the API (inlined at build time)
- `API_URL` – optional different origin for server-side calls

To re-download the road network: `POST /api/v1/network {"refresh": true}` on the API.

Data from before the API existed (`apps/web/.data`) can be moved into the database once with
`pnpm --filter @wcro/api db:import-legacy`.

## Deployment note

Both apps are stateless; all data lives in PostgreSQL. Deploy the API as a long-running Node process
(`pnpm build && pnpm --filter @wcro/api db:deploy && pnpm start:api`), because a simulation can run for several minutes
while it streams progress. Serverless function time limits are usually too short. Then build the web app with
`NEXT_PUBLIC_API_URL` set to the API's public URL, and set the API's `CORS_ORIGIN` to the web app's URL.
