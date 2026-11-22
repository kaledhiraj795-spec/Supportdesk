import { z } from "zod";

export const ticketIdParamSchema = z.string().uuid();

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(5000),
  isInternal: z.boolean().optional()
});
