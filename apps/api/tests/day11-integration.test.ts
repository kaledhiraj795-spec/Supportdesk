import "dotenv/config";
import { beforeAll, afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import type { Application } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const apiEnvPath = resolve(process.cwd(), ".env");
const envLines = readFileSync(apiEnvPath, "utf8").split(/\r?\n/);
const databaseUrlLine = envLines.find((line) => line.startsWith("DATABASE_URL="));
if (!databaseUrlLine) throw new Error("DATABASE_URL is required for integration tests");
process.env.DATABASE_URL = databaseUrlLine.slice("DATABASE_URL=".length).replace(/\/supportdesk([/?]|$)/, "/supportdesk_test$1");
process.env.NODE_ENV = "test";

let app: Application;
let prisma: import("../generated/prisma/client").PrismaClient;
let customerToken: string;
let agentToken: string;
let customerId: string;
let otherCustomerId: string;
let agentId: string;

beforeAll(async () => {
  const appModule = await import("../src/app.js");
  app = (appModule as unknown as { default: Application }).default;
  const module = await import("../generated/prisma/client.js");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  prisma = new module.PrismaClient({ adapter });

  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();

  const customer = await prisma.user.create({
    data: {
      name: "Day 11 Customer",
      email: "day11.customer@example.test",
      passwordHash: "not-used-in-integration",
      role: "customer"
    }
  });
  const otherCustomer = await prisma.user.create({
    data: {
      name: "Day 11 Other Customer",
      email: "day11.other@example.test",
      passwordHash: "not-used-in-integration",
      role: "customer"
    }
  });
  const agent = await prisma.user.create({
    data: {
      name: "Day 11 Agent",
      email: "day11.agent@example.test",
      passwordHash: "not-used-in-integration",
      role: "agent"
    }
  });
  customerId = customer.id;
  otherCustomerId = otherCustomer.id;
  agentId = agent.id;

  await prisma.ticket.createMany({
    data: [
      { title: "Login alpha", description: "Search alpha", priority: "P1", category: "Account", status: "open", creatorId: customerId, assigneeId: agentId },
      { title: "Payment beta", description: "Search beta", priority: "P2", category: "Billing", status: "resolved", creatorId: customerId, assigneeId: agentId },
      { title: "Other gamma", description: "Search gamma", priority: "P3", category: "General", status: "open", creatorId: otherCustomerId, assigneeId: null }
    ]
  });

  customerToken = jwt.sign({ userId: customerId, role: "customer" }, process.env.JWT_SECRET as string, { expiresIn: 3600 });
  agentToken = jwt.sign({ userId: agentId, role: "agent" }, process.env.JWT_SECRET as string, { expiresIn: 3600 });
});

afterAll(async () => {
  await prisma.comment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

describe("Day 11 isolated database integration", () => {
  it("returns health and docs", async () => {
    const health = await request(app).get("/health");
    const docs = await request(app).get("/docs/");
    expect(health.status).toBe(200);
    expect(docs.status).toBe(200);
  });

  it("rejects unauthenticated and invalid-query ticket requests", async () => {
    expect((await request(app).get("/tickets")).status).toBe(401);
    expect((await request(app).get("/tickets?page=0").set("Authorization", `Bearer ${customerToken}`)).status).toBe(400);
  });

  it("paginates, filters, searches, and sorts customer tickets", async () => {
    const page = await request(app).get("/tickets?page=1&limit=1&status=open&priority=P1&assigneeId=" + agentId + "&search=Login&sortBy=title&sortOrder=asc").set("Authorization", `Bearer ${customerToken}`);
    expect(page.status).toBe(200);
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta.total).toBe(1);
    expect(page.body.meta.totalPages).toBe(1);
  });

  it("prevents customer cross-ticket access and permits agent-wide access", async () => {
    const other = await prisma.ticket.findFirst({ where: { creatorId: otherCustomerId } });
    expect(other).not.toBeNull();
    const customerRead = await request(app).get(`/tickets/${other?.id}`).set("Authorization", `Bearer ${customerToken}`);
    expect(customerRead.status).toBe(404);

    const agentList = await request(app).get("/tickets").set("Authorization", `Bearer ${agentToken}`);
    expect(agentList.status).toBe(200);
    expect(agentList.body.data.length).toBeGreaterThanOrEqual(3);
  });

  it("creates and lists public comments while excluding internal comments from customers", async () => {
    const own = await prisma.ticket.findFirst({ where: { creatorId: customerId } });
    expect(own).not.toBeNull();

    const customerComment = await request(app).post(`/tickets/${own?.id}/comments`).set("Authorization", `Bearer ${customerToken}`).send({ body: "Customer public comment", isInternal: true });
    expect(customerComment.status).toBe(201);
    expect(customerComment.body.data.isInternal).toBe(false);

    const internalComment = await request(app).post(`/tickets/${own?.id}/comments`).set("Authorization", `Bearer ${agentToken}`).send({ body: "Agent internal comment", isInternal: true });
    expect(internalComment.status).toBe(201);

    const customerList = await request(app).get(`/tickets/${own?.id}/comments`).set("Authorization", `Bearer ${customerToken}`);
    expect(customerList.status).toBe(200);
    expect(customerList.body.data.every((comment: { isInternal: boolean }) => !comment.isInternal)).toBe(true);

    const agentList = await request(app).get(`/tickets/${own?.id}/comments`).set("Authorization", `Bearer ${agentToken}`);
    expect(agentList.status).toBe(200);
    expect(agentList.body.data.some((comment: { isInternal: boolean }) => comment.isInternal)).toBe(true);
  });

  it("returns 400 for invalid comment input and 404 for missing ticket", async () => {
    const invalid = await request(app).post("/tickets/00000000-0000-4000-8000-000000000000/comments").set("Authorization", `Bearer ${customerToken}`).send({ body: "" });
    expect(invalid.status).toBe(400);

    const missing = await request(app).get("/tickets/00000000-0000-4000-8000-000000000001/comments").set("Authorization", `Bearer ${agentToken}`);
    expect(missing.status).toBe(404);
  });
});
