import { randomBytes } from "node:crypto";

export function generateTicketId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const randomPart = randomBytes(4).toString("hex").toUpperCase();

  return `SD-${year}${month}${day}-${randomPart}`;
}
