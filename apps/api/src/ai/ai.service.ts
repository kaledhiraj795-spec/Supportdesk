import { env } from "../config/env";
import type { GenerateContentResponse } from "@google/genai";
import { getTicketComments } from "../services/comments.service";
import { getTicketById } from "../services/tickets.service";
import type { AuthIdentity } from "../types/auth";
import { ticketAiSuggestionSchema } from "./ai.schemas";
import { getGeminiClient } from "./client";
import { AiFeatureError } from "./errors";
import { getAiProviderErrorDetails } from "./provider-error";
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
      config: { systemInstruction: REPLY_SYSTEM_INSTRUCTIONS }
    });
  } catch (error) {
    logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "provider_request_failed", error);
    throw new AiFeatureError("AI provider request failed.", 502);
  }

  return (async function* () {
    let providerUsage: ProviderTokenUsage | undefined;
    let hasText = false;
    try {
      for await (const chunk of stream) {
        providerUsage = usageFromMetadata(chunk.usageMetadata) ?? providerUsage;
        const text = chunk.text;
        if (typeof text === "string" && text.length > 0) {
          hasText = true;
          yield text;
        }
      }
    } catch (error) {
      logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "stream_interrupted", error);
      throw new AiFeatureError("AI reply generation was interrupted.", 502);
    }

    if (!hasText) {
      logProviderFailure("suggest_reply", REPLY_PROMPT_VERSION, "empty_response");
      throw new AiFeatureError("AI provider returned an empty reply.", 502);
    }
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
        temperature: 0
      }
    });
  } catch (error) {
    logProviderFailure("categorise_ticket", CATEGORISE_PROMPT_VERSION, "provider_request_failed", error);
    throw new AiFeatureError("AI provider request failed.", 502);
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
