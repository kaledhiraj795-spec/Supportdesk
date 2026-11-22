import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AUTH_CHANGE_EVENT, getSession, type AuthSession } from "../lib/auth";

type ProtectedRouteProps = {
  children: ReactNode;
  redirectAuthenticated?: boolean;
};

export function ProtectedRoute({ children, redirectAuthenticated = false }: ProtectedRouteProps) {
  const [session, setSession] = useState<AuthSession | null>(getSession);
  const location = useLocation();

  useEffect(() => {
    const refresh = () => setSession(getSession());
    window.addEventListener(AUTH_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, refresh);
  }, []);

  if (redirectAuthenticated && session) return <Navigate to="/tickets" replace />;
  if (!redirectAuthenticated && !session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
