import { z } from "zod";

export const AI_TICKET_CATEGORIES = [
  "Account",
  "Billing",
  "Technical Support",
  "General"
] as const;

export const AI_TICKET_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;

export const ticketAiSuggestionSchema = z.object({
  category: z.enum(AI_TICKET_CATEGORIES),
  priority: z.enum(AI_TICKET_PRIORITIES)
}).strict();

export type TicketAiSuggestion = z.infer<typeof ticketAiSuggestionSchema>;
