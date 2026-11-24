import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Table, type TableColumn } from "./Table";

type Row = { id: string; title: string; status: string };
const columns: TableColumn<Row>[] = [
  { key: "title", header: "Ticket", renderCell: (row) => row.title },
  { key: "status", header: "Status", renderCell: (row) => row.status }
];

describe("Table", () => {
  it("renders semantic column headers and rows", () => {
    render(
      <Table
        ariaLabel="Tickets"
        columns={columns}
        rows={[{ id: "1", title: "Cannot sign in", status: "Open" }]}
        getRowKey={(row) => row.id}
      />
    );

    const table = screen.getByRole("table", { name: "Tickets" });
    expect(within(table).getAllByRole("columnheader").map((header) => header.textContent)).toEqual(["Ticket", "Status"]);
    expect(within(table).getByRole("row", { name: "Cannot sign in Open" })).toBeInTheDocument();
    expect(within(table).getAllByRole("columnheader").every((header) => header.getAttribute("scope") === "col")).toBe(true);
    expect(table.parentElement).toHaveClass("overflow-x-auto");
  });

  it("renders a clear empty state inside the table", () => {
    render(
      <Table
        ariaLabel="Tickets"
        columns={columns}
        rows={[]}
        getRowKey={(row) => row.id}
        emptyState="No tickets to display."
      />
    );

    expect(screen.getByRole("table", { name: "Tickets" })).toHaveTextContent("No tickets to display.");
  });
});
