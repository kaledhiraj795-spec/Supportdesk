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
    expect(request.config.safetySettings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE"
      })
    ]));
    expect(request.contents).toContain("I still cannot sign in.");
    expect(request.contents).not.toContain("Confidential staff note");
    expect(request.config.systemInstruction).not.toContain("I still cannot sign in.");
    expect(usageLog).toHaveBeenCalledWith("AI usage", expect.objectContaining({
      feature: "suggest_reply",
      promptVersion: "suggest-reply-v5",
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

  it("requests and preserves a complete professional reply", async () => {
    const completeReply = [
      "Hello,",
      "",
      "I understand that you are unable to sign in after resetting your password.",
      "Please confirm whether the reset link showed a success message and whether you see an error when you try to sign in.",
      "Please reply with the exact on-screen error and whether the reset page confirmed success; do not include a password or verification code.",
      "",
      "Kind regards,"
    ].join("\n");
    mocks.getTicketComments.mockResolvedValue([{
      body: "The sign-in page says the credentials are not accepted.",
      isInternal: false,
      createdAt: new Date("2026-03-02T10:00:00.000Z")
    }]);
    mocks.generateContentStream.mockResolvedValue(asyncStream([
      streamChunk(completeReply.slice(0, 85)),
      streamChunk(completeReply.slice(85))
    ]));

    await expect(
      collect(await prepareSuggestReplyForTicket(ticketId, agent))
    ).resolves.toBe(completeReply);

    const instructions = mocks.generateContentStream.mock.calls[0][0].config.systemInstruction;
    expect(instructions).toContain("do not return a one-line answer");
    expect(instructions).toContain("a greeting and acknowledgement");
    expect(instructions).toContain("relevant troubleshooting information or one focused question");
    expect(instructions).toContain("a clear next step with a professional closing");
    expect(instructions).toContain("rather than returning only a question");
    expect(instructions).toContain(
      "never ask again for information already present"
    );
    expect(instructions).toContain(
      "Ask only for the minimum non-sensitive information that is missing"
    );
    expect(instructions).toContain(
      "Never request passwords, authentication or reset codes, full email addresses"
    );
    expect(instructions).toContain(
      "Do not imply that you can access account records, payment systems, delivery logs"
    );
    expect(instructions).toContain(
      "Do not promise or claim future support actions or outcomes"
    );
    expect(instructions).toContain(
      "proofread the complete reply for spelling, grammar, repeated questions"
    );
  });

  it("builds isolated reply context for refund, profile, payment, and login tickets", async () => {
    const cases = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Refund status",
        description: "REFUND_CASE: the approved refund has not reached my account.",
        comment: "REFUND_MESSAGE: the bank has not posted the credit."
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        title: "Profile name change",
        description: "PROFILE_CASE: I need to update the display name on my account.",
        comment: "PROFILE_MESSAGE: the edit control does not save the new name."
      },
      {
        id: "44444444-4444-4444-8444-444444444444",
        title: "Payment pending",
        description: "PAYMENT_CASE: my completed payment still appears as pending.",
        comment: "PAYMENT_MESSAGE: the receipt shows the payment was completed."
      },
      {
        id: "55555555-5555-4555-8555-555555555555",
        title: "Login issue",
        description: "LOGIN_CASE: sign-in fails after a password reset; no support form is mentioned.",
        comment: "LOGIN_MESSAGE: the sign-in page says the credentials are not accepted."
      }
    ];
    const ticketsById = new Map(cases.map((sample) => [
      sample.id,
      { ...ticket, id: sample.id, title: sample.title, description: sample.description }
    ]));
    const commentsByTicket = new Map(cases.map((sample) => [
      sample.id,
      [{
        body: sample.comment,
        isInternal: false,
        createdAt: new Date("2026-03-02T10:00:00.000Z")
      }, {
        body: `INTERNAL-${sample.id}`,
        isInternal: true,
        createdAt: new Date("2026-03-02T11:00:00.000Z")
      }]
    ]));
    mocks.tickets.getTicketById.mockImplementation(async (id: string) =>
      ticketsById.get(id) ?? null
    );
    mocks.getTicketComments.mockImplementation(async (id: string) =>
      commentsByTicket.get(id) ?? null
    );
    mocks.generateContentStream.mockResolvedValue(asyncStream([streamChunk("Draft for review.")]));

    for (const sample of cases) {
      await collect(await prepareSuggestReplyForTicket(sample.id, agent));
    }

    expect(mocks.tickets.getTicketById.mock.calls.map(([id]) => id)).toEqual(
      cases.map(({ id }) => id)
    );
    expect(mocks.getTicketComments.mock.calls.map(([id]) => id)).toEqual(
      cases.map(({ id }) => id)
    );
    expect(mocks.generateContentStream).toHaveBeenCalledTimes(cases.length);

    for (const [index, sample] of cases.entries()) {
      const request = mocks.generateContentStream.mock.calls[index][0];
      const context = JSON.parse(request.contents) as {
        "<ticket_subject>": string;
        "<ticket_description>": string;
        "<ticket_metadata>": { status: string };
        "<recent_comments>": Array<{ "<customer_message>": string }>;
      };
      expect(context["<ticket_subject>"]).toBe(sample.title);
      expect(context["<ticket_description>"]).toContain(sample.description);
      expect(context["<recent_comments>"][0]["<customer_message>"]).toContain(sample.comment);
      expect(JSON.stringify(context)).not.toContain(`INTERNAL-${sample.id}`);
      for (const otherCase of cases.filter((_, otherIndex) => otherIndex !== index)) {
        expect(JSON.stringify(context)).not.toContain(otherCase.description);
        expect(JSON.stringify(context)).not.toContain(otherCase.comment);
      }
      expect(request.config.systemInstruction).toContain(
        "Do not suggest a generic support form"
      );
      expect(request.config.systemInstruction).toContain(
        "Use the supplied ticket subject, description, and latest public customer messages"
      );
    }
  });

  it("masks PII before sending ticket and comment context to the provider", async () => {
    mocks.tickets.getTicketById.mockResolvedValue({
      ...ticket,
      description: [
        "Email alice@example.com or call +1-202-555-0123.",
        "My password was SyntheticOnly-Was.42;",
        "password is SyntheticOnly-Is.43;",
        "password: SyntheticOnly-Colon.44;",
        "AIzaSySYNTHETICKEY0123456789ABCDEF"
      ].join(" ")
    });
    mocks.getTicketComments.mockResolvedValue([{
      body: "My card is 4111 1111 1111 1111. My OTP is 123456.",
      isInternal: false,
      createdAt: new Date("2026-03-02T10:00:00.000Z")
    }]);
    mocks.generateContentStream.mockResolvedValue(asyncStream([streamChunk("Please contact support.")]));

    await collect(await prepareSuggestReplyForTicket(ticketId, agent));

    const request = mocks.generateContentStream.mock.calls[0][0];
    expect(request.contents).not.toContain("alice@example.com");
    expect(request.contents).not.toContain("+1-202-555-0123");
    expect(request.contents).not.toContain("SyntheticOnly-Was.42");
    expect(request.contents).not.toContain("SyntheticOnly-Is.43");
    expect(request.contents).not.toContain("SyntheticOnly-Colon.44");
    expect(request.contents).not.toContain("AIzaSySYNTHETICKEY0123456789ABCDEF");
    expect(request.contents).not.toContain("4111 1111 1111 1111");
    expect(request.contents).not.toContain("123456");
    expect(request.contents).toContain("[email]");
    expect(request.contents).toContain("[credential]");
    expect(request.contents).toContain("[verification-code]");
    expect(request.contents).toContain("[payment-card]");
  });

  it.each([
    ["password was", "My password was SyntheticOnly-Was.42"],
    ["password is", "password is SyntheticOnly-Is.43"],
    ["password label", "password: SyntheticOnly-Colon.44"],
    ["OTP", "Your OTP is 123456"],
    ["Google-style API key", "AIzaSySYNTHETICKEY0123456789ABCDEF"]
  ])("rejects generated output containing a %s value", async (_label, output) => {
    mocks.generateContentStream.mockResolvedValue(asyncStream([streamChunk(output)]));

    await expect(
      collect(await prepareSuggestReplyForTicket(ticketId, agent))
    ).rejects.toMatchObject({
      name: "AiFeatureError",
      statusCode: 502
    });
  });

  it("rejects provider output that discloses instructions or claims privileged actions", async () => {
    mocks.generateContentStream.mockResolvedValue(asyncStream([
      streamChunk("I have refunded the account. The system prompt is confidential.")
    ]));

    await expect(
      collect(await prepareSuggestReplyForTicket(ticketId, agent))
    ).rejects.toMatchObject({
      name: "AiFeatureError",
      statusCode: 502
    });
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

  it("maps provider request timeouts to a safe 504 response", async () => {
    const timeout = new Error("deadline exceeded");
    timeout.name = "TimeoutError";
    mocks.generateContentStream.mockRejectedValue(timeout);
    const diagnosticLog = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(prepareSuggestReplyForTicket(ticketId, agent)).rejects.toMatchObject({
      message: "AI provider request timed out.",
      statusCode: 504
    });
    expect(diagnosticLog).toHaveBeenCalledWith("AI feature request failed", expect.objectContaining({
      diagnostic: "provider_timeout"
    }));
  });

  it("maps timeouts during reply streaming to a safe 504 response", async () => {
    const interruptedStream = {
      async *[Symbol.asyncIterator]() {
        yield streamChunk("Partial draft");
        const timeout = new Error("request timed out");
        timeout.name = "TimeoutError";
        throw timeout;
      }
    };
    mocks.generateContentStream.mockResolvedValue(interruptedStream);

    await expect(
      collect(await prepareSuggestReplyForTicket(ticketId, agent))
    ).rejects.toMatchObject({
      message: "AI provider request timed out.",
      statusCode: 504
    });
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
      promptVersion: "auto-categorise-v2"
    });
    const request = mocks.generateContent.mock.calls[0][0];
    expect(request.config.systemInstruction).toContain("allowed category");
    expect(request.config.responseMimeType).toBe("application/json");
    expect(request.config.safetySettings).toHaveLength(4);
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
