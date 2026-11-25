import { afterEach, describe, expect, it, vi } from "vitest";

const originalJwtSecret = process.env.JWT_SECRET;
const originalCorsOrigins = process.env.CORS_ORIGINS;
const originalAiEnvironment = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_API_MODE: process.env.GEMINI_API_MODE,
  GEMINI_MODEL: process.env.GEMINI_MODEL,
  GEMINI_INPUT_COST_PER_1M: process.env.GEMINI_INPUT_COST_PER_1M,
  GEMINI_OUTPUT_COST_PER_1M: process.env.GEMINI_OUTPUT_COST_PER_1M
};

afterEach(() => {
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
  if (originalCorsOrigins === undefined) {
    delete process.env.CORS_ORIGINS;
  } else {
    process.env.CORS_ORIGINS = originalCorsOrigins;
  }
  for (const [key, value] of Object.entries(originalAiEnvironment)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("environment security configuration", () => {
  it("rejects wildcard CORS origins", async () => {
    process.env.CORS_ORIGINS = "*";
    vi.resetModules();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(import("../src/config/env.js")).rejects.toThrow(
      "Environment validation failed"
    );
    expect(JSON.stringify(errorLog.mock.calls)).toContain("CORS_ORIGINS");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("\"*\"");
  });

  it("rejects JWT secrets shorter than 32 characters", async () => {
    process.env.JWT_SECRET = "too-short";
    vi.resetModules();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(import("../src/config/env.js")).rejects.toThrow(
      "Environment validation failed"
    );
    expect(JSON.stringify(errorLog.mock.calls)).toContain("JWT_SECRET");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("too-short");
  });

  it("rejects the example JWT placeholder even though it is long enough", async () => {
    process.env.JWT_SECRET = "replace-with-at-least-32-random-characters";
    vi.resetModules();
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(import("../src/config/env.js")).rejects.toThrow(
      "Environment validation failed"
    );
    expect(JSON.stringify(errorLog.mock.calls)).toContain("JWT_SECRET");
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("replace-with");
  });

  it("allows unrelated API routes to start without Gemini configuration", async () => {
    process.env.GEMINI_API_KEY = "";
    process.env.GEMINI_API_MODE = "";
    process.env.GEMINI_MODEL = "";
    process.env.GEMINI_INPUT_COST_PER_1M = "";
    process.env.GEMINI_OUTPUT_COST_PER_1M = "";
    vi.resetModules();

    const { env } = await import("../src/config/env.js");

    expect(env.GEMINI_API_KEY).toBeUndefined();
    expect(env.GEMINI_API_MODE).toBe("developer");
    expect(env.GEMINI_MODEL).toBe("gemini-3.8-flash");
    expect(env.GEMINI_INPUT_COST_PER_1M).toBeUndefined();
    expect(env.GEMINI_OUTPUT_COST_PER_1M).toBeUndefined();
  });

  it("rejects unsupported Gemini API modes without logging credentials", async () => {
    process.env.GEMINI_API_KEY = "AQAB8unit-test-secret";
    process.env.GEMINI_API_MODE = "unsupported";
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.resetModules();

    await expect(import("../src/config/env.js")).rejects.toThrow("Environment validation failed");

    expect(warning).not.toHaveBeenCalled();
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain("AQAB8unit-test-secret");
  });
});
