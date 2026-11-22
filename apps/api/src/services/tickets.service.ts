import {
  findAllTickets,
  findTicketById,
  createTicket,
  updateTicket,
  findTicketsPage,
  countTickets
} from "../repositories/tickets.repository";
import type { AuthIdentity } from "../types/auth";
import type { TicketQuery } from "../validators/tickets.query";

export const getAllTickets = (identity: AuthIdentity) => {
  return findAllTickets(identity);
};

export const getTicketById = (id: string, identity: AuthIdentity) => {
  return findTicketById(id, identity);
};

export const addTicket = (data: Parameters<typeof createTicket>[0]) => {
  return createTicket(data);
};

export const editTicket = (
  id: string,
  data: Parameters<typeof updateTicket>[1],
  identity: AuthIdentity
) => {
  return updateTicket(id, data, identity);
};

export const getTicketPage = async (
  query: TicketQuery,
  identity: AuthIdentity
) => {
  const [data, total] = await Promise.all([
    findTicketsPage(query, identity),
    countTickets(query, identity)
  ]);
  const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);
  return {
    data,
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages
    }
  };
};