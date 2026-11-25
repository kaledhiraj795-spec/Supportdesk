import type { RequestHandler } from "express";
import {
  prepareSuggestReplyForTicket,
  suggestCategoryAndPriorityForTicket
} from "../ai/ai.service";
import { AiFeatureError } from "../ai/errors";
import { ticketIdSchema } from "../validators/tickets.schema";

const respondWithAiError = (res: Parameters<RequestHandler>[1], error: unknown) => {
  if (!(error instanceof AiFeatureError)) return false;
  res.status(error.statusCode).json({
    data: null,
    error: { message: error.message },
    meta: null
  });
  return true;
};

const writeEvent = (res: Parameters<RequestHandler>[1], event: string, data: unknown) => {
  if (res.destroyed || res.writableEnded) return;
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
};

export const suggestReply: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ data: null, error: { message: "Authentication required" }, meta: null });
    return;
  }
  const parsedId = ticketIdSchema.safeParse(String(req.params.id));
  if (!parsedId.success) {
    res.status(400).json({ data: null, error: { message: "Invalid ticket ID" }, meta: null });
    return;
  }

  try {
    const stream = await prepareSuggestReplyForTicket(parsedId.data, req.user);
    res.status(200).set({
      "Cache-Control": "no-cache, no-transform",
      "Content-Type": "text/event-stream; charset=utf-8",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.flushHeaders();
    try {
      for await (const text of stream) {
        if (res.destroyed) return;
        writeEvent(res, "delta", { text });
      }
      writeEvent(res, "done", {});
      if (!res.destroyed && !res.writableEnded) res.end();
    } catch (error) {
      if (res.destroyed || res.writableEnded) return;
      writeEvent(
        res,
        "error",
        { message: error instanceof AiFeatureError ? error.message : "AI reply generation was interrupted." }
      );
      res.end();
    }
  } catch (error) {
    if (respondWithAiError(res, error)) return;
    next(error);
  }
};

export const categoriseTicket: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ data: null, error: { message: "Authentication required" }, meta: null });
    return;
  }
  const parsedId = ticketIdSchema.safeParse(String(req.params.id));
  if (!parsedId.success) {
    res.status(400).json({ data: null, error: { message: "Invalid ticket ID" }, meta: null });
    return;
  }

  try {
    const suggestion = await suggestCategoryAndPriorityForTicket(parsedId.data, req.user);
    res.status(200).json({ data: suggestion, error: null, meta: null });
  } catch (error) {
    if (respondWithAiError(res, error)) return;
    next(error);
  }
};
