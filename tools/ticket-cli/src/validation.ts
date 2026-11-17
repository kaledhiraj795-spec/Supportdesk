export type TicketPriority = "low" | "medium" | "high";

export interface TicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
}

const REQUIRED_COLUMNS = ["title", "description", "priority"] as const;

export function normalizeAndValidateHeaders(headers: string[]): string[] {
  const normalized = headers.map((header) => header.trim().toLowerCase());

  if (normalized.some((header) => header.length === 0)) {
    throw new Error("CSV contains an empty column name.");
  }

  const seen = new Set<string>();

  for (const header of normalized) {
    if (seen.has(header)) {
      throw new Error(`CSV contains duplicate column "${header}".`);
    }

    seen.add(header);
  }

  const missing = REQUIRED_COLUMNS.filter(
    (column) => !normalized.includes(column)
  );

  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(", ")}.`
    );
  }

  return normalized;
}

export function validateTicketRow(
  values: string[],
  headers: string[],
  rowNumber: number
): TicketInput {
  if (values.length !== headers.length) {
    throw new Error(
      `Row ${rowNumber}: expected ${headers.length} columns but found ${values.length}.`
    );
  }

  const row: Record<string, string> = {};

  headers.forEach((header, index) => {
    row[header] = (values[index] ?? "").trim();
  });

  for (const field of REQUIRED_COLUMNS) {
    if (!row[field]) {
      throw new Error(
        `Row ${rowNumber}: required field "${field}" is empty.`
      );
    }
  }

  const priority = row.priority.toLowerCase();

  if (!["low", "medium","high"].includes(priority)) {
    throw new Error(
      `Row ${rowNumber}: invalid priority "${row.priority}". Use low, medium, or high.`
    );
  }

  return {
    title: row.title,
    description: row.description,
    priority: priority as TicketPriority
  };
}
