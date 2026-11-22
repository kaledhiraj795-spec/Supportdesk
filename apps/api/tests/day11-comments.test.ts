import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findAccessibleTicket: vi.fn(),
  findComments: vi.fn(),
  createComment: vi.fn()
}));

vi.mock("../src/repositories/comments.repository", () => mocks);

import { addComment, getTicketComments } from "../src/services/comments.service";

describe("Day 11 comment service", () => {
  it("creates a public comment for a customer from verified identity", async () => {
    mocks.findAccessibleTicket.mockResolvedValue({ id: "ticket-id" });
    mocks.createComment.mockResolvedValue({ id: "comment-id" });

    await addComment(
      "ticket-id",
      "Public update",
      true,
      { id: "customer-id", role: "customer" }
    );

    expect(mocks.createComment).toHaveBeenCalledWith({
      ticketId: "ticket-id",
      authorId: "customer-id",
      body: "Public update",
      isInternal: false
    });
  });

  it("allows agent internal comments", async () => {
    mocks.findAccessibleTicket.mockResolvedValue({ id: "ticket-id" });
    mocks.createComment.mockResolvedValue({ id: "comment-id" });

    await addComment(
      "ticket-id",
      "Internal note",
      true,
      { id: "agent-id", role: "agent" }
    );

    expect(mocks.createComment).toHaveBeenCalledWith({
      ticketId: "ticket-id",
      authorId: "agent-id",
      body: "Internal note",
      isInternal: true
    });
  });

  it("returns null for a missing or inaccessible ticket", async () => {
    mocks.findAccessibleTicket.mockResolvedValue(null);

    expect(await getTicketComments(
      "missing-ticket",
      { id: "customer-id", role: "customer" }
    )).toBeNull();
  });

  it("hides internal comments from customer repository queries", async () => {
    mocks.findAccessibleTicket.mockResolvedValue({ id: "ticket-id" });
    mocks.findComments.mockResolvedValue([{ id: "public-comment", isInternal: false }]);

    const comments = await getTicketComments(
      "ticket-id",
      { id: "customer-id", role: "customer" }
    );

    expect(comments).toEqual([{ id: "public-comment", isInternal: false }]);
  });

  it("propagates repository failures", async () => {
    mocks.findAccessibleTicket.mockRejectedValue(new Error("database unavailable"));
    await expect(getTicketComments(
      "ticket-id",
      { id: "agent-id", role: "agent" }
    )).rejects.toThrow("database unavailable");
  });
});
