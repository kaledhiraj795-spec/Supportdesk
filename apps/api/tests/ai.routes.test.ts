import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import request from "supertest";

const mocks = vi.hoisted(() => ({
  prepareSuggestReplyForTicket: vi.fn(),
  suggestCategoryAndPriorityForTicket: vi.fn()
}));

vi.mock("../src/ai/ai.service", () => mocks);

import app from "../src/app";
import { AiFeatureError } from "../src/ai/errors";

const ticketId = "33333333-3333-4333-8333-333333333333";
const secret = "test-only-secret-that-is-at-least-32-characters";
const tokenFor = (role: string) =>
  jwt.sign({ userId: "22222222-2222-4222-8222-222222222222", role }, secret);

const draftStream = (items: string[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const text of items) yield text;
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.suggestCategoryAndPriorityForTicket.mockResolvedValue({
    category: "Account",
    priority: "P1",
    promptVersion: "auto-categorise-v1"
  });
  mocks.prepareSuggestReplyForTicket.mockResolvedValue(draftStream(["Please ", "try again."]));
});

describe("ticket AI routes", () => {
  it("requires authentication and denies customer AI access", async () => {
    const unauthenticated = await request(app)
      .post(`/tickets/${ticketId}/ai/categorise`);
    expect(unauthenticated.status).toBe(401);

    const customerResponse = await request(app)
      .post(`/tickets/${ticketId}/ai/categorise`)
      .set("Authorization", `Bearer ${tokenFor("customer")}`);
    expect(customerResponse.status).toBe(403);
    const customerReplyResponse = await request(app)
      .post(`/tickets/${ticketId}/ai/suggest-reply`)
      .set("Authorization", `Bearer ${tokenFor("customer")}`);
    expect(customerReplyResponse.status).toBe(403);
    expect(mocks.suggestCategoryAndPriorityForTicket).not.toHaveBeenCalled();
    expect(mocks.prepareSuggestReplyForTicket).not.toHaveBeenCalled();
  });

  it("returns the validated suggestion envelope to an authenticated agent", async () => {
    const response = await request(app)
      .post(`/tickets/${ticketId}/ai/categorise`)
      .set("Authorization", `Bearer ${tokenFor("agent")}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: {
        category: "Account",
        priority: "P1",
        promptVersion: "auto-categorise-v1"
      },
      error: null,
      meta: null
    });
    expect(mocks.suggestCategoryAndPriorityForTicket).toHaveBeenCalledWith(
      ticketId,
      expect.objectContaining({ role: "agent" })
    );
  });

  it("returns a safe Gemini configuration error without exposing provider details", async () => {
    mocks.suggestCategoryAndPriorityForTicket.mockRejectedValue(
      new AiFeatureError("AI features are not configured.", 503)
    );

    const response = await request(app)
      .post(`/tickets/${ticketId}/ai/categorise`)
      .set("Authorization", `Bearer ${tokenFor("agent")}`);

    expect(response.status).toBe(503);
    expect(response.body).toEqual({
      data: null,
      error: { message: "AI features are not configured." },
      meta: null
    });
  });

  it("streams reply deltas to an authenticated staff user", async () => {
    const response = await request(app)
      .post(`/tickets/${ticketId}/ai/suggest-reply`)
      .set("Authorization", `Bearer ${tokenFor("admin")}`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/event-stream");
    expect(response.text).toContain('event: delta\ndata: {"text":"Please "}');
    expect(response.text).toContain('event: delta\ndata: {"text":"try again."}');
    expect(response.text).toContain("event: done");
  });

  it("sends a safe SSE error when reply streaming is interrupted", async () => {
    const interrupted = {
      async *[Symbol.asyncIterator]() {
        yield "partial";
        throw new AiFeatureError("AI reply generation was interrupted.", 502);
      }
    };
    mocks.prepareSuggestReplyForTicket.mockResolvedValue(interrupted);

    const response = await request(app)
      .post(`/tickets/${ticketId}/ai/suggest-reply`)
      .set("Authorization", `Bearer ${tokenFor("agent")}`);

    expect(response.status).toBe(200);
    expect(response.text).toContain("event: error");
    expect(response.text).toContain("AI reply generation was interrupted.");
  });
});
