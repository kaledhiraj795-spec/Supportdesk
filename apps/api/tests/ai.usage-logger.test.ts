import { describe, expect, it, vi } from "vitest";
import { calculateEstimatedCost, logAiUsage } from "../src/ai/usage-logger";

describe("AI usage logging", () => {
  it("calculates cost from provider token counts and configured rates", () => {
    const usage = {
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150
    };
    expect(calculateEstimatedCost(usage, {
      inputCostPer1M: 10,
      outputCostPer1M: 20
    })).toBe(0.002);

    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logAiUsage({
      feature: "categorise_ticket",
      model: "test-model",
      promptVersion: "auto-categorise-v2",
      usage
    }, { inputCostPer1M: 10, outputCostPer1M: 20 });
    expect(log).toHaveBeenCalledWith("AI usage", expect.objectContaining({
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150,
      estimatedCostUsd: 0.002
    }));
    log.mockRestore();
  });

  it("omits estimated cost when pricing is not configured", () => {
    const log = vi.spyOn(console, "info").mockImplementation(() => undefined);
    logAiUsage({
      feature: "suggest_reply",
      model: "test-model",
      promptVersion: "suggest-reply-v2",
      usage: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 }
    }, {});
    expect(log.mock.calls[0][1]).not.toHaveProperty("estimatedCostUsd");
    log.mockRestore();
  });
});
