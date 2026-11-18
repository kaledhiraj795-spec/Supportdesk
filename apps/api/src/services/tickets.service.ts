import {
  findAllTickets,
  findTicketById,
  createTicket,
  updateTicket
} from "../repositories/tickets.repository";

export const getAllTickets = () => {
  return findAllTickets();
};

export const getTicketById = (id: string) => {
  return findTicketById(id);
};

export const addTicket = (data: Parameters<typeof createTicket>[0]) => {
  return createTicket(data);
};

export const editTicket = (
  id: string,
  data: Parameters<typeof updateTicket>[1]
) => {
  return updateTicket(id, data);
};