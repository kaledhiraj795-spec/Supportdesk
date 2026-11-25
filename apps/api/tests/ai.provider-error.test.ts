import { describe, expect, it } from "vitest";
import { getAiProviderErrorDetails } from "../src/ai/provider-error";

describe("Gemini provider error diagnostics", () => {
  it.each([
    [400, "API_KEY_INVALID"],
    [403, "SERVICE_DISABLED"],
    [404, "NOT_FOUND"],
    [429, "RESOURCE_EXHAUSTED"]
  ])("extracts safe upstream status and reason for %s %s", (status, reason) => {
    expect(getAiProviderErrorDetails({
      message: JSON.stringify({
        error: {
          status: "PERMISSION_DENIED",
          details: [{ reason }]
        }
      }),
      status,
    })).toEqual({
      upstreamStatusCode: status,
      upstreamReason: reason
    });
  });

  it("omits unrecognized provider text from diagnostics", () => {
    expect(getAiProviderErrorDetails({
      message: "AQ.test-secret",
      status: 401,
      error: { reason: "custom message with AQ.test-secret" }
    })).toEqual({ upstreamStatusCode: 401 });
  });
});
