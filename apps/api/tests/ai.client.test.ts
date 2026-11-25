import { afterEach, describe, expect, it, vi } from "vitest";

const mockGoogleGenAI = vi.hoisted(() => vi.fn());

vi.mock("@google/genai", () => ({ GoogleGenAI: mockGoogleGenAI }));

const originalApiKey = process.env.GEMINI_API_KEY;
const originalApiMode = process.env.GEMINI_API_MODE;

afterEach(() => {
  if (originalApiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalApiKey;
  }
  if (originalApiMode === undefined) {
    delete process.env.GEMINI_API_MODE;
  } else {
    process.env.GEMINI_API_MODE = originalApiMode;
  }
  mockGoogleGenAI.mockReset();
  vi.resetModules();
});

describe("lazy Gemini client", () => {
  it("does not construct an SDK client when the key is unset", async () => {
    process.env.GEMINI_API_KEY = "";
    vi.resetModules();
    const { getGeminiClient } = await import("../src/ai/client.js");

    expect(() => getGeminiClient()).toThrow("AI features are not configured.");
    expect(mockGoogleGenAI).not.toHaveBeenCalled();
  });

  it.each(["AIzaSyunit-test-key", "AQAB8unit-test-key"])(
    "uses Gemini Developer API mode for an opaque API key",
    async (apiKey) => {
      process.env.GEMINI_API_KEY = apiKey;
      process.env.GEMINI_API_MODE = "";
      vi.resetModules();
      const { getGeminiClient } = await import("../src/ai/client.js");

      const first = getGeminiClient();
      const second = getGeminiClient();

      expect(first).toBe(second);
      expect(mockGoogleGenAI).toHaveBeenCalledTimes(1);
      expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey });
    }
  );

  it("uses Vertex Express mode only when explicitly configured", async () => {
    process.env.GEMINI_API_KEY = "AQAB8vertex-test-key";
    process.env.GEMINI_API_MODE = "vertex";
    vi.resetModules();
    const { getGeminiClient } = await import("../src/ai/client.js");

    getGeminiClient();

    expect(mockGoogleGenAI).toHaveBeenCalledWith({
      vertexai: true,
      apiKey: "AQAB8vertex-test-key"
    });
  });
});
