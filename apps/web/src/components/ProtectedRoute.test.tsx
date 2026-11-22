import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ProtectedRoute } from "./ProtectedRoute";
import { saveSession, type AuthSession } from "../lib/auth";

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

const renderRoutes = (initialPath: string) => render(
  <MemoryRouter initialEntries={[initialPath]}>
    <Routes>
      <Route path="/login" element={
        <ProtectedRoute redirectAuthenticated><p>Login page</p></ProtectedRoute>
      } />
      <Route path="/tickets" element={
        <ProtectedRoute><p>Protected tickets</p></ProtectedRoute>
      } />
    </Routes>
  </MemoryRouter>
);

afterEach(() => sessionStorage.clear());

describe("ProtectedRoute", () => {
  it("redirects unauthenticated users to login", async () => {
    renderRoutes("/tickets");
    expect(await screen.findByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Protected tickets")).not.toBeInTheDocument();
  });

  it("redirects authenticated users away from login", async () => {
    saveSession(session);
    renderRoutes("/login");
    expect(await screen.findByText("Protected tickets")).toBeInTheDocument();
    expect(screen.queryByText("Login page")).not.toBeInTheDocument();
  });
});
