import { env } from "../config/env";
import type { GenerateContentResponse } from "@google/genai";
import { getTicketComments } from "../services/comments.service";
import { getTicketById } from "../services/tickets.service";
import type { AuthIdentity } from "../types/auth";
import { ticketAiSuggestionSchema } from "./ai.schemas";
import { getGeminiClient } from "./client";
import { AiFeatureError } from "./errors";
import { getAiProviderErrorDetails } from "./provider-error";
import { AI_SAFETY_SETTINGS } from "./safety";
import {
  buildUserContext as buildCategorisationContext,
  PROMPT_VERSION as CATEGORISE_PROMPT_VERSION,
  SYSTEM_INSTRUCTIONS as CATEGORISE_SYSTEM_INSTRUCTIONS
} from "./prompts/auto-categorise.v1";
import {
  buildUserContext as buildReplyContext,
  PROMPT_VERSION as REPLY_PROMPT_VERSION,
  SYSTEM_INSTRUCTIONS as REPLY_SYSTEM_INSTRUCTIONS
} from "./prompts/suggest-reply.v1";
import {
  logAiDiagnostic,
  logAiUsage,
  type AiFeature,
  type AiDiagnostic,
  type ProviderTokenUsage
} from "./usage-logger";
import {
  containsUnsafeSecrets,
  maskSensitiveText,
  truncateText
} from "./guardrails";

const isStaff = (identity: AuthIdentity) =>
  identity.role === "agent" || identity.role === "admin";

const getAuthorizedTicket = async (ticketId: string, identity: AuthIdentity) => {
  if (!isStaff(identity)) {
    throw new AiFeatureError("Staff access is required for AI features.", 403);
  }
  const ticket = await getTicketById(ticketId, identity);
  if (!ticket) {
    throw new AiFeatureError("Ticket not found.", 404);
  }
  return ticket;
};

const hasReplyContext = (
  ticket: { title: string; description: string },
  comments: readonly { body: string }[]
) =>
  [ticket.title, ticket.description, ...comments.map((comment) => comment.body)]
    .some((value) => value.trim().length > 0);

const usageFromMetadata = (
  usage: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  } | undefined
): ProviderTokenUsage | undefined => {
  if (
    !usage ||
    usage.promptTokenCount === undefined ||
    usage.candidatesTokenCount === undefined ||
    usage.totalTokenCount === undefined
  ) {
    return undefined;
  }
  return {
    promptTokenCount: usage.promptTokenCount,
    candidatesTokenCount: usage.candidatesTokenCount,
    totalTokenCount: usage.totalTokenCount
  };
};

const logProviderFailure = (
  feature: AiFeature,
  promptVersion: string,
  diagnostic: AiDiagnostic,
  error?: unknown
) => logAiDiagnostic(
  feature,
  promptVersion,
  diagnostic,
  error === undefined ? undefined : getAiProviderErrorDetails(error)
);

const isProviderTimeout = (error: unknown): boolean =>
  error instanceof Error &&
  (/timeout/i.test(error.name) || /timed?\s*out|timeout/i.test(error.message));

const providerRequestError = (error: unknown, feature: AiFeature, promptVersion: string) => {
  const timedOut = isProviderTimeout(error);
  logProviderFailure(
    feature,
    promptVersion,
    timedOut ? "provider_timeout" : "provider_request_failed",
    error
  );
  return timedOut
    ? new AiFeatureError("AI provider request timed out.", 504)
    : new AiFeatureError("AI provider request failed.", 502);
};

