import { z } from "zod";
import { env } from "../config/env";

export const ticketIdSchema = z.string().uuid();

export const createTicketSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).max(env.AI_TICKET_DESCRIPTION_MAX_LENGTH),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  category: z.string().trim().min(1),
  assigneeId: z.string().uuid().nullable().optional(),
  status: z.enum([
    "open",
    "in_progress",
    "waiting_on_customer",
    "resolved",
    "closed"
  ]).optional(),
  slaDueAt: z.string().datetime().nullable().optional()
});

export const updateTicketSchema = createTicketSchema.partial();