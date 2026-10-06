import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../src/app.js";

// These cases are answered before any query runs, so they need no database.
describe("App", () => {
  it("should return a welcome message", async () => {
    const res = await request(app).get("/api/v1");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Welcome to the Waste Route Optimizer API");
  });

  it("rejects a todo without a title", async () => {
    const res = await request(app).post("/api/v1/todos").send({ description: "Collect bins" });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain("title");
  });

  it("rejects a malformed todo id", async () => {
    const res = await request(app).put("/api/v1/todos/not-a-uuid").send({ title: "a", description: "b" });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Invalid todo id.");
  });
});
