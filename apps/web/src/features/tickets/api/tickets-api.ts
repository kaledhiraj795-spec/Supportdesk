import { apiRequestEnvelope, ApiError } from "../../../lib/api-client";

export type Ticket = {
  id: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
  priority: "P1" | "P2" | "P3" | "P4";
  category: string;
  createdAt: string;
};

export type TicketPageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

const pageSize = 100;

const isTicketPageMeta = (value: unknown): value is TicketPageMeta =>
  typeof value === "object" &&
  value !== null &&
  "totalPages" in value &&
  typeof value.totalPages === "number" &&
  Number.isInteger(value.totalPages) &&
  value.totalPages >= 0;

export const getTickets = async (signal?: AbortSignal): Promise<Ticket[]> => {
  const firstPage = await apiRequestEnvelope<Ticket[], TicketPageMeta>(
    `/tickets?page=1&limit=${pageSize}`,
    { signal }
  );
  if (!isTicketPageMeta(firstPage.meta)) {
    throw new ApiError("The tickets response contains invalid pagination metadata.", 200);
  }

  if (firstPage.meta.totalPages <= 1) return firstPage.data;

  const remainingPages: Ticket[][] = [];
  for (let firstPageNumber = 2; firstPageNumber <= firstPage.meta.totalPages; firstPageNumber += 5) {
    const batch = await Promise.all(
      Array.from(
        { length: Math.min(5, firstPage.meta.totalPages - firstPageNumber + 1) },
        (_, index) =>
          apiRequestEnvelope<Ticket[], TicketPageMeta>(
            `/tickets?page=${firstPageNumber + index}&limit=${pageSize}`,
            { signal }
          )
      )
    );
    remainingPages.push(...batch.map((page) => page.data));
  }

  return [...firstPage.data, ...remainingPages.flat()];
};
