import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tickets: {
    getTicketById: vi.fn(),
    editTicket: vi.fn()
  },
  getTicketComments: vi.fn(),
  generateContentStream: vi.fn(),
  generateContent: vi.fn()
}));

vi.mock("../src/services/tickets.service", () => mocks.tickets);
vi.mock("../src/services/comments.service", () => ({
  getTicketComments: mocks.getTicketComments
}));
vi.mock("../src/ai/client", () => ({
  getGeminiClient: () => ({
    models: {
      generateContentStream: mocks.generateContentStream,
      generateContent: mocks.generateContent
    }
  })
}));

import {
  prepareSuggestReplyForTicket,
  suggestCategoryAndPriorityForTicket
} from "../src/ai/ai.service";
import { AiFeatureError } from "../src/ai/errors";
import type { AuthIdentity } from "../src/types/auth";

const ticket = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "Unable to sign in",
  description: "The sign-in page shows an error.",
  status: "open",
  priority: "P2",
  category: "Account",
  creatorId: "11111111-1111-4111-8111-111111111111",
  assigneeId: null,
  slaDueAt: null,
  createdAt: new Date("2026-03-01T10:00:00.000Z"),
  updatedAt: new Date("2026-03-01T10:00:00.000Z")
};

const agent: AuthIdentity = {
  id: "22222222-2222-4222-8222-222222222222",
  role: "agent"
};

const ticketId = ticket.id;
const providerUsage = {
  promptTokenCount: 90,
  candidatesTokenCount: 30,
  totalTokenCount: 120
};

const asyncStream = (items: unknown[]) => ({
  async *[Symbol.asyncIterator]() {
    for (const item of items) yield item;
  }
});

const streamChunk = (content?: string, usage: unknown = null) => ({
  text: content,
  usageMetadata: usage
});

