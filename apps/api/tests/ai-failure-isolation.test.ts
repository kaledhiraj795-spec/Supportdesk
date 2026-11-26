import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  tickets: {
    getAllTickets: vi.fn(),
    getTicketById: vi.fn(),
    addTicket: vi.fn(),
    editTicket: vi.fn(),
    getTicketPage: vi.fn()
  },
  comments: {
    addComment: vi.fn(),
    getTicketComments: vi.fn()
  },
  ai: {
    prepareSuggestReplyForTicket: vi.fn(),
    suggestCategoryAndPriorityForTicket: vi.fn()
  }
}));

vi.mock("../src/services/tickets.service", () => mocks.tickets);
vi.mock("../src/services/comments.service", () => mocks.comments);
vi.mock("../src/ai/ai.service", () => mocks.ai);

import app from "../src/app";
import { AiFeatureError } from "../src/ai/errors";

const ticketId = "33333333-3333-4333-8333-333333333333";
const agentId = "22222222-2222-4222-8222-222222222222";
const secret = "test-only-secret-that-is-at-least-32-characters";
const token = jwt.sign({ userId: agentId, role: "agent" }, secret);
const ticket = {
  id: ticketId,
  title: "Unable to sign in",
  description: "Test ticket",
  status: "open",
  priority: "P2",
  category: "Account",
  creatorId: agentId,
  assigneeId: null,
  slaDueAt: null,
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
  updatedAt: new Date("2026-03-01T10:00:00.000Z")
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.ai.suggestCategoryAndPriorityForTicket.mockRejectedValue(
    new AiFeatureError("AI provider request timed out.", 504)
  );
  mocks.tickets.addTicket.mockResolvedValue(ticket);
  mocks.tickets.editTicket.mockResolvedValue({ ...ticket, title: "Updated ticket" });
  mocks.comments.addComment.mockResolvedValue({
    id: "44444444-4444-4444-8444-444444444444",
    ticketId,
    authorId: agentId,
    body: "Manual support reply.",
    isInternal: false,
    createdAt: new Date("2026-03-02T10:00:00.000Z")
  });
});

describe("ticket operations remain available when AI fails", () => {
  it("allows ticket creation, updates, and manual replies after an AI timeout", async () => {
    const aiResponse = await request(app)
      .post(`/tickets/${ticketId}/ai/categorise`)
      .set("Authorization", `Bearer ${token}`);
    expect(aiResponse.status).toBe(504);

    const createResponse = await request(app)
      .post("/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "New ticket",
        description: "A normal ticket request.",
        priority: "P2",
        category: "Account"
      });
    expect(createResponse.status).toBe(201);
    expect(mocks.tickets.addTicket).toHaveBeenCalledOnce();

    const updateResponse = await request(app)
      .patch(`/tickets/${ticketId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated ticket" });
    expect(updateResponse.status).toBe(200);
    expect(mocks.tickets.editTicket).toHaveBeenCalledOnce();

    const manualReplyResponse = await request(app)
      .post(`/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${token}`)
      .send({ body: "Manual support reply." });
    expect(manualReplyResponse.status).toBe(201);
    expect(mocks.comments.addComment).toHaveBeenCalledWith(
      ticketId,
      "Manual support reply.",
      false,
      { id: agentId, role: "agent" }
    );
  });
});
