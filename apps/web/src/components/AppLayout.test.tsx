import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

const renderLayout = (role: UserRole, initialEntry = "/") => {
  saveSession(sessionFor(role));
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<p>Dashboard content</p>} />
          <Route path="/tickets" element={<p>Tickets content</p>} />
          <Route path="/tickets/new" element={<p>New ticket content</p>} />
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
    expect(screen.getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new");
    expect(screen.getAllByText(roleLabel)).toHaveLength(2);
    expect(screen.getAllByText("Alex Support")).toHaveLength(2);
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Dashboard");

    const overview = screen.getByRole("navigation", { name: "Overview" });
    const quickViews = screen.getByRole("navigation", { name: "Quick views" });
    expect(within(overview).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(within(quickViews).getByRole("link", { name: "Active / Open" })).toHaveAttribute(
      "href",
      "/tickets?status=open&status=in_progress"
    );
    expect(within(quickViews).getByRole("link", { name: "Waiting on Customer" })).toHaveAttribute(
      "href",
      "/tickets?status=waiting_on_customer"
    );
    expect(within(quickViews).getByRole("link", { name: "Resolved" })).toHaveAttribute(
      "href",
      "/tickets?status=resolved"
    );

    const profile = screen.getByRole("region", { name: "User profile" });
    expect(within(profile).getByText("Alex Support")).toBeInTheDocument();
    expect(within(profile).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it.each([
    ["/tickets?status=open&status=in_progress", "Active / Open"],
    ["/tickets?status=waiting_on_customer", "Waiting on Customer"],
    ["/tickets?status=resolved", "Resolved"]
  ])("highlights only the matching quick view at %s", (url, label) => {
    renderLayout("agent", url);

    const quickViews = screen.getByRole("navigation", { name: "Quick views" });
    expect(within(quickViews).getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    expect(within(screen.getByRole("navigation", { name: "Overview" }))
      .getByRole("link", { name: "All Tickets" })).not.toHaveAttribute("aria-current");
  });

  it("shows a Tickets breadcrumb and signs out to login", () => {
    saveSession(sessionFor("agent"));
    render(
      <MemoryRouter initialEntries={["/tickets/ticket-1"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/tickets/:id" element={<p>Ticket content</p>} />
          </Route>
          <Route path="/login" element={<p>Login page</p>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Tickets");
    fireEvent.click(within(screen.getByRole("region", { name: "User profile" }))
      .getByRole("button", { name: "Sign out" }));
    const confirmation = screen.getByRole("dialog", { name: "Sign out?" });
    expect(confirmation).toHaveAttribute("aria-modal", "true");
    fireEvent.click(within(confirmation).getByRole("button", { name: "Sign out" }));
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(sessionStorage.getItem("supportdesk.session")).toBeNull();
  });

  it("opens an accessible mobile navigation drawer and closes it with Escape", async () => {
    const user = userEvent.setup();
    renderLayout("customer");

    const menuButton = screen.getByRole("button", { name: "Open navigation menu" });
    expect(menuButton).toHaveAttribute("aria-expanded", "false");
    expect(menuButton).toHaveAttribute("aria-controls", "mobile-navigation");

    await user.click(menuButton);
    expect(menuButton).toHaveAttribute("aria-expanded", "true");
    const drawer = screen.getByRole("dialog", { name: "Mobile navigation" });
    const overview = within(drawer).getByRole("navigation", { name: "Overview" });
    const quickViews = within(drawer).getByRole("navigation", { name: "Quick views" });
    expect(within(overview).getByRole("link", { name: "Create Ticket" })).toHaveAttribute("href", "/tickets/new");
    expect(within(quickViews).getByRole("link", { name: "Active / Open" })).toHaveAttribute(
      "href",
      "/tickets?status=open&status=in_progress"
    );
    expect(within(quickViews).getByRole("link", { name: "Waiting on Customer" })).toHaveAttribute(
      "href",
      "/tickets?status=waiting_on_customer"
    );
    expect(within(quickViews).getByRole("link", { name: "Resolved" })).toHaveAttribute(
      "href",
      "/tickets?status=resolved"
    );
    expect(within(quickViews).getByRole("link", { name: "Active / Open" })).toHaveClass("min-h-11");
    within(drawer).getAllByRole("link").forEach((link) => expect(link).toHaveClass("min-h-11"));
    expect(within(drawer).getByRole("button", { name: "Sign out" })).toHaveClass("size-11");

    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Open navigation menu" })).toHaveAttribute("aria-expanded", "false");
  });
});
