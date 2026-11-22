import type { RequestHandler } from "express";
import { createCommentSchema, ticketIdParamSchema } from "../validators/comments.schema";
import { addComment, getTicketComments } from "../services/comments.service";

export const listComments: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ data: null, error: { message: "Authentication required" }, meta: null });
    return;
  }
  const ticketId = ticketIdParamSchema.safeParse(req.params.ticketId);
  if (!ticketId.success) {
    res.status(400).json({ data: null, error: { message: "Invalid ticket ID" }, meta: null });
    return;
  }
  try {
    const comments = await getTicketComments(ticketId.data, req.user);
    if (!comments) {
      res.status(404).json({ data: null, error: { message: "Ticket not found" }, meta: null });
      return;
    }
    res.status(200).json({ data: comments, error: null, meta: null });
  } catch (error) {
    next(error);
  }
};

export const createTicketComment: RequestHandler = async (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ data: null, error: { message: "Authentication required" }, meta: null });
    return;
  }
  const ticketId = ticketIdParamSchema.safeParse(req.params.ticketId);
  if (!ticketId.success) {
    res.status(400).json({ data: null, error: { message: "Invalid ticket ID" }, meta: null });
    return;
  }
  const validation = createCommentSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      data: null,
      error: {
        message: "Validation failed",
        details: validation.error.issues.map((issue) => ({
          path: issue.path.map(String),
          message: issue.message
        }))
      },
      meta: null
    });
    return;
  }
  try {
    const comment = await addComment(
      ticketId.data,
      validation.data.body,
      validation.data.isInternal ?? false,
      req.user
    );
    if (!comment) {
      res.status(404).json({ data: null, error: { message: "Ticket not found" }, meta: null });
      return;
    }
    res.status(201).json({ data: comment, error: null, meta: null });
  } catch (error) {
    next(error);
  }
};
