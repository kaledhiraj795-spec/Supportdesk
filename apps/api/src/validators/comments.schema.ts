import { z } from "zod";
import { env } from "../config/env";

export const ticketIdParamSchema = z.string().uuid();

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(env.AI_RECENT_COMMENT_MAX_LENGTH),
  isInternal: z.boolean().optional()
});
