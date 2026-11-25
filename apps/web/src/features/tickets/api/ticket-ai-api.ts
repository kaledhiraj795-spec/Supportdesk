import { ApiError, apiRequest } from "../../../lib/api-client";
import { getToken } from "../../../lib/auth";
import type { TicketPriority } from "./tickets-api";

export type TicketAiSuggestion = {
  category: string;
  priority: TicketPriority;
  promptVersion: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const readApiErrorMessage = (payload: unknown, fallback: string) => {
  if (
    isRecord(payload) &&
    isRecord(payload.error) &&
    typeof payload.error.message === "string"
  ) {
    return payload.error.message;
  }
  return fallback;
};

const apiBaseUrl = () => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "");
  if (!baseUrl) throw new ApiError("The API base URL is not configured.", 0);
  return baseUrl;
};

export async function suggestTicketCategoryAndPriority(
  ticketId: string
): Promise<TicketAiSuggestion> {
  return apiRequest<TicketAiSuggestion>(
    `/tickets/${encodeURIComponent(ticketId)}/ai/categorise`,
    { method: "POST" }
  );
}

export async function streamTicketReplyDraft(
  ticketId: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const token = getToken();
  if (!token) throw new ApiError("Authentication is required.", 401);

  let response: Response;
  try {
    response = await fetch(
      `${apiBaseUrl()}/tickets/${encodeURIComponent(ticketId)}/ai/suggest-reply`,
      {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${token}`
        },
        signal
      }
    );
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError("Unable to reach the SupportDesk API. Check your connection and try again.", 0);
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text();
    let payload: unknown;
    try {
      payload = text.trim() ? JSON.parse(text) : null;
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
    }
    throw new ApiError(
      readApiErrorMessage(payload, response.statusText || "AI reply could not be generated."),
      response.status
    );
  }
  if (!response.body) {
    throw new ApiError("The AI reply stream is unavailable.", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  const processFrame = (frame: string) => {
    let eventName = "message";
    const dataLines: string[] = [];
    for (const line of frame.split(/\r?\n/)) {
      if (!line || line.startsWith(":")) continue;
      const separator = line.indexOf(":");
      const field = separator < 0 ? line : line.slice(0, separator);
      const value = separator < 0 ? "" : line.slice(separator + 1).replace(/^ /, "");
      if (field === "event") eventName = value;
      if (field === "data") dataLines.push(value);
    }
    if (dataLines.length === 0) return;

    let payload: unknown;
    try {
      payload = JSON.parse(dataLines.join("\n"));
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      throw new ApiError("The AI reply stream contained invalid data.", response.status);
    }

    if (eventName === "delta") {
      if (!isRecord(payload) || typeof payload.text !== "string") {
        throw new ApiError("The AI reply stream contained invalid data.", response.status);
      }
      onChunk(payload.text);
    } else if (eventName === "error") {
      throw new ApiError(
        readApiErrorMessage({ error: payload }, "AI reply generation was interrupted."),
        502
      );
    } else if (eventName === "done") {
      completed = true;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      frames.forEach(processFrame);
      if (done) break;
    }
    if (buffer.trim()) processFrame(buffer);
  } finally {
    reader.releaseLock();
  }

  if (!completed) {
    throw new ApiError("The AI reply stream ended unexpectedly.", 502);
  }
}
