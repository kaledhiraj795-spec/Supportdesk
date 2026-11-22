import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardPage } from "./DashboardPage";
import { saveSession, type AuthSession, type UserRole } from "../lib/auth";

const tickets = [
  {
    id: "ticket-open",
    title: "Open ticket",
    description: "Open request",
    status: "open",
    priority: "P1",
    category: "Access",
    createdAt: "2026-02-04T00:00:00.000Z"
  },
  {
    id: "ticket-progress",
    title: "In progress ticket",
    description: "In progress request",
    status: "in_progress",
    priority: "P2",
    category: "Billing",
    createdAt: "2026-02-03T00:00:00.000Z"
  },
  {
    id: "ticket-resolved",
    title: "Resolved ticket",
    description: "Resolved request",
    status: "resolved",
    priority: "P3",
    category: "Account",
    createdAt: "2026-02-02T00:00:00.000Z"
  },
  {
    id: "ticket-closed",
    title: "Closed ticket",
    description: "Closed request",
    status: "closed",
    priority: "P4",
    category: "Other",
    createdAt: "2026-02-01T00:00:00.000Z"
  },
  {
    id: "ticket-waiting",
    title: "Waiting ticket",
    description: "Waiting request",
    status: "waiting_on_customer",
    priority: "P1",
    category: "Access",
    createdAt: "2026-01-31T00:00:00.000Z"
  }
];

const sessionFor = (role: UserRole): AuthSession => ({
  token: "test-token",
  user: {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
    role,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
});

const fetchMock = vi.fn<typeof fetch>();
const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

const renderDashboard = (role: UserRole) => {
  saveSession(sessionFor(role));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><DashboardPage /></MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("DashboardPage", () => {
  it("computes counts and staff distributions from the fetched ticket data", async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      data: tickets,
      error: null,
      meta: { page: 1, limit: 100, total: tickets.length, totalPages: 1 }
    }));
    renderDashboard("agent");

    const summary = screen.getByRole("region", { name: "Ticket summary" });
    expect(await within(summary).findByText("5")).toBeInTheDocument();
    expect(within(summary).getByText("Open").parentElement).toHaveTextContent("1");
    expect(within(summary).getByText("In Progress").parentElement).toHaveTextContent("1");
    expect(within(summary).getByText("Resolved / Closed").parentElement).toHaveTextContent("2");
    expect(screen.getByRole("progressbar", { name: "Waiting on Customer tickets" })).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("progressbar", { name: "P1 tickets" })).toHaveAttribute("aria-valuenow", "2");
    expect(await screen.findByText("Open ticket")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View all" })).toHaveAttribute("href", "/tickets");
  });

  it("shows loading dashes and omits staff distributions for customers", async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    renderDashboard("customer");

    expect(screen.getAllByText("—")).toHaveLength(4);
    expect(screen.getByRole("status")).toHaveTextContent("Loading recent tickets");
    expect(screen.queryByRole("region", { name: "Ticket distributions" })).not.toBeInTheDocument();

    resolveResponse(jsonResponse({
      data: [],
      error: null,
      meta: { page: 1, limit: 100, total: 0, totalPages: 0 }
    }));
    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
    expect(screen.getByText("How can we help today?")).toBeInTheDocument();
  });
});
