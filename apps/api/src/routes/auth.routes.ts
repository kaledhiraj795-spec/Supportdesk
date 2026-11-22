import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { loginUser, registerUser } from "../controllers/auth.controller";

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      data: null,
      error: { message: "Too many login attempts. Please try again later." },
      meta: null
    });
  }
});

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginRateLimiter, loginUser);

export default router;
