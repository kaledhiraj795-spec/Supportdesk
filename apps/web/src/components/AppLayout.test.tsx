import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { AppLayout } from "./AppLayout";
import { saveSession, type AuthSession, type UserRole } from "../lib/auth";

const sessionFor = (role: UserRole): AuthSession => ({
  token: "test-token",
  user: {
    id: "user-1",
    name: "Alex Support",
    email: "alex@example.com",
    role,
    createdAt: "2026-01-01T00:00:00.000Z"
  }
});

const renderLayout = (role: UserRole) => {
  saveSession(sessionFor(role));
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<p>Dashboard content</p>} />
          <Route path="/tickets" element={<p>Tickets content</p>} />
        </Route>
        <Route path="/login" element={<p>Login page</p>} />
      </Routes>
    </MemoryRouter>
  );
};

afterEach(() => sessionStorage.clear());

describe("AppLayout", () => {
  it.each([
    ["customer", "My Tickets", "Customer"],
    ["agent", "All Tickets", "Agent"],
    ["admin", "All Tickets", "Admin"]
  ] as const)("shows role-aware navigation and identity for %s", (role, ticketLabel, roleLabel) => {
    renderLayout(role);
    expect(screen.getByText("Support workspace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: ticketLabel })).toHaveAttribute("href", "/tickets");
    expect(screen.getAllByText(roleLabel)).toHaveLength(2);
    expect(screen.getAllByText("Alex Support")).toHaveLength(2);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Dashboard");
  });

  it("shows a Tickets breadcrumb and signs out to login", () => {
    saveSession(sessionFor("agent"));
    render(
      <MemoryRouter initialEntries={["/tickets"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/tickets" element={<p>Tickets content</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Tickets");
    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(sessionStorage.getItem("supportdesk.session")).toBeNull();
  });
});
