import "dotenv/config";
import { z } from "zod";

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
