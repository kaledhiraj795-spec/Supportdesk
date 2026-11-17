import "dotenv/config";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  PrismaClient,
  TicketPriority,
  TicketStatus,
  UserRole,
} from "../generated/prisma/client";

type CliTicket = {
  ticketId: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
};

function stableUuid(value: string): string {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 32).split("");
  hex[12] = "5";
  hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);

  const id = hex.join("");
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

function getCategory(title: string): string {
  const text = title.toLowerCase();

  if (/payment|invoice|billing|refund|checkout/.test(text)) return "Billing";
  if (/login|password|profile|account|registration|email/.test(text)) return "Account";
  if (/ticket|comment|attachment|search|dashboard|api|browser|mobile/.test(text)) return "Technical Support";

  return "General";
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  try {
    const jsonPath = resolve(
      process.cwd(),
      "../../tools/ticket-cli/data/day8-tickets.json"
    );

    const tickets = JSON.parse(
      await readFile(jsonPath, "utf8")
    ) as CliTicket[];

    if (tickets.length !== 50) {
      throw new Error(`Expected exactly 50 tickets, found ${tickets.length}.`);
    }

    const uniqueIds = new Set(tickets.map((ticket) => ticket.ticketId));

    if (uniqueIds.size !== 50) {
      throw new Error("Duplicate CLI ticket IDs found in JSON.");
    }

    const customerId = "a1000000-0000-4000-8000-000000000001";
    const agentId = "a1000000-0000-4000-8000-000000000002";

    const customer = await prisma.user.upsert({
      where: { email: "day8.customer@supportdesk.test" },
      update: {},
      create: {
        id: customerId,
        name: "Sample Customer",
        email: "day8.customer@supportdesk.test",
        passwordHash: "seed-only-not-a-real-password-hash",
        role: UserRole.customer,
      },
    });

    const agent = await prisma.user.upsert({
      where: { email: "day8.agent@supportdesk.test" },
      update: {},
      create: {
        id: agentId,
        name: "Sample Support Agent",
        email: "day8.agent@supportdesk.test",
        passwordHash: "seed-only-not-a-real-password-hash",
        role: UserRole.agent,
      },
    });

    const priorityMap = {
      high: TicketPriority.P1,
      medium: TicketPriority.P2,
      low: TicketPriority.P3,
    };

    for (const [index, ticket] of tickets.entries()) {
      const id = stableUuid(ticket.ticketId);
      const data = {
        title: ticket.title,
        description: ticket.description,
        priority: priorityMap[ticket.priority],
        status: TicketStatus.open,
        category: getCategory(ticket.title),
        creatorId: customer.id,
        assigneeId: index % 2 === 0 ? agent.id : null,
      };

      await prisma.ticket.upsert({
        where: { id },
        update: data,
        create: { id, ...data },
      });
    }

    const seededCount = await prisma.ticket.count({
      where: {
        id: {
          in: tickets.map((ticket) => stableUuid(ticket.ticketId)),
        },
      },
    });

    console.log(`Seed completed. Verified tickets: ${seededCount}/50`);
    console.log("Sample users: 1 customer, 1 agent");

    if (seededCount !== 50) {
      throw new Error(`Expected 50 seeded tickets, found ${seededCount}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Seed failed:", error);
  process.exitCode = 1;
});