export async function prepareSuggestReplyForTicket(
  ticketId: string,
  identity: AuthIdentity
): Promise<AsyncIterable<string>> {
  const ticket = await getAuthorizedTicket(ticketId, identity);
  const comments = await getTicketComments(ticketId, identity);
  if (!comments) {
    throw new AiFeatureError("Ticket not found.", 404);
  }
  const publicComments = comments.filter((comment) => !comment.isInternal);
  if (!hasReplyContext(ticket, publicComments)) {
    logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "empty_context");
    throw new AiFeatureError("Ticket details are not sufficient for an AI draft.", 422);
  }

  const client = getGeminiClient();
  let stream: AsyncIterable<GenerateContentResponse>;
  try {
    stream = await client.models.generateContentStream({
      model: env.GEMINI_MODEL,
      contents: buildReplyContext(ticket, publicComments),
      config: {
        systemInstruction: REPLY_SYSTEM_INSTRUCTIONS,
        safetySettings: AI_SAFETY_SETTINGS
      }
    });
  } catch (error) {
    throw providerRequestError(error, "suggest_reply", REPLY_PROMPT_VERSION);
  }

  return (async function* () {
    let providerUsage: ProviderTokenUsage | undefined;
    let draft = "";
    try {
      for await (const chunk of stream) {
        providerUsage = usageFromMetadata(chunk.usageMetadata) ?? providerUsage;
        const text = chunk.text;
        if (typeof text === "string" && text.length > 0) {
          draft += text;
        }
      }
    } catch (error) {
      if (isProviderTimeout(error)) {
        logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "provider_timeout", error);
        throw new AiFeatureError("AI provider request timed out.", 504);
      }
      logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "stream_interrupted", error);
      throw new AiFeatureError("AI reply generation was interrupted.", 502);
    }

    if (!draft.trim()) {
      logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "empty_response");
      throw new AiFeatureError("AI provider returned an empty reply.", 502);
    }
    if (draft.length > env.AI_REPLY_OUTPUT_MAX_LENGTH) {
      draft = truncateText(draft, env.AI_REPLY_OUTPUT_MAX_LENGTH);
    }
    if (containsUnsafeSecrets(draft)) {
      logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "unsafe_output");
      throw new AiFeatureError("AI returned an unsupported reply.", 502);
    }
    const safeDraft = maskSensitiveText(draft);
    if (!safeDraft.trim()) {
      throw new AiFeatureError("AI returned an unsupported reply.", 502);
    }
    yield safeDraft;
    if (providerUsage) {
      logAiUsage({
        feature: "suggest_reply",
        model: env.GEMINI_MODEL,
        promptVersion: REPLY_PROMPT_VERSION,
        usage: providerUsage
      });
    }
  })();
}

export async function suggestCategoryAndPriorityForTicket(
  ticketId: string,
  identity: AuthIdentity
) {
  const ticket = await getAuthorizedTicket(ticketId, identity);
  if (!hasReplyContext(ticket, [])) {
    logProviderFailure("categorise_ticket", CATEGORISE_PROMPT_VERSION, "empty_context");
    throw new AiFeatureError("Ticket details are not sufficient for categorisation.", 422);
  }

  const client = getGeminiClient();
  let response;
  try {
    response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: buildCategorisationContext(ticket),
      config: {
        systemInstruction: CATEGORISE_SYSTEM_INSTRUCTIONS,
        responseMimeType: "application/json",
        temperature: 0,
        safetySettings: AI_SAFETY_SETTINGS
      }
    });
  } catch (error) {
    throw providerRequestError(error, "categorise_ticket", CATEGORISE_PROMPT_VERSION);
  }

  const providerUsage = usageFromMetadata(response.usageMetadata);
  if (providerUsage) {
    logAiUsage({
      feature: "categorise_ticket",
      model: env.GEMINI_MODEL,
      promptVersion: CATEGORISE_PROMPT_VERSION,
      usage: providerUsage
    });
  }

  const content = response.text;
  let parsed: unknown;
  try {
    if (typeof content !== "string" || !content.trim()) {
      throw new SyntaxError("Missing JSON content");
    }
    parsed = JSON.parse(content);
  } catch {
    logProviderFailure("categorise_ticket", CATEGORISE_PROMPT_VERSION, "invalid_json");
    throw new AiFeatureError("AI returned an invalid suggestion.", 502);
  }

  const validation = ticketAiSuggestionSchema.safeParse(parsed);
  if (!validation.success) {
    logProviderFailure("categorise_ticket", CATEGORISE_PROMPT_VERSION, "validation_failed");
    throw new AiFeatureError("AI returned an unsupported suggestion.", 502);
  }

  return {
    ...validation.data,
    promptVersion: CATEGORISE_PROMPT_VERSION
  };
}
