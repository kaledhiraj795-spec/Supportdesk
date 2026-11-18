import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (req, res, next) => {
  const startTime = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - startTime;

    console.log({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration
    });
  });

  next();
};
