import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TicketsPage } from "./TicketsPage";
import type { Ticket } from "../features/tickets/api/tickets-api";
import { saveSession, type AuthSession, type UserRole } from "../lib/auth";

const tickets: Ticket[] = [
  {
    id: "ticket-open",
    title: "Open request",
    description: "Please help",
    status: "open",
    priority: "P1",
    category: "Access",
    createdAt: "2026-03-01T10:00:00.000Z"
  },
  {
    id: "ticket-resolved",
    title: "Resolved request",
    description: "Completed",
    status: "resolved",
    priority: "P2",
    category: "Billing",
    createdAt: "2026-03-02T10:00:00.000Z"
  },
  {
    id: "ticket-closed",
    title: "Closed request",
    description: "Completed and closed",
    status: "closed",
    priority: "P3",
    category: "Account",
    createdAt: "2026-03-03T10:00:00.000Z"
  }
];

const fetchMock = vi.fn<typeof fetch>();
const pageResponse = (data: Ticket[], page: number, limit: number, total: number) =>
  new Response(JSON.stringify({
    data,
    error: null,
    meta: { page, limit, total, totalPages: total === 0 ? 0 : Math.ceil(total / limit) }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });

const sessionFor = (role: UserRole): AuthSession => ({
  token: "test-token",
  user: {
    id: "customer-7",
    name: "Test User",
    email: "test@example.com",
    role,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
});

const renderTickets = (entry = "/tickets", role: UserRole = "customer") => {
  saveSession(sessionFor(role));
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <TicketsPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
  return queryClient;
};

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async (input) => {
    const url = new URL(String(input));
    const requestedStatuses = url.searchParams.getAll("status");
    const filtered = requestedStatuses.length > 0
      ? tickets.filter((ticket) => requestedStatuses.includes(ticket.status))
      : tickets;
    const page = Number(url.searchParams.get("page") ?? 1);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const start = (page - 1) * limit;
    return pageResponse(filtered.slice(start, start + limit), page, limit, filtered.length);
  });
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("TicketsPage", () => {
  it("requests repeated status filters from the API and shows the compact reset action", async () => {
    const user = userEvent.setup();
    renderTickets("/tickets?status=resolved&status=CLOSED");

    expect(await screen.findByText("Resolved request")).toBeInTheDocument();
    expect(screen.getByText("Closed request")).toBeInTheDocument();
    expect(screen.queryByText("Open request")).not.toBeInTheDocument();
    expect(screen.getByText(/Filtering by:/i).parentElement).toHaveTextContent("Status: Resolved / Closed");
    expect(screen.getByRole("link", { name: "Reset" })).toHaveAttribute("href", "/tickets");
    expect(screen.getByRole("link", { name: /Resolved request.*priority P2.*status Resolved.*updated/ })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("__multiple__");

    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.getAll("status")).toEqual(["resolved", "closed"]);
    expect(requestedUrl.searchParams.get("page")).toBe("1");
    expect(requestedUrl.searchParams.get("limit")).toBe("20");

    await user.selectOptions(screen.getByRole("combobox", { name: "Priority" }), "P1");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const nextUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(nextUrl.searchParams.getAll("status")).toEqual(["resolved", "closed"]);
    expect(nextUrl.searchParams.get("priority")).toBe("P1");
  });

  it("passes all supported filters and sorting to the API", async () => {
    renderTickets("/tickets?status=open&priority=P1&assigneeId=11111111-1111-4111-8111-111111111111&search=login&sortBy=title&sortOrder=asc&limit=1", "agent");

    expect(await screen.findByText("Open request")).toBeInTheDocument();
    expect(screen.getByLabelText("Assignee ID")).toBeInTheDocument();
    expect(screen.getByText("Ticket title")).toBeInTheDocument();
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.searchParams.get("status")).toBe("open");
    expect(requestedUrl.searchParams.get("priority")).toBe("P1");
    expect(requestedUrl.searchParams.get("assigneeId")).toBe("11111111-1111-4111-8111-111111111111");
    expect(requestedUrl.searchParams.get("search")).toBe("login");
    expect(requestedUrl.searchParams.get("sortBy")).toBe("title");
    expect(requestedUrl.searchParams.get("sortOrder")).toBe("asc");
    expect(requestedUrl.searchParams.get("limit")).toBe("1");
    const queue = screen.getByRole("region", { name: "Agent ticket queue" });
    const table = within(queue).getByRole("table", { name: "All tickets" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "Ticket title",
      "Category",
      "Priority",
      "Status",
      "Updated"
    ]);
    expect(within(table).getByRole("link", { name: /Open request.*priority P1.*status Open/ }))
      .toHaveAttribute("href", "/tickets/ticket-open");
  });

  it("hides raw assignee filters from customers while preserving URL-backed filtering", async () => {
    const user = userEvent.setup();
    const assigneeId = "11111111-1111-4111-8111-111111111111";
    renderTickets(`/tickets?assigneeId=${assigneeId}`, "customer");

    expect(await screen.findByText("Open request")).toBeInTheDocument();
    expect(screen.queryByLabelText("Assignee ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Tickets per page")).not.toBeInTheDocument();
    expect(screen.queryByText(assigneeId)).not.toBeInTheDocument();
    expect(screen.getByText("Assignment filter applied")).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All statuses" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveDisplayValue("Newest created");

    await user.selectOptions(screen.getByRole("combobox", { name: "Priority" }), "P1");
    await user.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "title:asc");
    await user.click(screen.getByRole("button", { name: "Apply" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const appliedUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(appliedUrl.searchParams.get("assigneeId")).toBe(assigneeId);
    expect(appliedUrl.searchParams.get("priority")).toBe("P1");
    expect(appliedUrl.searchParams.get("sortBy")).toBe("title");
    expect(appliedUrl.searchParams.get("sortOrder")).toBe("asc");
  });

  it("loads the requested page and preserves active filters when moving forward", async () => {
    const user = userEvent.setup();
    fetchMock.mockImplementation(async (input) => {
      const url = new URL(String(input));
      const page = Number(url.searchParams.get("page") ?? 1);
      return page === 1
        ? pageResponse([tickets[0]], 1, 1, 2)
        : pageResponse([tickets[1]], 2, 1, 2);
    });
    renderTickets("/tickets?priority=P1&search=login&sortBy=title&sortOrder=asc&limit=1");

    expect(await screen.findByText("Open request")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Resolved request")).toBeInTheDocument();
    expect(screen.queryByText("Open request")).not.toBeInTheDocument();

    const nextUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(nextUrl.searchParams.get("page")).toBe("2");
    expect(nextUrl.searchParams.get("priority")).toBe("P1");
    expect(nextUrl.searchParams.get("search")).toBe("login");
    expect(nextUrl.searchParams.get("sortBy")).toBe("title");
    expect(nextUrl.searchParams.get("sortOrder")).toBe("asc");

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(await screen.findByText("Open request")).toBeInTheDocument();
    const previousUrl = new URL(String(fetchMock.mock.calls.at(-1)?.[0]));
    expect(previousUrl.searchParams.get("page")).toBe("1");
    expect(previousUrl.searchParams.get("priority")).toBe("P1");
  });

  it("shows loading, API error, and empty states distinctly", async () => {
    let resolveResponse: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    renderTickets();
    expect(screen.getByRole("status")).toHaveTextContent("Loading tickets");

    resolveResponse(pageResponse([], 1, 20, 0));
    expect(await screen.findByText("No tickets yet")).toBeInTheDocument();
  });

  it("shows the backend message when a list request fails", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      data: null,
      error: { message: "Invalid query parameters" },
      meta: null
    }), {
      status: 400,
      statusText: "Bad Request",
      headers: { "Content-Type": "application/json" }
    }));
    renderTickets("/tickets?assigneeId=invalid");

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid query parameters");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
