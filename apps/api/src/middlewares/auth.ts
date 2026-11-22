import type { RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

const unauthorized = (res: Parameters<RequestHandler>[1]) => {
  res.status(401).json({
    data: null,
    error: { message: "Authentication required" },
    meta: null
  });
};

export const requireAuth: RequestHandler = (req, res, next) => {
  const authorization = req.get("authorization");
  const match = authorization?.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    unauthorized(res);
    return;
  }

  let payload: JwtPayload;
  try {
    const verified = jwt.verify(match[1], env.JWT_SECRET, {
      algorithms: ["HS256"]
    });
    if (typeof verified === "string" || typeof verified !== "object") {
      unauthorized(res);
      return;
    }
    payload = verified;
  } catch {
    unauthorized(res);
    return;
  }

  if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
    unauthorized(res);
    return;
  }
  req.user = { id: payload.userId, role: payload.role };
  next();
};

export const requireRole = (...roles: string[]): RequestHandler =>
  (req, res, next) => {
    if (!req.user) {
      unauthorized(res);
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        data: null,
        error: { message: "Forbidden" },
        meta: null
      });
      return;
    }
    next();
  };
