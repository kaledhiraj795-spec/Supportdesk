import { env } from "../config/env";
import type { AiProviderErrorDetails } from "./provider-error";

export type AiFeature = "suggest_reply" | "categorise_ticket";

export type ProviderTokenUsage = {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
};

export type AiPricing = {
  inputCostPer1M?: number;
  outputCostPer1M?: number;
};

export type AiDiagnostic =
  | "empty_context"
  | "provider_request_failed"
  | "stream_interrupted"
  | "empty_response"
  | "invalid_json"
  | "validation_failed"
  | "unsafe_output";

const isValidUsage = (usage: ProviderTokenUsage) =>
  [usage.promptTokenCount, usage.candidatesTokenCount, usage.totalTokenCount]
    .every((value) => Number.isSafeInteger(value) && value >= 0);

export function calculateEstimatedCost(
  usage: ProviderTokenUsage,
  pricing: AiPricing
): number | undefined {
  if (
    pricing.inputCostPer1M === undefined ||
    pricing.outputCostPer1M === undefined ||
    !isValidUsage(usage)
  ) {
    return undefined;
  }
  const cost = (
    usage.promptTokenCount * pricing.inputCostPer1M +
    usage.candidatesTokenCount * pricing.outputCostPer1M
  ) / 1_000_000;
  return Number.isFinite(cost) ? Number(cost.toFixed(8)) : undefined;
}

export function logAiUsage(
  event: {
    feature: AiFeature;
    model: string;
    promptVersion: string;
    usage: ProviderTokenUsage;
  },
  pricing: AiPricing = {
    inputCostPer1M: env.GEMINI_INPUT_COST_PER_1M,
    outputCostPer1M: env.GEMINI_OUTPUT_COST_PER_1M
  }
): void {
  if (!isValidUsage(event.usage)) return;
  const estimatedCostUsd = calculateEstimatedCost(event.usage, pricing);
  console.info("AI usage", {
    feature: event.feature,
    model: event.model,
    promptVersion: event.promptVersion,
    ...event.usage,
    ...(estimatedCostUsd === undefined ? {} : { estimatedCostUsd })
  });
}

export function logAiDiagnostic(
  feature: AiFeature,
  promptVersion: string,
  diagnostic: AiDiagnostic,
  providerError?: AiProviderErrorDetails
): void {
  console.warn("AI feature request failed", {
    feature,
    promptVersion,
    diagnostic,
    ...(providerError?.upstreamStatusCode === undefined
      ? {}
      : { upstreamStatusCode: providerError.upstreamStatusCode }),
    ...(providerError?.upstreamReason === undefined
      ? {}
      : { upstreamReason: providerError.upstreamReason })
  });
}
