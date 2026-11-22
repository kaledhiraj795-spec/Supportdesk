import { z } from "zod";

export const ticketQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["open", "in_progress", "waiting_on_customer", "resolved", "closed"]).optional(),
  priority: z.enum(["P1", "P2", "P3", "P4"]).optional(),
  assigneeId: z.string().uuid().optional(),
  search: z.string().trim().max(200).optional().transform((value) => value || undefined),
  sortBy: z.enum(["createdAt", "updatedAt", "title", "status", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc")
});

export type TicketQuery = z.infer<typeof ticketQuerySchema>;

export const parseTicketQuery = (input: unknown) =>
  ticketQuerySchema.safeParse(input);
