import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import express from "express";
import app from "../src/app";
import { requireAuth, requireRole } from "../src/middlewares/auth";
import { loginRateLimiter } from "../src/routes/auth.routes";

const mocks = vi.hoisted(() => ({
  auth: {
    findUserByEmail: vi.fn(),
    createCustomer: vi.fn()
  },
  tickets: {
    findAllTickets: vi.fn(),
    findTicketById: vi.fn(),
    createTicket: vi.fn(),
    updateTicket: vi.fn(),
    findTicketsPage: vi.fn(),
    countTickets: vi.fn()
  }
}));

vi.mock("../src/repositories/auth.repository", () => mocks.auth);
vi.mock("../src/repositories/tickets.repository", () => mocks.tickets);

const secret = "test-only-secret-that-is-at-least-32-characters";
const customerId = "11111111-1111-4111-8111-111111111111";
const otherCustomerId = "22222222-2222-4222-8222-222222222222";
const ticketId = "33333333-3333-4333-8333-333333333333";
const createdAt = new Date("2026-01-01T00:00:00.000Z");
const storedPassword = "correct horse battery staple";

const userRecord = (overrides: Record<string, unknown> = {}) => ({
  id: customerId,
  name: "Test Customer",
  email: "customer@example.test",
  role: "customer" as const,
  passwordHash: bcrypt.hashSync(storedPassword, 4),
  createdAt,
  ...overrides
});

const issueToken = (role = "customer", userId = customerId, expiresIn = 3600) =>
  jwt.sign({ userId, role }, secret, { expiresIn });

