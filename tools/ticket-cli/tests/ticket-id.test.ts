import { generateTicketId } from "../src/ticket-id";

describe("generateTicketId", () => {
  it("returns a ticket ID in the expected format", () => {
    const id = generateTicketId(new Date(2026, 9, 27));

    expect(id).toMatch(/^SD-20261027-[A-F0-9]{8}$/);
  });

  it("generates different IDs across repeated calls", () => {
    const date = new Date(2026, 9, 27);
    const ids = Array.from({ length: 20 }, () => generateTicketId(date));

    expect(new Set(ids).size).toBe(ids.length);
  });

  it("uses the current date when no date is provided", () => {
    const today = new Date();
    const id = generateTicketId();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    expect(id).toMatch(
      new RegExp(`^SD-${year}${month}${day}-[A-F0-9]{8}$`)
    );
  });
});
