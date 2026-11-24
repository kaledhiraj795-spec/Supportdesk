import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Badge, ticketStatuses, ticketStatusLabels } from "./Badge";

describe("Badge", () => {
  it.each(ticketStatuses)("renders the supported %s ticket status label", (status) => {
    render(<Badge type="status" value={status} />);
    expect(screen.getByText(ticketStatusLabels[status])).toBeInTheDocument();
  });

  it.each(["P1", "P2", "P3", "P4"] as const)("renders priority %s as text", (priority) => {
    render(<Badge type="priority" value={priority} />);
    expect(screen.getByText(priority)).toBeInTheDocument();
  });
});
