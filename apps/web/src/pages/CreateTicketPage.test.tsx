import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { CreateTicketPage } from "./CreateTicketPage";
import { saveSession, type AuthSession, type UserRole } from "../lib/auth";

const sessionFor = (role: UserRole): AuthSession => ({
  token: "test-token",
  user: {
    id: "customer-7",
    name: "Test Customer",
    email: "customer@example.com",
    role,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
});

const fetchMock = vi.fn<typeof fetch>();
const jsonResponse = (data: unknown, status = 200, error: unknown = null) =>
  new Response(JSON.stringify({ data, error, meta: null }), {
    status,
    headers: { "Content-Type": "application/json" }
  });

const renderCreateTicket = (role: UserRole = "customer") => {
  const session = sessionFor(role);
  saveSession(session);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/tickets/new"]}>
        <Routes>
          <Route path="/tickets/new" element={<CreateTicketPage />} />
          <Route path="/tickets/:id" element={<h1>Created ticket detail</h1>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
  return { queryClient, invalidateSpy };
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

describe("CreateTicketPage", () => {
  it("submits valid API-schema fields, invalidates ticket caches, and navigates to the new ticket", async () => {
    const user = userEvent.setup();
    const createdTicket = {
      id: "ticket-created",
      title: "Cannot sign in",
      description: "Login is unavailable.",
      category: "Account",
      priority: "P1",
      status: "open",
      creatorId: "customer-7",
      createdAt: "2026-03-01T10:00:00.000Z",
      updatedAt: "2026-03-01T10:00:00.000Z"
    };
    fetchMock.mockResolvedValue(jsonResponse(createdTicket, 201));
    const { invalidateSpy } = renderCreateTicket();

    await user.type(screen.getByRole("textbox", { name: "Title" }), "Cannot sign in");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Login is unavailable.");
    await user.type(screen.getByRole("textbox", { name: "Category" }), "Account");
    await user.selectOptions(screen.getByLabelText("Priority"), "P1");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByRole("heading", { name: "Created ticket detail" })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("http://localhost:3000/tickets");
    expect(options?.method).toBe("POST");
    expect(JSON.parse(String(options?.body))).toEqual({
      title: "Cannot sign in",
      description: "Login is unavailable.",
      category: "Account",
      priority: "P1"
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["tickets"] });
  });

  it("only exposes optional staff fields and submits them in the API schema shape", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({
      id: "staff-created",
      title: "Assigned request",
      description: "Needs an owner",
      category: "Account",
      priority: "P2",
      status: "resolved",
      creatorId: "agent-3",
      assigneeId: "11111111-1111-4111-8111-111111111111",
      slaDueAt: "2026-03-04T10:00:00.000Z",
      createdAt: "2026-03-01T10:00:00.000Z"
    }, 201));
    renderCreateTicket("agent");

    expect(screen.getByLabelText(/Assignee ID/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Initial status/)).toBeInTheDocument();
    expect(screen.getByLabelText(/SLA due at/)).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Title" }), "Assigned request");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Needs an owner");
    await user.type(screen.getByRole("textbox", { name: "Category" }), "Account");
    await user.selectOptions(screen.getByLabelText("Priority"), "P2");
    await user.type(screen.getByLabelText(/Assignee ID/), "11111111-1111-4111-8111-111111111111");
    await user.selectOptions(screen.getByLabelText(/Initial status/), "resolved");
    await user.type(screen.getByLabelText(/SLA due at/), "2026-03-04T10:00:00.000Z");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByRole("heading", { name: "Created ticket detail" })).toBeInTheDocument();
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      title: "Assigned request",
      description: "Needs an owner",
      category: "Account",
      priority: "P2",
      assigneeId: "11111111-1111-4111-8111-111111111111",
      status: "resolved",
      slaDueAt: "2026-03-04T10:00:00.000Z"
    });
  });

  it("shows field validation errors without sending invalid input", async () => {
    const user = userEvent.setup();
    renderCreateTicket();
    expect(screen.queryByLabelText(/Assignee ID/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findAllByText(/expected string to have/)).toHaveLength(3);
    expect(screen.getAllByRole("alert")).toHaveLength(4);
    const title = screen.getByRole("textbox", { name: "Title" });
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "create-ticket-title-field-error");
    expect(document.getElementById("create-ticket-title-field-error")).toHaveTextContent(/expected string to have/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a safe backend error and leaves the form available after API failure", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse(null, 403, { message: "Forbidden" }));
    renderCreateTicket();

    await user.type(screen.getByRole("textbox", { name: "Title" }), "Cannot sign in");
    await user.type(screen.getByRole("textbox", { name: "Description" }), "Login is unavailable.");
    await user.type(screen.getByRole("textbox", { name: "Category" }), "Account");
    await user.selectOptions(screen.getByLabelText("Priority"), "P1");
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Forbidden");
    expect(screen.getByRole("button", { name: "Create ticket" })).toBeEnabled();
  });
});
