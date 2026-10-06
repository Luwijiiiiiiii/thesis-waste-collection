# @wcro/api

Backend of the Waste Route Optimizer: validates route files, loads the Baguio road network, runs the
traditional vs optimized route simulation, and stores the simulation log. The algorithms come from the shared
`packages/*`. This app wires them to HTTP and PostgreSQL.

Built with Express 5 and Prisma 7 (PostgreSQL), on the layout of
[mamoyko/api-template](https://github.com/mamoyko/api-template) with MongoDB replaced by Prisma.

## Project structure

The request flows through these layers in order: route → controller → service → repository → Prisma.

```
apps/api/
  prisma/
    schema.prisma             tables (replaces the Mongo collections)
    migrations/               SQL migrations, commit these
  prisma.config.ts            Prisma CLI config (schema path, DATABASE_URL)
  src/
    server.ts                 boot: connect DB → listen; graceful shutdown
    app.ts                    Express app: cors, json, rate limit (prod), helmet, /api router
    config.ts                 environment variables (dotenv)
    routes/                   `index.ts` mounts the routers under /api/v1
    controllers/              HTTP in/out + Joi validation
    services/                 business logic
      simulation.service.ts   pipeline: validate → network → snap → traditional → optimized → metrics → archive
      road-network.service.ts OSM download + in-memory / database cache of the road graph
    repositories/             database access through Prisma (simulations, road_networks)
    utils/
      prisma.ts               PrismaClient singleton (replaces mongo.ts)
      prisma-log.transport.ts winston transport writing to the `logs` table (replaces winston-mongodb)
      logger.ts, http-error.ts, format.ts
    generated/prisma/         generated Prisma Client (gitignored)
  build.mjs                   esbuild bundle → dist/server.js (bundles the @wcro/* TypeScript packages)
  test/                       vitest + supertest
```

## MongoDB → Prisma mapping

| Template (MongoDB)                                | Here (Prisma / PostgreSQL)                                           |
| ------------------------------------------------- | -------------------------------------------------------------------- |
| `utils/mongo.ts` `connectToMongo`, `getDB()`      | `utils/prisma.ts` `prisma`, `connectToDatabase()`                    |
| `insertOne` / `updateOne` + `$set` / `deleteOne`  | `create` / `update` / `delete`; missing row (P2025) → 404            |
| `useTransactionOptions` + `mongoClient` sessions  | `prisma.$transaction(async (tx) => …)`, defaults set in `utils/prisma.ts` |
| `winston-mongodb` capped `logs` collection        | `PrismaLogTransport` → `logs` table (no cap; prune old rows if needed) |
| `MONGO_URI`, `MONGO_DB`, `MONGO_DB_DEV`           | `DATABASE_URL`                                                       |

## Running locally

1. Start PostgreSQL with `docker compose up -d` from `apps/api`. Without Docker you can
   run `pnpm --filter @wcro/api exec prisma dev`, which starts a local Postgres and prints its URL.
   `prisma dev` keeps running in the background but not across reboots; start it again with
   `pnpm --filter @wcro/api exec prisma dev start <name>`.
2. Copy the env file: `cp apps/api/.env.example apps/api/.env`, then set `DATABASE_URL`.
3. Apply the migrations: `pnpm db:migrate`.
4. Start the API: `pnpm dev:api` (or `pnpm dev:all` to run the web app with it). It serves http://localhost:3001/api/v1.

## Scripts (run with `pnpm --filter @wcro/api <script>`)

| Script        | What it does                                                 |
| ------------- | ------------------------------------------------------------ |
| `dev`         | Watch mode (tsx)                                             |
| `build`       | Bundle to `dist/server.js` (esbuild)                         |
| `start`       | Run `dist/server.js`                                         |
| `db:generate` | Regenerate Prisma Client. Runs on install and before build and typecheck |
| `db:migrate`  | Create and apply a migration after you edit `schema.prisma`  |
| `db:deploy`   | Apply committed migrations (production/CI)                   |
| `db:studio`   | Open Prisma Studio                                           |

Tests run from the repo root with `pnpm test`.

## Endpoints

| Method | Path                       | Body / query                         | Response                                         |
| ------ | -------------------------- | ------------------------------------ | ------------------------------------------------ |
| GET    | `/api/v1`                  | none                                 | welcome message                                  |
| POST   | `/api/v1/validate`         | route file as JSON, or `text/plain`  | validation report; 200 passed, 422 failed        |
| POST   | `/api/v1/simulate`         | `{ routeFile, solver? }`             | NDJSON stream of `SimulationEvent`, ends with `result` or `error` |
| GET    | `/api/v1/network`          | none                                 | `{ inMemory, cachedInDatabase }`                 |
| POST   | `/api/v1/network`          | `{ refresh?: true }`                 | loads (or re-downloads) the road network         |
| GET    | `/api/v1/simulations`      | `?limit=1..500`                      | `SimulationLogEntry[]`, newest first             |
| GET    | `/api/v1/simulations/:id`  | none                                 | full `SimulationResult`, 404 if unknown          |

Types (`SimulationEvent`, `SimulationResult`, …) come from `@wcro/core`, shared with the web app.

`solver` is one of `TSP_SOLVERS` in `@wcro/core`; default `christofides`. The first simulation downloads Baguio's road
network from OpenStreetMap (30–60 s) and caches it gzipped in `road_networks`; later runs load it from memory or the
database.
