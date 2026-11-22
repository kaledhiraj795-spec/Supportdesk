export type UserRole = "customer" | "agent" | "admin";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

export type AuthSession = {
  token: string;
  user: PublicUser;
};

export const AUTH_CHANGE_EVENT = "supportdesk:auth-change";
const sessionKey = "supportdesk.session";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const isAuthSession = (value: unknown): value is AuthSession => {
  if (!isRecord(value) || typeof value.token !== "string" || !value.token.trim() || !isRecord(value.user)) {
    return false;
  }
  const { id, name, email, role, createdAt } = value.user;
  return typeof id === "string" &&
    typeof name === "string" &&
    typeof email === "string" &&
    (role === "customer" || role === "agent" || role === "admin") &&
    typeof createdAt === "string";
};

const notifyAuthChange = () => window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));

export const getSession = (): AuthSession | null => {
  const stored = sessionStorage.getItem(sessionKey);
  if (!stored) return null;

  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch {
    sessionStorage.removeItem(sessionKey);
    notifyAuthChange();
    return null;
  }

  if (!isAuthSession(value)) {
    sessionStorage.removeItem(sessionKey);
    notifyAuthChange();
    return null;
  }
  return value;
};

export const getToken = (): string | null => getSession()?.token ?? null;

export const saveSession = (session: AuthSession) => {
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  notifyAuthChange();
};

export const clearSession = () => {
  if (sessionStorage.getItem(sessionKey) === null) return;
  sessionStorage.removeItem(sessionKey);
  notifyAuthChange();
};
