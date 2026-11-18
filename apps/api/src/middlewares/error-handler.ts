import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode =
    typeof err.statusCode === "number" &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : 500;
console.error("API Error:", err);
  res.status(statusCode).json({
    data: null,
    error: {
      message: statusCode === 500
        ? "Internal server error"
        : err.message || "Request failed"
    },
    meta: null
  });
};
