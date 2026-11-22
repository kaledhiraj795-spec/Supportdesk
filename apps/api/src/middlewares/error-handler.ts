import type { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const statusCode =
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof err.statusCode === "number" &&
    err.statusCode >= 400 &&
    err.statusCode < 600
      ? err.statusCode
      : 500;
  console.error("API request failed", {
    name: err instanceof Error ? err.name : "UnknownError",
    statusCode
  });
  res.status(statusCode).json({
    data: null,
    error: {
      message: statusCode === 500 ? "Internal server error" : "Request failed"
    },
    meta: null
  });
};
