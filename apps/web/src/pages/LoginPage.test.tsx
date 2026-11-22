import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSession, type AuthSession } from "../lib/auth";
import { LoginPage } from "./LoginPage";

const session: AuthSession = {
  token: "fresh-token",
  user: {
    id: "user-1",
    name: "A Customer",
    email: "customer@example.com",
    role: "customer",
    createdAt: "2026-01-01T00:00:00.000Z"
  }
};

const fetchMock = vi.fn<typeof fetch>();
const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });

const renderLogin = () => render(
  <MemoryRouter initialEntries={["/login"]}>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/tickets" element={<p>Tickets workspace</p>} />
    </Routes>
  </MemoryRouter>
);

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

describe("LoginPage", () => {
  it("validates fields and submits real credentials to the login endpoint", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue(jsonResponse({ data: session, error: null, meta: null }));
    renderLogin();

    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText("Email address"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByText("Tickets workspace")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3000/auth/login",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "customer@example.com", password: "correct-password" })
      })
    );
    expect(getSession()).toEqual(session);
  });

  it("shows invalid-credentials and network errors accessibly", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText("Email address"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    fetchMock.mockResolvedValue(jsonResponse({
      data: null,
      error: { message: "Invalid email or password" },
      meta: null
    }, 401));
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(getSession()).toBeNull();

    fetchMock.mockRejectedValue(new TypeError("network detail"));
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "correct-password" } });
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Unable to reach the SupportDesk API."));
    expect(screen.getByRole("alert")).not.toHaveTextContent("network detail");

    fetchMock.mockResolvedValue(jsonResponse({
      data: null,
      error: { message: "Service temporarily unavailable" },
      meta: null
    }, 500));
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Service temporarily unavailable"));
  });

  it("locks the form while login is in flight", async () => {
    const user = userEvent.setup();
    let resolveResponse: (response: Response) => void = () => undefined;
    fetchMock.mockReturnValue(new Promise((resolve) => {
      resolveResponse = resolve;
    }));
    renderLogin();
    await user.type(screen.getByLabelText("Email address"), "customer@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    resolveResponse(jsonResponse({ data: session, error: null, meta: null }));
    expect(await screen.findByText("Tickets workspace")).toBeInTheDocument();
  });

  it("toggles password visibility with an accessible control", async () => {
    const user = userEvent.setup();
    renderLogin();

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(password).toHaveAttribute("type", "password");
  });
});
