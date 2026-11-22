import { describe, expect, it, vi } from "vitest";

vi.mock("../src/repositories/tickets.repository", () => ({
  findTicketsPage: vi.fn(),
  countTickets: vi.fn(),
  findTicketById: vi.fn()
}));

import { parseTicketQuery } from "../src/validators/tickets.query";
import { getTicketPage } from "../src/services/tickets.service";
import { findTicketsPage, countTickets } from "../src/repositories/tickets.repository";

describe("Day 11 ticket query validation", () => {
  it("applies defaults for pagination and sorting", () => {
    const result = parseTicketQuery({});
    expect(result.success).toBe(true);
    expect(result.success && result.data).toMatchObject({
      page: 1,
      limit: 20,
      sortBy: "createdAt",
      sortOrder: "desc"
    });
  });

  it("rejects invalid status, priority, assignee, sort, and pagination", () => {
    expect(parseTicketQuery({ status: "unknown" }).success).toBe(false);
    expect(parseTicketQuery({ priority: "P9" }).success).toBe(false);
    expect(parseTicketQuery({ assigneeId: "not-a-uuid" }).success).toBe(false);
    expect(parseTicketQuery({ sortBy: "passwordHash" }).success).toBe(false);
    expect(parseTicketQuery({ sortOrder: "sideways" }).success).toBe(false);
    expect(parseTicketQuery({ page: "0" }).success).toBe(false);
  });

  it("accepts valid filters and search", () => {
    const result = parseTicketQuery({
      status: "open",
      priority: "P2",
      assigneeId: "11111111-1111-4111-8111-111111111111",
      search: "login",
      sortBy: "title",
      sortOrder: "asc",
      page: "2",
      limit: "10"
    });
    expect(result.success).toBe(true);
  });

  it("normalizes empty search to no search filter", () => {
    const result = parseTicketQuery({ search: "   " });
    expect(result.success).toBe(true);
    expect(result.success && result.data.search).toBeUndefined();
  });
});

describe("Day 11 ticket visibility/query service", () => {
  it("returns page metadata and applies customer identity", async () => {
    vi.mocked(findTicketsPage).mockResolvedValue([]);
    vi.mocked(countTickets).mockResolvedValue(0);

    const result = await getTicketPage(
      parseTicketQuery({}).data!,
      { id: "customer-id", role: "customer" }
    );

    expect(findTicketsPage).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 20 }),
      expect.objectContaining({ id: "customer-id", role: "customer" })
    );
    expect(result.meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });
});
