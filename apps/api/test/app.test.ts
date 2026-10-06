import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

// Answered before any query runs, so it needs no database.
describe("App", () => {
  it("should return a welcome message", async () => {
    const res = await request(app).get("/api/v1");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Welcome to the Waste Route Optimizer API");
  });
});
