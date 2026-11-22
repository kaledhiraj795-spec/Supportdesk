import { clearSession, getToken } from "./auth";

export type ApiEnvelope<T> = {
  data: T;
  error: null | {
    message: string;
    details?: unknown;
  };
  meta: unknown;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  auth?: boolean;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isEnvelope = (value: unknown): value is ApiEnvelope<unknown> =>
  isRecord(value) && "data" in value && "error" in value && "meta" in value;

const errorFrom = (value: unknown, fallback: string) => {
  if (!isEnvelope(value) || !isRecord(value.error) || typeof value.error.message !== "string") {
    return { message: fallback, details: undefined };
  }
  return { message: value.error.message, details: value.error.details };
};

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) {
    throw new ApiError("The API base URL is not configured.", 0);
  }

  const { auth = true, ...init } = options;
  const token = auth ? getToken() : null;
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && init.body !== null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/${path.replace(/^\/+/, "")}`, {
      ...init,
      headers
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError("Unable to reach the SupportDesk API. Check your connection and try again.", 0);
    }
    throw error;
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text.trim()) {
    try {
      payload = JSON.parse(text);
    } catch (error) {
      if (response.ok) {
        throw new ApiError("The API returned an unreadable response.", response.status);
      }
      if (!(error instanceof SyntaxError)) throw error;
    }
  }

  if (!response.ok) {
    const apiError = errorFrom(payload, response.statusText || "The request failed.");
    if (response.status === 401 && token) clearSession();
    throw new ApiError(apiError.message, response.status, apiError.details);
  }
  if (!isEnvelope(payload)) {
    throw new ApiError("The API returned an invalid response envelope.", response.status);
  }
  return payload.data as T;
}
