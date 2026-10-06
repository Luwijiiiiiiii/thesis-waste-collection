-- CreateTable
CREATE TABLE "simulations" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "route_name" TEXT NOT NULL,
    "study_area" TEXT NOT NULL,
    "collection_points" INTEGER NOT NULL,
    "solver" TEXT,
    "traditional_km" DOUBLE PRECISION NOT NULL,
    "optimized_km" DOUBLE PRECISION NOT NULL,
    "distance_savings_percent" DOUBLE PRECISION NOT NULL,
    "result" JSONB NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "road_networks" (
    "key" TEXT NOT NULL,
    "study_area" TEXT NOT NULL,
    "network_type" TEXT NOT NULL,
    "boundary_source" TEXT NOT NULL,
    "osm_relation_id" INTEGER,
    "node_count" INTEGER NOT NULL,
    "edge_count" INTEGER NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "graph" BYTEA NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "road_networks_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "simulations_created_at_idx" ON "simulations"("created_at" DESC);
