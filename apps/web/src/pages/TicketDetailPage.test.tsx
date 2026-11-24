import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TicketList } from "../features/tickets/components/TicketList";
import { TicketDetailPage } from "./TicketDetailPage";
import { saveSession, type AuthSession, type UserRole } from "../lib/auth";

const ticket = {
  id: "ticket-42",
  title: "Unable to access account",
  description: "Sign-in fails after password reset.\nThe issue began this morning.",
  status: "in_progress",
  priority: "P2",
  category: "Account",
  createdAt: "2026-03-01T10:00:00.000Z",
  updatedAt: "2026-03-02T12:30:00.000Z",
  creatorId: "customer-7",
  assigneeId: "agent-3",
  slaDueAt: "2026-03-04T10:00:00.000Z"
};

const comments = [
  {
    id: "comment-2",
    ticketId: ticket.id,
    authorId: "agent-3",
    body: "Second update",
    isInternal: true,
    createdAt: "2026-03-03T12:30:00.000Z"
  },
  {
    id: "comment-1",
    ticketId: ticket.id,
    authorId: "customer-7",
    body: "First update",
    isInternal: false,
    createdAt: "2026-03-02T12:30:00.000Z"
  },
  {
    id: "comment-3",
    ticketId: ticket.id,
    authorId: "agent-3",
    body: "Public support reply",
    isInternal: false,
    createdAt: "2026-03-03T14:30:00.000Z"
  }
];

const sessionFor = (role: UserRole): AuthSession => ({
  token: "test-token",
  user: {
    id: role === "customer" ? "customer-7" : "agent-3",
    name: "Test User",
    email: "test@example.com",
    role,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
});

const fetchMock = vi.fn<typeof fetch>();
let currentStatus = "in_progress";
let currentComments = [...comments];
const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify({
    data,
    error: null,
    meta: null
  }), {
    status,
    headers: { "Content-Type": "application/json" }
  });

const renderDetail = (role: UserRole = "agent", queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
})) => {
  saveSession(sessionFor(role));
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/tickets/ticket-42"]}>
        <Routes>
          <Route path="/tickets" element={<TicketList params={{ page: 1, limit: 20 }} onPageChange={() => undefined} />} />
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return queryClient;
};

beforeEach(() => {
  vi.stubEnv("VITE_API_BASE_URL", "http://localhost:3000");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  currentStatus = "in_progress";
  currentComments = [...comments];
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === "/tickets/ticket-42/comments" && init?.method === "POST") {
      const requestBody = JSON.parse(String(init.body)) as { body: string; isInternal?: boolean };
      const created = {
        id: "comment-new",
        ticketId: ticket.id,
        authorId: "agent-3",
        body: requestBody.body,
        isInternal: requestBody.isInternal ?? false,
        createdAt: "2026-03-04T12:30:00.000Z"
      };
      currentComments = [...currentComments, created];
      return jsonResponse(created, 201);
    }
    if (url.pathname === "/tickets/ticket-42" && init?.method === "PATCH") {
      currentStatus = (JSON.parse(String(init.body)) as { status: string }).status;
      return jsonResponse({ ...ticket, status: currentStatus });
    }
    if (url.pathname === "/tickets/ticket-42/comments") {
      return jsonResponse(currentComments);
    }
    if (url.pathname === "/tickets/ticket-42") {
      return jsonResponse({ ...ticket, status: currentStatus });
    }
    if (url.pathname === "/tickets") {
      return jsonResponse({
        data: [{ ...ticket, status: currentStatus }],
        error: null,
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 }
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  });
});

afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("TicketDetailPage", () => {
  it("shows chronologically ordered comments and lets staff add internal notes and update status", async () => {
    const user = userEvent.setup();
    renderDetail("agent");

    expect(await screen.findByRole("heading", { name: ticket.title })).toBeInTheDocument();
    expect(screen.getByText("Ticket ID: ticket-42")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ticket properties" })).toBeInTheDocument();
    expect(screen.getByText(/Sign-in fails after password reset/)).toBeInTheDocument();
    const firstComment = await screen.findByText("First update");
    const secondComment = screen.getByText("Second update");
    expect(firstComment.compareDocumentPosition(secondComment) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText("Internal note")).toBeInTheDocument();
    expect(screen.getAllByText("Agent")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: /Internal note/ })).toBeInTheDocument();
    expect(screen.getByLabelText("Update status")).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: "Ticket properties" })).toContainElement(
      screen.getByLabelText("Update status")
    );

    await user.type(screen.getByRole("textbox", { name: "Message" }), "Staff only note");
    await user.click(screen.getByRole("checkbox", { name: /Internal note/ }));
    await user.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("Staff only note")).toBeInTheDocument();
    const commentRequest = fetchMock.mock.calls.find(([, init]) => init?.method === "POST");
    expect(JSON.parse(String(commentRequest?.[1]?.body))).toEqual({ body: "Staff only note", isInternal: true });

    await user.selectOptions(screen.getByLabelText("Update status"), "resolved");
    await user.click(screen.getByRole("button", { name: "Update status" }));
    expect(await screen.findByText("Resolved", { selector: "span" })).toBeInTheDocument();
    const statusRequest = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
    expect(JSON.parse(String(statusRequest?.[1]?.body))).toEqual({ status: "resolved" });
  });

  it("does not render internal comments or controls for customers", async () => {
    renderDetail("customer");

    expect(await screen.findByText("First update")).toBeInTheDocument();
    expect(screen.queryByText("Second update")).not.toBeInTheDocument();
    expect(screen.queryByText("Internal note")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Internal note/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Update status")).not.toBeInTheDocument();
    expect(screen.queryByText("agent-3")).not.toBeInTheDocument();
    expect(screen.queryByText("customer-7")).not.toBeInTheDocument();
    expect(screen.getByText("Support team")).toBeInTheDocument();
    expect(screen.getByText("Support")).toBeInTheDocument();
  });

  it("shows an empty state when no comments exist", async () => {
    currentComments = [];
    renderDetail("agent");
    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
  });

  it("announces an empty comment and associates its validation message with the field", async () => {
    const user = userEvent.setup();
    renderDetail("customer");
    await screen.findByRole("heading", { name: ticket.title });

    const message = screen.getByRole("textbox", { name: "Message" });
    await user.click(screen.getByRole("button", { name: "Post comment" }));

    expect(message).toHaveAttribute("aria-invalid", "true");
    expect(message.getAttribute("aria-describedby")).toContain("comment-body-error");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a message before submitting.");
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("shows an error when adding a comment is rejected", async () => {
    const user = userEvent.setup();
    const fetch = fetchMock.getMockImplementation();
    if (!fetch) throw new Error("Missing test fetch implementation.");
    fetchMock.mockImplementation(async (input, init) => {
      if (new URL(String(input)).pathname.endsWith("/comments") && init?.method === "POST") {
        return new Response(JSON.stringify({
          data: null,
          error: { message: "Comment rejected" },
          meta: null
        }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      return fetch(input, init);
    });

    renderDetail("agent");
    await screen.findByRole("heading", { name: ticket.title });
    await user.type(screen.getByRole("textbox", { name: "Message" }), "Please add this");
    await user.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Comment rejected");
  });

  it("shows an error when a status update is rejected", async () => {
    const user = userEvent.setup();
    const fetch = fetchMock.getMockImplementation();
    if (!fetch) throw new Error("Missing test fetch implementation.");
    fetchMock.mockImplementation(async (input, init) => {
      if (new URL(String(input)).pathname === "/tickets/ticket-42" && init?.method === "PATCH") {
        return new Response(JSON.stringify({
          data: null,
          error: { message: "Forbidden" },
          meta: null
        }), { status: 403, headers: { "Content-Type": "application/json" } });
      }
      return fetch(input, init);
    });

    renderDetail("agent");
    await screen.findByRole("heading", { name: ticket.title });
    await user.selectOptions(screen.getByLabelText("Update status"), "closed");
    await user.click(screen.getByRole("button", { name: "Update status" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
  });

  it("shows ticket loading state while the request is pending", () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    renderDetail();
    expect(screen.getByRole("status")).toHaveTextContent("Loading ticket");
  });

  it.each([
    [404, "Ticket not found or you do not have access"],
    [403, "You do not have permission to view this ticket"],
    [500, "Ticket service unavailable"]
  ])("shows an appropriate detail error for HTTP %s", async (status, message) => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({
      data: null,
      error: { message: status === 500 ? "Ticket service unavailable" : status === 403 ? "Forbidden" : "Ticket not found" },
      meta: null
    }), {
      status,
      headers: { "Content-Type": "application/json" }
    }));
    renderDetail();
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
  });

  it("shows a clear message when the ticket request has a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    renderDetail();
    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to reach the SupportDesk API");
  });
});
