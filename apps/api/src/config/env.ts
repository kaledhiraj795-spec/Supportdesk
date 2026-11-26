import "dotenv/config";
import { z } from "zod";

const emptyEnvTextAsUndefined = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalEnvText = z.preprocess(
  emptyEnvTextAsUndefined,
  z.string().trim().min(1).optional()
);

const envTextWithDefault = (defaultValue: string) =>
  z.preprocess(
    emptyEnvTextAsUndefined,
    z.string().trim().min(1).default(defaultValue)
  );

const envGeminiApiMode = z.preprocess(
  emptyEnvTextAsUndefined,
  z.enum(["developer", "vertex"]).default("developer")
);

const envPositiveIntWithDefault = (defaultValue: number) =>
  z.preprocess(
    emptyEnvTextAsUndefined,
    z.coerce.number().int().positive().default(defaultValue)
  );

const optionalEnvRate = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  z.coerce.number().finite().min(0).optional()
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string()
    .min(32, "JWT_SECRET must be at least 32 characters")
    .refine(
      (secret) => !/^(replace|placeholder|change-me)/i.test(secret),
      "JWT_SECRET must be replaced with a generated secret"
    ),
  JWT_EXPIRES_IN_SECONDS: z.coerce.number().int().min(60).default(3600),
  GEMINI_API_KEY: optionalEnvText,
  GEMINI_API_MODE: envGeminiApiMode,
  GEMINI_MODEL: envTextWithDefault("gemini-3.8-flash"),
  GEMINI_REQUEST_TIMEOUT_MS: envPositiveIntWithDefault(30_000),
  AI_TICKET_DESCRIPTION_MAX_LENGTH: envPositiveIntWithDefault(4000),
  AI_RECENT_COMMENT_MAX_LENGTH: envPositiveIntWithDefault(1000),
  AI_RECENT_COMMENTS_MAX_COUNT: envPositiveIntWithDefault(10),
  AI_REPLY_OUTPUT_MAX_LENGTH: envPositiveIntWithDefault(4000),
  AI_RATE_LIMIT_WINDOW_MS: envPositiveIntWithDefault(15 * 60 * 1000),
  AI_RATE_LIMIT_MAX: envPositiveIntWithDefault(20),
  GEMINI_INPUT_COST_PER_1M: optionalEnvRate,
  GEMINI_OUTPUT_COST_PER_1M: optionalEnvRate,
  CORS_ORIGINS: z.string().transform((value) =>
    value.split(",").map((origin) => origin.trim()).filter(Boolean)
  ).refine((origins) => origins.length > 0, "CORS_ORIGINS must contain at least one origin")
    .refine((origins) => origins.every((origin) => {
      try {
        const url = new URL(origin);
        return (url.protocol === "http:" || url.protocol === "https:") &&
          url.origin === origin;
      } catch {
        return false;
      }
    }), "CORS_ORIGINS must contain only explicit HTTP(S) origins")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Invalid environment configuration:", parsedEnv.error.issues.map(issue => ({
    field: issue.path.join("."),
    message: issue.message
  })));
  throw new Error("Environment validation failed");
}

export const env = parsedEnv.data;
