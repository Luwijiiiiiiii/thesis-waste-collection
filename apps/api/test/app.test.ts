import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/app.js";

// Answered before any query runs, so it needs no database.
describe("App", () => {
  it("should return a welcome message", async () => {
    const res = await request(app).get("/api/v1");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Welcome to the Waste Route Optimizer API");
  });
});

describe("Rate limiter", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("answers over-limit writes with a JSON error and a Retry-After the browser can read", async () => {
    // The limiter only runs in production; config is read on import, so load a fresh copy of the app
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RATE_LIMIT", "1");
    vi.resetModules();
    const { default: limitedApp } = await import("../src/app.js");

    const send = () =>
      request(limitedApp).post("/api/v1/validate").set("Origin", "http://example.com").type("text/plain").send("{}");
    await send();
    const res = await send();

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/rate limiting/i);
    expect(Number(res.headers["retry-after"])).toBeGreaterThan(0);
    expect(res.headers["access-control-expose-headers"]).toContain("Retry-After");
  });
});
