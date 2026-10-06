import { readFileSync } from "node:fs";
import path from "node:path";
import type { SimulationEvent } from "@wcro/core";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

const sampleText = readFileSync(
  path.join(import.meta.dirname, "../../web/public/samples/baguio-sample-route.json"),
  "utf8",
);

// Everything here is answered before the road network or the database is touched.
describe("POST /api/v1/validate", () => {
  it("passes the bundled sample route file", async () => {
    const res = await request(app).post("/api/v1/validate").send(JSON.parse(sampleText));
    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true);
    expect(res.body.score).toBe(res.body.total);
    expect(res.body).not.toHaveProperty("data");
  });

  it("reports invalid JSON sent as text", async () => {
    const res = await request(app).post("/api/v1/validate").set("Content-Type", "text/plain").send("{ not json");
    expect(res.status).toBe(422);
    expect(res.body.checks[0].errors[0]).toContain("Invalid JSON");
  });

  it("returns a JSON 400 for a malformed JSON body", async () => {
    const res = await request(app).post("/api/v1/validate").set("Content-Type", "application/json").send("{ nope");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Request body must be valid JSON.");
  });
});

describe("POST /api/v1/simulate", () => {
  it("streams a validation error for an invalid route file", async () => {
    const res = await request(app)
      .post("/api/v1/simulate")
      .send({ routeFile: { schema_version: "0" } });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/x-ndjson");

    const events = res.text
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as SimulationEvent);
    expect(events[0]).toEqual({ type: "stage", stage: "validation", status: "running" });
    const last = events.at(-1);
    expect(last?.type).toBe("error");
    expect(last?.type === "error" && last.stage).toBe("validation");
  });
});

describe("GET /api/v1/simulations", () => {
  it("rejects an invalid limit", async () => {
    const res = await request(app).get("/api/v1/simulations?limit=0");
    expect(res.status).toBe(400);
  });

  it("404s on an id with unsafe characters", async () => {
    const res = await request(app).get("/api/v1/simulations/..%2Fetc");
    expect(res.status).toBe(404);
  });
});
