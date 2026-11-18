import { z } from "zod";

export const createTicketSchema = z.object({
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  category: z.string().trim().min(1),
  creatorId: z.string().uuid(),
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

export const updateTicketSchema = createTicketSchema
  .omit({ creatorId: true })
  .partial();