import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";
import type { AuthIdentity } from "../types/auth";
import type { TicketQuery } from "../validators/tickets.query";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

const buildTicketWhere = (query: TicketQuery, identity: AuthIdentity) => ({
  ...(identity.role === "customer" ? { creatorId: identity.id } : {}),
  ...(query.status ? { status: query.status } : {}),
  ...(query.priority ? { priority: query.priority } : {}),
  ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
  ...(query.search
    ? {
        OR: [
          { title: { contains: query.search, mode: "insensitive" as const } },
          { description: { contains: query.search, mode: "insensitive" as const } },
          { category: { contains: query.search, mode: "insensitive" as const } }
        ]
      }
    : {})
});

export const findAllTickets = (identity: AuthIdentity) => {
  return prisma.ticket.findMany({
    ...(identity.role === "customer" ? { where: { creatorId: identity.id } } : {}),
    orderBy: { createdAt: "desc" }
  });
};

export const findTicketsPage = (query: TicketQuery, identity: AuthIdentity) => {
  return prisma.ticket.findMany({
    where: buildTicketWhere(query, identity),
    orderBy: { [query.sortBy]: query.sortOrder },
    skip: (query.page - 1) * query.limit,
    take: query.limit
  });
};

export const countTickets = (query: TicketQuery, identity: AuthIdentity) => {
  return prisma.ticket.count({ where: buildTicketWhere(query, identity) });
};

export const findTicketById = (id: string, identity: AuthIdentity) => {
  return prisma.ticket.findFirst({
    where: {
      id,
      ...(identity.role === "customer" ? { creatorId: identity.id } : {})
    }
  });
};

export const createTicket = (data: {
  title: string;
  description: string;
  priority: "P1" | "P2" | "P3" | "P4";
  category: string;
  creatorId: string;
  assigneeId?: string | null;
  status?: "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
  slaDueAt?: Date | null;
}) => {
  return prisma.ticket.create({ data });
};

export const updateTicket = (
  id: string,
  data: {
    title?: string;
    description?: string;
    priority?: "P1" | "P2" | "P3" | "P4";
    category?: string;
    assigneeId?: string | null;
    status?: "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
    slaDueAt?: Date | null;
  },
  identity: AuthIdentity
) => prisma.ticket.updateMany({
  where: {
    id,
    ...(identity.role === "customer" ? { creatorId: identity.id } : {})
  },
  data
}).then(async ({ count }) => {
  if (count === 0) {
    return null;
  }
  return findTicketById(id, identity);
});