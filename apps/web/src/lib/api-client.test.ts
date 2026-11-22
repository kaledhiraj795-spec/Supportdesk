import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiRequest } from "./api-client";
import { clearSession, getSession, saveSession, type AuthSession } from "./auth";

const session: AuthSession = {
  token: "test-token",
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role: "customer",
    createdAt: "2026-01-01T00:00:00.000Z"
  }
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  clearSession();
});

afterEach(() => {
  clearSession();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("uses the configured base URL and bearer token and unwraps the API envelope", async () => {
    saveSession(session);
    fetchMock.mockResolvedValue(jsonResponse({ data: [{ id: "ticket-1" }], error: null, meta: null }));

    await expect(apiRequest<{ id: string }[]>("/tickets")).resolves.toEqual([{ id: "ticket-1" }]);
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3000/tickets");
    const requestHeaders = new Headers(fetchMock.mock.calls[0][1]?.headers);
    expect(requestHeaders.get("Accept")).toBe("application/json");
    expect(requestHeaders.get("Authorization")).toBe("Bearer test-token");
  });

  it("clears an invalid session after an authenticated 401 response", async () => {
    saveSession(session);
    fetchMock.mockResolvedValue(jsonResponse({
      data: null,
      error: { message: "Authentication required" },
      meta: null
    }, 401));

    await expect(apiRequest("/tickets")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "Authentication required"
    });
    expect(getSession()).toBeNull();
  });

  it("returns a safe network error without leaking fetch details", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));

    await expect(apiRequest("/tickets")).rejects.toEqual(
      expect.objectContaining({
        name: "ApiError",
        status: 0,
        message: "Unable to reach the SupportDesk API. Check your connection and try again."
      })
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
