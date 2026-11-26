import { env } from "../config/env";
import { createTicketSchemaWithDescriptionLimit } from "./tickets.schema";

export const createTicketApiSchema = createTicketSchemaWithDescriptionLimit(
  env.AI_TICKET_DESCRIPTION_MAX_LENGTH
);
export const updateTicketApiSchema = createTicketApiSchema.partial();
