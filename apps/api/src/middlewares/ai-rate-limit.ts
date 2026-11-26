import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";

export const aiRateLimiter = rateLimit({
  windowMs: env.AI_RATE_LIMIT_WINDOW_MS,
  limit: env.AI_RATE_LIMIT_MAX,
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
