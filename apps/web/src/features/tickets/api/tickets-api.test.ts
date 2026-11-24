import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAllTickets } from "./tickets-api";
import { saveSession, type AuthSession } from "../../../lib/auth";

const session: AuthSession = {
  token: "test-token",
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "agent",
    createdAt: "2026-01-01T00:00:00.000Z"
  }
};

const fetchMock = vi.fn<typeof fetch>();
const page = (pageNumber: number, totalPages: number, id: string) =>
  new Response(JSON.stringify({
    data: [{
      id,
      title: `Ticket ${id}`,
      description: "Request",
      status: "open",
      priority: "P2",
      category: "General",
      createdAt: "2026-01-01T00:00:00.000Z"
    }],
    error: null,
    meta: { page: pageNumber, limit: 100, total: totalPages, totalPages }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  sessionStorage.clear();
  saveSession(session);
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getAllTickets", () => {
  it("fetches every backend page before returning tickets for analytics", async () => {
    fetchMock
      .mockResolvedValueOnce(page(1, 3, "one"))
      .mockResolvedValueOnce(page(2, 3, "two"))
      .mockResolvedValueOnce(page(3, 3, "three"));

    const result = await getAllTickets();

    expect(result.map((ticket) => ticket.id)).toEqual(["one", "two", "three"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "http://localhost:3000/tickets?page=1&limit=100",
      "http://localhost:3000/tickets?page=2&limit=100",
      "http://localhost:3000/tickets?page=3&limit=100"
    ]);
  });
});