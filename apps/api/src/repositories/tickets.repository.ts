import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

const adapter = new PrismaPg({
  connectionString: env.DATABASE_URL
});

const prisma = new PrismaClient({ adapter });

export const findAllTickets = () => {
  return prisma.ticket.findMany({
    orderBy: { createdAt: "desc" }
  });
};

export const findTicketById = (id: string) => {
  return prisma.ticket.findUnique({
    where: { id }
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
  }
) => {
  return prisma.ticket.update({
    where: { id },
    data
  });
};