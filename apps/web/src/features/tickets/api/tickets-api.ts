import { apiRequest, apiRequestEnvelope, ApiError } from "../../../lib/api-client";
import type { createTicketSchema } from "../../../../../api/src/validators/tickets.schema";
import type { z } from "zod";

export type TicketStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
export type TicketPriority = "P1" | "P2" | "P3" | "P4";
export type TicketSortBy = "createdAt" | "updatedAt" | "title" | "status" | "priority";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string;
  createdAt: string;
  updatedAt?: string;
  creatorId?: string;
  assigneeId?: string | null;
  slaDueAt?: string | null;
};

export type TicketComment = {
  id: string;
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
};

export type TicketPageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type TicketPage = {
  data: Ticket[];
  meta: TicketPageMeta;
};

export type TicketListParams = {
  page: number;
  limit: number;
  status?: TicketStatus[];
  priority?: TicketPriority;
  assigneeId?: string;
  search?: string;
  sortBy?: TicketSortBy;
  sortOrder?: "asc" | "desc";
};

export type CreateTicketCommentInput = {
  body: string;
  isInternal?: boolean;
};
export type TicketMetadataUpdate = Pick<Ticket, "category" | "priority">;
export type CreateTicketInput = z.input<typeof createTicketSchema>;

const pageSize = 100;

export const getTicket = (id: string, signal?: AbortSignal) =>
  apiRequest<Ticket>(`/tickets/${encodeURIComponent(id)}`, { signal });

export const getTicketComments = (id: string, signal?: AbortSignal) =>
  apiRequest<TicketComment[]>(`/tickets/${encodeURIComponent(id)}/comments`, { signal });

export const createTicketComment = (id: string, input: CreateTicketCommentInput) =>
  apiRequest<TicketComment>(`/tickets/${encodeURIComponent(id)}/comments`, {
    method: "POST",
    body: JSON.stringify(input)
  });

export const createTicket = (input: CreateTicketInput) =>
  apiRequest<Ticket>("/tickets", {
    method: "POST",
    body: JSON.stringify(input)
  });

export const updateTicketStatus = (id: string, status: TicketStatus) =>
  apiRequest<Ticket>(`/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });

export const updateTicketMetadata = (id: string, input: TicketMetadataUpdate) =>
  apiRequest<Ticket>(`/tickets/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });

const isTicketPageMeta = (value: unknown): value is TicketPageMeta =>
  typeof value === "object" &&
  value !== null &&
  "page" in value &&
  typeof value.page === "number" &&
  Number.isInteger(value.page) &&
  "limit" in value &&
  typeof value.limit === "number" &&
  Number.isInteger(value.limit) &&
  "total" in value &&
  typeof value.total === "number" &&
  Number.isInteger(value.total) &&
  "totalPages" in value &&
  typeof value.totalPages === "number" &&
  Number.isInteger(value.totalPages) &&
  value.page >= 1 &&
  value.limit >= 1 &&
  value.total >= 0 &&
  value.totalPages >= 0;

const queryFor = (params: TicketListParams) => {
  const query = new URLSearchParams({
    page: String(params.page),
    limit: String(params.limit)
  });
  params.status?.forEach((status) => query.append("status", status));
  if (params.priority) query.set("priority", params.priority);
  if (params.assigneeId) query.set("assigneeId", params.assigneeId);
  if (params.search) query.set("search", params.search);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  return query;
};

export const getTickets = async (
  params: TicketListParams,
  signal?: AbortSignal
): Promise<TicketPage> => {
  const response = await apiRequestEnvelope<Ticket[], TicketPageMeta>(
    `/tickets?${queryFor(params).toString()}`,
    { signal }
  );
  if (!isTicketPageMeta(response.meta)) {
    throw new ApiError("The tickets response contains invalid pagination metadata.", 200);
  }
  return { data: response.data, meta: response.meta };
};

export const getAllTickets = async (signal?: AbortSignal): Promise<Ticket[]> => {
  const firstPage = await getTickets({ page: 1, limit: pageSize }, signal);
  if (firstPage.meta.totalPages <= 1) return firstPage.data;

  const remainingPages: Ticket[][] = [];
  for (let firstPageNumber = 2; firstPageNumber <= firstPage.meta.totalPages; firstPageNumber += 5) {
    const batch = await Promise.all(
      Array.from(
        { length: Math.min(5, firstPage.meta.totalPages - firstPageNumber + 1) },
        (_, index) =>
          getTickets({ page: firstPageNumber + index, limit: pageSize }, signal)
      )
    );
    remainingPages.push(...batch.map((page) => page.data));
  }

  return [...firstPage.data, ...remainingPages.flat()];
};
