import { convertCsvToTickets } from "../src/csv-to-json";

describe("convertCsvToTickets", () => {
  const fixedDate = new Date(2026, 9, 27);

  it("converts valid CSV into ticket records", () => {
    const csv =
      "title,description,priority\nLogin issue,Unable to log in,high";

    const tickets = convertCsvToTickets(csv, fixedDate);

    expect(tickets).toHaveLength(1);
    expect(tickets[0].title).toBe("Login issue");
    expect(tickets[0].ticketId).toMatch(/^SD-20261027-[A-F0-9]{8}$/);
  });

  it("maps CSV headers and values correctly", () => {
    const csv =
      "title,description,priority\nPayment issue,Payment delayed,medium";

    const tickets = convertCsvToTickets(csv, fixedDate);

    expect(tickets[0]).toMatchObject({
      title: "Payment issue",
      description: "Payment delayed",
      priority: "medium"
    });
  });

  it("rejects empty CSV input", () => {
    expect(() => convertCsvToTickets("")).toThrow(/empty/i);
  });

  it("reports missing required columns", () => {
    const csv = "title,priority\nLogin issue,high";

    expect(() => convertCsvToTickets(csv)).toThrow(
      /missing required column.*description/i
    );
  });

  it("rejects rows with the wrong number of columns", () => {
    const csv =
      "title,description,priority\nLogin issue,Unable to log in";

    expect(() => convertCsvToTickets(csv)).toThrow(
      /Row 2: expected 3 columns but found 2/
    );
  });

  it("rejects an empty required field", () => {
    const csv =
      "title,description,priority\n,Unable to log in,high";

    expect(() => convertCsvToTickets(csv)).toThrow(
      /required field "title" is empty/
    );
  });

  it("rejects an invalid priority", () => {
    const csv =
      "title,description,priority\nLogin issue,Unable to log in,urgent";

    expect(() => convertCsvToTickets(csv)).toThrow(
      /invalid priority "urgent"/
    );
  });

  it("rejects a header-only CSV with no ticket records", () => {
    const csv = "title,description,priority";

    expect(() => convertCsvToTickets(csv)).toThrow(
      /no ticket records/i
    );
  });

  it("rejects malformed quoted CSV", () => {
    const csv =
      'title,description,priority\n"Login issue,Unable to log in,high';

    expect(() => convertCsvToTickets(csv)).toThrow(/Unable to parse CSV/i);
  });
});
