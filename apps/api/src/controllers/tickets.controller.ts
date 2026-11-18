
import type { Request, Response, NextFunction } from "express";
import {
  getAllTickets,
  getTicketById,
  addTicket,
  editTicket
} from "../services/tickets.service";
import {
  createTicketSchema,
  updateTicketSchema
} from "../validators/tickets.schema";

export const getTickets = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tickets = await getAllTickets();

    res.status(200).json({
      data: tickets,
      error: null,
      meta: null
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
    const ticket = await getTicketById(String(req.params.id));

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
    const validation = createTicketSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        data: null,
        error: {
          message: "Validation failed",
          details: validation.error.issues
        },
        meta: null
      });
      return;
    }

    const { slaDueAt, ...ticketFields } = validation.data;

    const ticketData = {
      ...ticketFields,
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
    const validation = updateTicketSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        data: null,
        error: {
          message: "Validation failed",
          details: validation.error.issues
        },
        meta: null
      });
      return;
    }

    const { slaDueAt, ...ticketFields } = validation.data;

    const ticketData = {
      ...ticketFields,
      ...(slaDueAt !== undefined
        ? {
            slaDueAt:
              slaDueAt === null ? null : new Date(slaDueAt)
          }
        : {})
    };

    const ticket = await editTicket(
      String(req.params.id),
      ticketData
    );

    res.status(200).json({
      data: ticket,
      error: null,
      meta: null
    });
  } catch (error) {
    next(error);
  }
};
