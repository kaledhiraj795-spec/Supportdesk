import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";
import type { AuthIdentity } from "../types/auth";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const findAccessibleTicket = (ticketId: string, identity: AuthIdentity) =>
  prisma.ticket.findFirst({
    where: {
      id: ticketId,
      ...(identity.role === "customer" ? { creatorId: identity.id } : {})
    },
    select: { id: true }
  });

export const findComments = (ticketId: string, identity: AuthIdentity) =>
  prisma.comment.findMany({
    where: {
      ticketId,
      ...(identity.role === "customer" ? { isInternal: false } : {})
    },
    orderBy: { createdAt: "asc" }
  });

export const createComment = (data: {
  ticketId: string;
  authorId: string;
  body: string;
  isInternal: boolean;
}) => prisma.comment.create({ data });