const collect = async (stream: AsyncIterable<string>) => {
  let result = "";
  for await (const text of stream) result += text;
  return result;
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.tickets.getTicketById.mockResolvedValue(ticket);
  mocks.getTicketComments.mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ticket AI service", () => {
  it("streams a reply draft from public context and logs returned usage only", async () => {
    mocks.getTicketComments.mockResolvedValue([
      {
        body: "I still cannot sign in.",
        isInternal: false,
        createdAt: new Date("2026-03-02T10:00:00.000Z")
      },
      {
        body: "Confidential staff note",
        isInternal: true,
        createdAt: new Date("2026-03-02T11:00:00.000Z")
      }
    ]);
    mocks.generateContentStream.mockResolvedValue(asyncStream([
      streamChunk("Thanks for"),
      streamChunk(" letting us know."),
      streamChunk(undefined, providerUsage)
    ]));
    const usageLog = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const stream = await prepareSuggestReplyForTicket(ticketId, agent);

    await expect(collect(stream)).resolves.toBe("Thanks for letting us know.");
    const request = mocks.generateContentStream.mock.calls[0][0];
    expect(request.config.systemInstruction).toContain("agent to review");
    expect(request.contents).toContain("I still cannot sign in.");
    expect(request.contents).not.toContain("Confidential staff note");
    expect(request.config.systemInstruction).not.toContain("I still cannot sign in.");
    expect(usageLog).toHaveBeenCalledWith("AI usage", expect.objectContaining({
      feature: "suggest_reply",
      promptVersion: "suggest-reply-v1",
      promptTokenCount: 90,
      candidatesTokenCount: 30,
      totalTokenCount: 120
    }));
    expect(mocks.tickets.editTicket).not.toHaveBeenCalled();
  });

  it("supports a minimal ticket with no comments", async () => {
    mocks.tickets.getTicketById.mockResolvedValue({
      ...ticket,
      title: "Password reset",
      description: "The reset link expired."
    });
    mocks.generateContentStream.mockResolvedValue(asyncStream([streamChunk("Please try a new link.")]));

    await expect(
      collect(await prepareSuggestReplyForTicket(ticketId, agent))
    ).resolves.toBe("Please try a new link.");
  });

  it("rejects an empty ticket context without contacting the provider", async () => {
    mocks.tickets.getTicketById.mockResolvedValue({
      ...ticket,
      title: " ",
      description: "\n"
    });
    const diagnosticLog = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(prepareSuggestReplyForTicket(ticketId, agent)).rejects.toMatchObject({
      name: "AiFeatureError",
      statusCode: 422
    });
    expect(mocks.generateContentStream).not.toHaveBeenCalled();
    expect(JSON.stringify(diagnosticLog.mock.calls)).not.toContain("Unable to sign in");
  });

  it("returns a safe error when the provider rejects a reply request", async () => {
    mocks.generateContentStream.mockRejectedValue(new Error("sensitive provider response"));
    const diagnosticLog = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(prepareSuggestReplyForTicket(ticketId, agent)).rejects.toMatchObject({
      message: "AI provider request failed.",
      statusCode: 502
    });
    expect(JSON.stringify(diagnosticLog.mock.calls)).not.toContain("sensitive provider response");
  });

  it("reports a mid-stream interruption without exposing provider details", async () => {
    const interruptedStream = {
      async *[Symbol.asyncIterator]() {
        yield streamChunk("Partial draft");
        throw new Error("provider response containing private data");
      }
    };
    mocks.generateContentStream.mockResolvedValue(interruptedStream);
    const diagnosticLog = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      collect(await prepareSuggestReplyForTicket(ticketId, agent))
    ).rejects.toMatchObject({
      message: "AI reply generation was interrupted.",
      statusCode: 502
    });
    expect(JSON.stringify(diagnosticLog.mock.calls)).not.toContain("private data");
  });

  it("returns a validated category and priority suggestion without persisting it", async () => {
    mocks.generateContent.mockResolvedValue({
      text: JSON.stringify({ category: "Account", priority: "P1" }),
      usageMetadata: providerUsage
    });

    await expect(suggestCategoryAndPriorityForTicket(ticketId, agent)).resolves.toEqual({
      category: "Account",
      priority: "P1",
      promptVersion: "auto-categorise-v1"
    });
    const request = mocks.generateContent.mock.calls[0][0];
    expect(request.config.systemInstruction).toContain("allowed category");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.contents).toContain(ticket.title);
    expect(request.config.systemInstruction).not.toContain(ticket.title);
    expect(mocks.tickets.editTicket).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "not-json"],
    ["a missing field", JSON.stringify({ category: "Account" })],
    ["an unsupported category", JSON.stringify({ category: "Security", priority: "P2" })],
    ["an unsupported priority", JSON.stringify({ category: "Account", priority: "urgent" })],
    ["an unexpected field", JSON.stringify({ category: "Account", priority: "P2", explanation: "text" })]
  ])("rejects %s without saving a suggestion", async (_label, content) => {
    mocks.generateContent.mockResolvedValue({
      text: content,
      usageMetadata: providerUsage
    });

    await expect(suggestCategoryAndPriorityForTicket(ticketId, agent)).rejects.toBeInstanceOf(
      AiFeatureError
    );
    expect(mocks.tickets.editTicket).not.toHaveBeenCalled();
  });

  it("rejects a provider failure during categorisation", async () => {
    mocks.generateContent.mockRejectedValue({
      message: "provider response contains AQ.test-secret",
      status: 403,
      error: { details: [{ reason: "SERVICE_DISABLED" }] }
    });
    const diagnosticLog = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(suggestCategoryAndPriorityForTicket(ticketId, agent)).rejects.toMatchObject({
      message: "AI provider request failed.",
      statusCode: 502
    });
    expect(diagnosticLog).toHaveBeenCalledWith("AI feature request failed", expect.objectContaining({
      diagnostic: "provider_request_failed",
      upstreamStatusCode: 403,
      upstreamReason: "SERVICE_DISABLED"
    }));
    expect(JSON.stringify(diagnosticLog.mock.calls)).not.toContain("AQ.test-secret");
  });

  it("denies customer access before reading ticket content", async () => {
    await expect(
      prepareSuggestReplyForTicket(ticketId, { id: "customer", role: "customer" })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(mocks.tickets.getTicketById).not.toHaveBeenCalled();
    expect(mocks.generateContentStream).not.toHaveBeenCalled();
    expect(mocks.generateContent).not.toHaveBeenCalled();
  });
});
