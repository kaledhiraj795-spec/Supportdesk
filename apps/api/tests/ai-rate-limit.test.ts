import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createAiRateLimiter } from "../src/middlewares/ai-rate-limit";

describe("AI rate limiting", () => {
  it("limits each authenticated user independently instead of sharing an IP quota", async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: req.get("x-user-id") ?? "", role: "agent" };
      next();
    });
    app.post("/", createAiRateLimiter(1), (_req, res) => {
      res.sendStatus(204);
    });

    await request(app).post("/").set("x-user-id", "agent-one").expect(204);
    await request(app).post("/").set("x-user-id", "agent-one").expect(429);
    await request(app).post("/").set("x-user-id", "agent-two").expect(204);
  });
});