const ticketRecord = (creatorId = customerId) => ({
  id: ticketId,
  title: "Unable to sign in",
  description: "Test ticket",
  status: "open",
  priority: "P2",
  category: "account",
  creatorId,
  assigneeId: null,
  slaDueAt: null,
  createdAt,
  updatedAt: createdAt
});

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("authentication and ticket API", () => {
  it("registers customers with a hash and excludes credentials from the response", async () => {
    const savedUser = userRecord();
    mocks.auth.createCustomer.mockImplementation(async (data) => ({
      ...savedUser,
      name: data.name,
      email: data.email,
      passwordHash: data.passwordHash
    }));

    const response = await request(app).post("/auth/register").send({
      name: " Test Customer ",
      email: "Customer@Example.Test",
      password: storedPassword,
      role: "admin"
    });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      id: customerId,
      name: "Test Customer",
      email: "customer@example.test",
      role: "customer"
    });
    expect(response.body.data).not.toHaveProperty("password");
    expect(response.body.data).not.toHaveProperty("passwordHash");
    const hash = mocks.auth.createCustomer.mock.calls[0][0].passwordHash;
    expect(hash).not.toBe(storedPassword);
    expect(await bcrypt.compare(storedPassword, hash)).toBe(true);
    expect(mocks.auth.createCustomer.mock.calls[0][0]).not.toHaveProperty("role");
  });

  it("rejects duplicate email safely", async () => {
    mocks.auth.createCustomer.mockRejectedValue({ code: "P2002" });
    const response = await request(app).post("/auth/register").send({
      name: "Test Customer",
      email: "customer@example.test",
      password: storedPassword
    });

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/already exists/i);
    expect(response.text).not.toContain(storedPassword);
    expect(response.text).not.toContain("P2002");
  });

  it("rejects invalid registration input without persisting it", async () => {
    const response = await request(app).post("/auth/register").send({
      name: "",
      email: "not-an-email",
      password: "short"
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe("Validation failed");
    expect(response.text).not.toContain("short");
    expect(mocks.auth.createCustomer).not.toHaveBeenCalled();
  });

  it("rejects bcrypt passwords longer than its safe input limit", async () => {
    const response = await request(app).post("/auth/register").send({
      name: "Test Customer",
      email: "customer@example.test",
      password: "a".repeat(73)
    });

    expect(response.status).toBe(400);
    expect(mocks.auth.createCustomer).not.toHaveBeenCalled();
  });

  it("logs in and returns a JWT with user identity, role, and expiry only", async () => {
    mocks.auth.findUserByEmail.mockResolvedValue(userRecord());
    const response = await request(app).post("/auth/login").send({
      email: "CUSTOMER@example.test",
      password: storedPassword
    });

    expect(response.status).toBe(200);
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
    expect(response.body.data.user).not.toHaveProperty("password");
    const payload = jwt.verify(response.body.data.token, secret) as jwt.JwtPayload;
    expect(payload.userId).toBe(customerId);
    expect(payload.role).toBe("customer");
    expect(typeof payload.exp).toBe("number");
  });

  it("returns the same safe error for a wrong password and unknown email", async () => {
    mocks.auth.findUserByEmail.mockResolvedValue(userRecord());
    const wrongPassword = await request(app).post("/auth/login").send({
      email: "customer@example.test",
      password: "a different password"
    });
    mocks.auth.findUserByEmail.mockResolvedValue(null);
    const unknownEmail = await request(app).post("/auth/login").send({
      email: "unknown@example.test",
      password: storedPassword
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    expect(wrongPassword.text).not.toContain("passwordHash");
  });

  it("requires a token and rejects malformed, invalid, and expired JWTs", async () => {
    const tokens = [
      undefined,
      "not-a-token",
      issueToken("customer").slice(0, -2) + "xx",
      issueToken("customer", customerId, -1)
    ];

    for (const token of tokens) {
      const response = token
        ? await request(app).get("/tickets").set(bearer(token))
        : await request(app).get("/tickets");
      expect(response.status).toBe(401);
      expect(response.body.error.message).toBe("Authentication required");
    }
  });

  it("returns 403 when a valid token has a role not allowed on ticket routes", async () => {
    const response = await request(app)
      .get("/tickets")
      .set(bearer(issueToken("visitor")));

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe("Forbidden");
  });

  it("lets a customer read their own ticket and hides another customer's ticket", async () => {
    mocks.tickets.findTicketById
      .mockResolvedValueOnce(ticketRecord(customerId))
      .mockResolvedValueOnce(null);

    const ownTicket = await request(app)
      .get(`/tickets/${ticketId}`)
      .set(bearer(issueToken("customer", customerId)));
    const otherTicket = await request(app)
      .get(`/tickets/${ticketId}`)
      .set(bearer(issueToken("customer", otherCustomerId)));

    expect(ownTicket.status).toBe(200);
    expect(otherTicket.status).toBe(404);
    expect(otherTicket.body.error.message).toBe("Ticket not found");
    expect(mocks.tickets.findTicketById).toHaveBeenNthCalledWith(1, ticketId, {
      id: customerId,
      role: "customer"
    });
    expect(mocks.tickets.findTicketById).toHaveBeenNthCalledWith(2, ticketId, {
      id: otherCustomerId,
      role: "customer"
    });
  });

  it("prevents a customer from updating another customer's ticket", async () => {
    mocks.tickets.updateTicket.mockResolvedValue(null);
    const response = await request(app)
      .patch(`/tickets/${ticketId}`)
      .set(bearer(issueToken("customer", otherCustomerId)))
      .send({ title: "Changed title" });

    expect(response.status).toBe(404);
    expect(mocks.tickets.updateTicket).toHaveBeenCalledWith(
      ticketId,
      { title: "Changed title" },
      { id: otherCustomerId, role: "customer" }
    );
  });

  it("preserves customer updates to their own ticket", async () => {
    mocks.tickets.updateTicket.mockResolvedValue(ticketRecord(customerId));
    const response = await request(app)
      .patch(`/tickets/${ticketId}`)
      .set(bearer(issueToken("customer", customerId)))
      .send({ title: "Updated own ticket", creatorId: otherCustomerId });

    expect(response.status).toBe(200);
    expect(mocks.tickets.updateTicket).toHaveBeenCalledWith(
      ticketId,
      { title: "Updated own ticket" },
      { id: customerId, role: "customer" }
    );
  });

  it("forbids customers from setting agent-only ticket fields", async () => {
    const customerToken = issueToken("customer", customerId);

    const createResponse = await request(app)
      .post("/tickets")
      .set(bearer(customerToken))
      .send({
        title: "Customer ticket",
        description: "Customer description",
        priority: "P2",
        category: "account",
        status: "resolved",
        assigneeId: otherCustomerId
      });

    const updateResponse = await request(app)
      .patch(`/tickets/${ticketId}`)
      .set(bearer(customerToken))
      .send({ status: "resolved", assigneeId: otherCustomerId });

    expect(createResponse.status).toBe(403);
    expect(updateResponse.status).toBe(403);
    expect(mocks.tickets.createTicket).not.toHaveBeenCalled();
    expect(mocks.tickets.updateTicket).not.toHaveBeenCalled();
  });

  it("keeps ticket validation and not-found responses compatible", async () => {
    const token = issueToken();
    const invalidCreate = await request(app)
      .post("/tickets")
      .set(bearer(token))
      .send({ title: "", description: "", priority: "P0", category: "" });
    const invalidUpdate = await request(app)
      .patch(`/tickets/${ticketId}`)
      .set(bearer(token))
      .send({ priority: "P0" });
    mocks.tickets.findTicketById.mockResolvedValue(null);
    const missingTicket = await request(app)
      .get(`/tickets/${ticketId}`)
      .set(bearer(token));

    expect(invalidCreate.status).toBe(400);
    expect(invalidUpdate.status).toBe(400);
    expect(invalidCreate.body.error.message).toBe("Validation failed");
    expect(missingTicket.status).toBe(404);
    expect(missingTicket.body.error.message).toBe("Ticket not found");
    expect(mocks.tickets.createTicket).not.toHaveBeenCalled();
    expect(mocks.tickets.updateTicket).not.toHaveBeenCalled();
  });

  it("returns JSON errors for unknown routes and malformed ticket IDs", async () => {
    const token = issueToken();
    const unknownRoute = await request(app).get("/not-an-api-route");
    const invalidTicketRead = await request(app)
      .get("/tickets/not-a-uuid")
      .set(bearer(token));
    const invalidTicketUpdate = await request(app)
      .patch("/tickets/not-a-uuid")
      .set(bearer(token))
      .send({ title: "Not persisted" });

    expect(unknownRoute.status).toBe(404);
    expect(unknownRoute.body).toEqual({
      data: null,
      error: { message: "Route not found" },
      meta: null
    });
    expect(invalidTicketRead.status).toBe(400);
    expect(invalidTicketRead.body.error.message).toBe("Invalid ticket ID");
    expect(invalidTicketUpdate.status).toBe(400);
    expect(invalidTicketUpdate.body.error.message).toBe("Invalid ticket ID");
    expect(mocks.tickets.findTicketById).not.toHaveBeenCalled();
    expect(mocks.tickets.updateTicket).not.toHaveBeenCalled();
  });

  it("returns a safe JSON 400 for malformed JSON bodies", async () => {
    const response = await request(app)
      .post("/auth/register")
      .set("Content-Type", "application/json")
      .send("{malformed");

    expect(response.status).toBe(400);
    expect(response.type).toBe("application/json");
    expect(response.body.error.message).toBe("Request failed");
    expect(response.text).not.toContain("SyntaxError");
  });

  it("sets ticket creator from the verified identity, ignoring a supplied creatorId", async () => {
    mocks.tickets.createTicket.mockImplementation(async (data) => ticketRecord(data.creatorId));
    const response = await request(app)
      .post("/tickets")
      .set(bearer(issueToken("customer", customerId)))
      .send({
        title: "New ticket",
        description: "New description",
        priority: "P2",
        category: "account",
        creatorId: otherCustomerId
      });

    expect(response.status).toBe(201);
    expect(mocks.tickets.createTicket).toHaveBeenCalledWith(expect.objectContaining({
      creatorId: customerId
    }));
    expect(response.body.data.creatorId).toBe(customerId);
  });

  it("allows agents to view tickets across customers", async () => {
    mocks.tickets.findTicketsPage.mockResolvedValue([
      ticketRecord(customerId),
      ticketRecord(otherCustomerId)
    ]);
    mocks.tickets.countTickets.mockResolvedValue(2);

    const response = await request(app)
      .get("/tickets")
      .set(bearer(issueToken("agent")));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(2);
    expect(mocks.tickets.findTicketsPage).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc"
      }),
      { id: customerId, role: "agent" }
    );
  });

  it("keeps the Day 9 health endpoint public and response-compatible", async () => {
    const response = await request(app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { status: "ok" },
      error: null,
      meta: null
    });
  });

  it("applies allowlisted CORS, Helmet headers, and login-only rate limiting", async () => {
    const allowed = await request(app)
      .get("/health")
      .set("Origin", "http://localhost:5173");
    const denied = await request(app)
      .get("/health")
      .set("Origin", "https://not-allowed.example");

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();
    expect(allowed.headers["x-content-type-options"]).toBe("nosniff");
    expect(allowed.headers["content-security-policy"]).toBeDefined();

    for (const key of ["::ffff:127.0.0.1", "127.0.0.1"]) {
      loginRateLimiter.resetKey(key);
    }
    mocks.auth.findUserByEmail.mockResolvedValue(null);
    const attempts = [];
    for (let index = 0; index < 6; index += 1) {
      attempts.push(await request(app).post("/auth/login").send({
        email: "unknown@example.test",
        password: storedPassword
      }));
    }
    expect(attempts.slice(0, 5).every((response) => response.status === 401)).toBe(true);
    expect(attempts[5].status).toBe(429);
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
    mocks.auth.createCustomer.mockResolvedValue(userRecord());
    const registration = await request(app).post("/auth/register").send({
      name: "Registration remains available",
      email: "after-limit@example.test",
      password: storedPassword
    });
    expect(registration.status).toBe(201);
  });

  it("does not log authorization values or expose internal errors", async () => {
    const token = issueToken();
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.tickets.findTicketsPage.mockRejectedValue(new Error("private database detail"));

    const response = await request(app).get("/tickets").set(bearer(token));

    expect(response.status).toBe(500);
    expect(response.body.error.message).toBe("Internal server error");
    expect(response.text).not.toContain("private database detail");
    expect(JSON.stringify(log.mock.calls)).not.toContain(token);
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("private database detail");
    log.mockRestore();
    errorLog.mockRestore();
  });

  it("returns 403 from requireRole for an authenticated identity without the required role", async () => {
    const roleApp = express();
    roleApp.get("/agent", requireAuth, requireRole("agent"), (_req, res) => {
      res.status(200).end();
    });
    const response = await request(roleApp)
      .get("/agent")
      .set(bearer(issueToken("customer")));
    expect(response.status).toBe(403);
  });
});
