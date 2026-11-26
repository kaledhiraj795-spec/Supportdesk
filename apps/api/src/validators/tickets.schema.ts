import { z } from "zod";

export const ticketIdSchema = z.string().uuid();

export const createTicketSchemaWithDescriptionLimit = (
  maxDescriptionLength: number
) =>
  z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1).max(maxDescriptionLength),
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

export const createTicketSchema = createTicketSchemaWithDescriptionLimit(4000);
export const updateTicketSchema = createTicketSchema.partial();