import { apiRequest, ApiError } from "../../../lib/api-client";
import { isAuthSession, saveSession, type AuthSession } from "../../../lib/auth";

export type LoginCredentials = {
  email: string;
  password: string;
};

export const login = async (credentials: LoginCredentials): Promise<AuthSession> => {
  const session = await apiRequest<unknown>("/auth/login", {
    method: "POST",
    body: JSON.stringify(credentials),
    auth: false
  });
  if (!isAuthSession(session)) {
    throw new ApiError("The API returned invalid login data.", 200);
  }
  saveSession(session);
  return session;
};
