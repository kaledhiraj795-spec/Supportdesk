import { apiRequest } from "../../../lib/api-client";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
  priority: "P1" | "P2" | "P3" | "P4";
  category: string;
  createdAt: string;
};

export const getTickets = (signal?: AbortSignal) =>
  apiRequest<Ticket[]>("/tickets", { signal });
