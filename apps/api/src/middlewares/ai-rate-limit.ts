import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";
import type { RequestHandler } from "express";

export const aiRateLimitKey = (userId: string | undefined): string => {
  if (!userId) {
    throw new Error("AI rate limiting requires an authenticated user.");
  }
  return `user:${userId}`;
};

export const createAiRateLimiter = (
  limit = env.AI_RATE_LIMIT_MAX
): RequestHandler => rateLimit({
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  limit,
  keyGenerator: (req) => aiRateLimitKey(req.user?.id),
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      data: null,
      error: { message: "Too many AI requests. Please try again later." },
      meta: null
    });
  }
});

export const aiRateLimiter = createAiRateLimiter();
