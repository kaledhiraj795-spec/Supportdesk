
import type { Request, Response, NextFunction } from "express";
import {
  getAllTickets,
  getTicketById,
  addTicket,
  editTicket
} from "../services/tickets.service";
import {
  createTicketSchema,
  ticketIdSchema,
  updateTicketSchema
} from "../validators/tickets.schema";
import { parseTicketQuery } from "../validators/tickets.query";
import { getTicketPage } from "../services/tickets.service";

export const getTickets = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        data: null,
        error: { message: "Authentication required" },
        meta: null
      });
      return;
    }
    const query = parseTicketQuery(req.query);
    if (!query.success) {
      res.status(400).json({
        data: null,
        error: {
          message: "Invalid query parameters",
          details: query.error.issues.map((issue) => ({
            path: issue.path.map(String),
            message: issue.message
          }))
        },
        meta: null
      });
      return;
    }
    const result = await getTicketPage(query.data, req.user);

    res.status(200).json({
      data: result.data,
      error: null,
      meta: result.meta
    });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        data: null,
        error: { message: "Authentication required" },
        meta: null
      });
      return;
    }
    const id = ticketIdSchema.safeParse(String(req.params.id));
    if (!id.success) {
      res.status(400).json({
        data: null,
        error: { message: "Invalid ticket ID" },
        meta: null
      });
      return;
    }

    const ticket = await getTicketById(id.data, req.user);

    if (!ticket) {
      res.status(404).json({
        data: null,
        error: { message: "Ticket not found" },
        meta: null
      });
      return;
    }

    res.status(200).json({
      data: ticket,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

export const createNewTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        data: null,
        error: { message: "Authentication required" },
        meta: null
      });
      return;
    }

    const validation = createTicketSchema.safeParse(req.body);

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

    const { slaDueAt, ...ticketFields } = validation.data;

    if (
      req.user.role === "customer" &&
      ("assigneeId" in validation.data ||
        "status" in validation.data ||
        "slaDueAt" in validation.data)
    ) {
      res.status(403).json({
        data: null,
        error: { message: "Forbidden" },
        meta: null
      });
      return;
    }

    const ticketData = {
      ...ticketFields,
      creatorId: req.user.id,
      ...(slaDueAt !== undefined
        ? {
            slaDueAt:
              slaDueAt === null ? null : new Date(slaDueAt)
          }
        : {})
    };

    const ticket = await addTicket(ticketData);

    res.status(201).json({
      data: ticket,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};

export const updateExistingTicket = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      res.status(401).json({
        data: null,
        error: { message: "Authentication required" },
        meta: null
      });
      return;
    }

    const id = ticketIdSchema.safeParse(String(req.params.id));
    if (!id.success) {
      res.status(400).json({
        data: null,
        error: { message: "Invalid ticket ID" },
        meta: null
      });
      return;
    }

    const validation = updateTicketSchema.safeParse(req.body);

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

    const { slaDueAt, ...ticketFields } = validation.data;

    if (
      req.user.role === "customer" &&
      ("assigneeId" in validation.data ||
        "status" in validation.data ||
        "slaDueAt" in validation.data)
    ) {
      res.status(403).json({
        data: null,
        error: { message: "Forbidden" },
        meta: null
      });
      return;
    }

    const ticketData = {
      ...ticketFields,
      ...(slaDueAt !== undefined
        ? {
            slaDueAt:
              slaDueAt === null ? null : new Date(slaDueAt)
          }
        : {})
    };

    const ticket = await editTicket(id.data, ticketData, req.user);

    if (!ticket) {
      res.status(404).json({
        data: null,
        error: { message: "Ticket not found" },
        meta: null
      });
      return;
    }

    res.status(200).json({
      data: ticket,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};
