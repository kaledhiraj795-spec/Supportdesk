import { Badge } from "../../../components/ui/Badge";
import type { TicketStatus } from "../api/tickets-api";

export { ticketStatuses, ticketStatusLabels } from "../../../components/ui/Badge";

type StatusBadgeProps = {
  status: TicketStatus;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge type="status" value={status} />;
}
