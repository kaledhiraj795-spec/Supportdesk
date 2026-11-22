import {
  createComment,
  findAccessibleTicket,
  findComments
} from "../repositories/comments.repository";
import type { AuthIdentity } from "../types/auth";

export const getTicketComments = async (ticketId: string, identity: AuthIdentity) => {
  const ticket = await findAccessibleTicket(ticketId, identity);
  if (!ticket) return null;
  return findComments(ticketId, identity);
};

export const addComment = async (
  ticketId: string,
  body: string,
  isInternal: boolean,
  identity: AuthIdentity
) => {
  const ticket = await findAccessibleTicket(ticketId, identity);
  if (!ticket) return null;
  return createComment({
    ticketId,
    authorId: identity.id,
    body,
    isInternal: identity.role === "customer" ? false : isInternal
  });
};
