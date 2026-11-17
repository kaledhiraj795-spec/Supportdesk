import { parse } from "csv-parse/sync";
import { generateTicketId } from "./ticket-id";
import {
  normalizeAndValidateHeaders,
  validateTicketRow,
  type TicketInput
} from "./validation";

export interface TicketRecord extends TicketInput {
  ticketId: string;
}

export function convertCsvToTickets(
  csvContent: string,
  idDate?: Date
): TicketRecord[] {
  if (typeof csvContent !== "string" || csvContent.trim() === "") {
    throw new Error(
      "CSV input is empty. Provide a header row and ticket records."
    );
  }

  let rows: string[][];

  try {
    rows = parse(csvContent, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true
    }) as string[][];
  } catch (error: unknown) {
    const details =
      error instanceof Error ? error.message : "Unknown CSV parsing error";

    throw new Error(`Unable to parse CSV: ${details}`);
  }

  if (rows.length === 0) {
    throw new Error("CSV does not contain a header row.");
  }

  const headers = normalizeAndValidateHeaders(rows[0]);

  if (rows.length === 1) {
    throw new Error("CSV contains headers but no ticket records.");
  }

  return rows.slice(1).map((values, index) => {
    const ticket = validateTicketRow(values, headers, index + 2);

    return {
      ticketId: generateTicketId(idDate),
      ...ticket
    };
  });
}
