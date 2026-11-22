import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  findAllTickets,
  findTicketById,
  updateTicket
} from "../src/repositories/tickets.repository";

const prismaMocks = vi.hoisted(() => ({
  ticket: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    updateMany: vi.fn()
  }
}));

vi.mock("../generated/prisma/client", () => ({
  PrismaClient: class {
    ticket = prismaMocks.ticket;
  }
}));

const customer = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "customer"
};
const ticketId = "33333333-3333-4333-8333-333333333333";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ticket repository ownership filters", () => {
  it("filters customer lists by creatorId but leaves agent lists unfiltered", async () => {
    prismaMocks.ticket.findMany.mockResolvedValue([]);

    await findAllTickets(customer);
    await findAllTickets({ id: "agent-id", role: "agent" });

    expect(prismaMocks.ticket.findMany).toHaveBeenNthCalledWith(1, {
      where: { creatorId: customer.id },
      orderBy: { createdAt: "desc" }
    });
    expect(prismaMocks.ticket.findMany).toHaveBeenNthCalledWith(2, {
      orderBy: { createdAt: "desc" }
    });
  });

  it("constrains customer reads by both ticket ID and creatorId", async () => {
    prismaMocks.ticket.findFirst.mockResolvedValue(null);

    await findTicketById(ticketId, customer);

    expect(prismaMocks.ticket.findFirst).toHaveBeenCalledWith({
      where: { id: ticketId, creatorId: customer.id }
    });
  });

  it("makes customer updates atomic and scoped to their own ticket", async () => {
    prismaMocks.ticket.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateTicket(ticketId, { title: "Changed" }, customer);

    expect(result).toBeNull();
    expect(prismaMocks.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: ticketId, creatorId: customer.id },
      data: { title: "Changed" }
    });
    expect(prismaMocks.ticket.findFirst).not.toHaveBeenCalled();
  });

  it("does not add ownership restrictions to agent reads or updates", async () => {
    prismaMocks.ticket.findFirst.mockResolvedValue({ id: ticketId });
    prismaMocks.ticket.updateMany.mockResolvedValue({ count: 1 });
    const agent = { id: "agent-id", role: "agent" };

    await findTicketById(ticketId, agent);
    await updateTicket(ticketId, { title: "Changed" }, agent);

    expect(prismaMocks.ticket.findFirst).toHaveBeenNthCalledWith(1, {
      where: { id: ticketId }
    });
    expect(prismaMocks.ticket.updateMany).toHaveBeenCalledWith({
      where: { id: ticketId },
      data: { title: "Changed" }
    });
  });
});
