import { afterEach, describe, expect, it, vi } from "vitest";

const originalJwtSecret = process.env.JWT_SECRET;
const originalCorsOrigins = process.env.CORS_ORIGINS;

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
});
