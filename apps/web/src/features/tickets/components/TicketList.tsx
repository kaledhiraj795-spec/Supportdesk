import { Link, useNavigate } from "react-router-dom";
import { useTickets } from "../hooks/useTickets";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Table, type TableColumn } from "../../../components/ui/Table";
import type { Ticket, TicketListParams } from "../api/tickets-api";
import { getSession } from "../../../lib/auth";
import { StatusBadge, ticketStatusLabels } from "./StatusBadge";

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

const staffColumns: readonly TableColumn<Ticket>[] = [
  {
    key: "title",
    header: "Ticket title",
    headerClassName: "w-[280px] min-w-[220px] px-6",
    cellClassName: "w-[280px] min-w-[220px] px-6 py-3",
    renderCell: (ticket) => {
      const updatedAt = ticket.updatedAt ?? ticket.createdAt;
      const formattedDate = formatDate(updatedAt);
      return (
        <Link
          to={`/tickets/${ticket.id}`}
          aria-label={`${ticket.title}, ${ticket.category}, priority ${ticket.priority}, status ${ticketStatusLabels[ticket.status]}, updated ${formattedDate}`}
          className="block truncate rounded-sm font-semibold text-slate-900 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
        >
          {ticket.title}
        </Link>
      );
    }
  },
  {
    key: "category",
    header: "Category",
    headerClassName: "w-[150px] min-w-[120px]",
    cellClassName: "w-[150px] min-w-[120px] truncate text-slate-600",
    renderCell: (ticket) => ticket.category
  },
  {
    key: "priority",
    header: "Priority",
    headerClassName: "w-[100px]",
    cellClassName: "w-[100px]",
    renderCell: (ticket) => <Badge type="priority" value={ticket.priority} />
  },
  {
    key: "status",
    header: "Status",
    headerClassName: "w-[145px]",
    cellClassName: "w-[145px]",
    renderCell: (ticket) => <StatusBadge status={ticket.status} />
  },
  {
    key: "updated",
    header: "Updated",
    headerClassName: "w-[150px]",
    cellClassName: "w-[150px] whitespace-nowrap text-slate-600",
    renderCell: (ticket) => {
      const updatedAt = ticket.updatedAt ?? ticket.createdAt;
      return <time dateTime={updatedAt}>{formatDate(updatedAt)}</time>;
    }
  }
];

type TicketListProps = {
  params: TicketListParams;
  onPageChange: (page: number) => void;
};

export function TicketList({ params, onPageChange }: TicketListProps) {
  const { data: ticketPage, error, isPending, isError, refetch } = useTickets(params);
  const navigate = useNavigate();
  const role = getSession()?.user.role ?? "customer";
  const isStaff = role === "agent" || role === "admin";

  if (isPending) {
    return <LoadingState label="Loading tickets…" />;
  }
  if (isError) {
    return (
      <ErrorState
        message={error instanceof Error ? error.message : "Tickets could not be loaded."}
        onRetry={() => void refetch()}
      />
    );
  }
  if (ticketPage.data.length === 0) {
    const hasFilters = Boolean(
      params.status?.length || params.priority || params.assigneeId || params.search
    );
    return hasFilters
      ? <EmptyState title="No matching tickets" description="No tickets match the selected filters." />
      : <EmptyState title="No tickets yet" description="Tickets available to your account will appear here." />;
  }

  return (
    <div className="space-y-4">
      {isStaff ? (
        <section aria-label="Agent ticket queue" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Table
            ariaLabel="All tickets"
            columns={staffColumns}
            rows={ticketPage.data}
            getRowKey={(ticket) => ticket.id}
            className="w-full min-w-[820px] border-collapse text-left text-sm"
            headerRowClassName="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500"
            rowClassName="group border-b border-slate-100 text-slate-700 transition hover:bg-indigo-50/50"
            onRowClick={(ticket) => navigate(`/tickets/${ticket.id}`)}
          />
        </section>
      ) : (
        <ul aria-label="My tickets" className="grid gap-3 md:grid-cols-2">
          {ticketPage.data.map((ticket) => {
            const updatedAt = ticket.updatedAt ?? ticket.createdAt;
            const formattedDate = formatDate(updatedAt);
            return (
              <li key={ticket.id}>
                <Link
                  to={`/tickets/${ticket.id}`}
                  aria-label={`${ticket.title}, ${ticket.category}, priority ${ticket.priority}, status ${ticketStatusLabels[ticket.status]}, updated ${formattedDate}`}
                  className="group flex h-full min-h-36 flex-col justify-between gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-slate-950 group-hover:text-indigo-800">{ticket.title}</h2>
                      <p className="mt-1 truncate text-sm text-slate-600">{ticket.category}</p>
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      Priority <Badge type="priority" value={ticket.priority} />
                    </span>
                    <time dateTime={updatedAt} className="text-xs text-slate-500">Updated {formattedDate}</time>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {ticketPage.meta.totalPages > 1 && (
        <nav aria-label="Ticket list pagination" className="flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:px-4">
          <Button
            variant="secondary"
            type="button"
            onClick={() => onPageChange(ticketPage.meta.page - 1)}
            disabled={ticketPage.meta.page <= 1}
            className="w-full sm:w-auto"
          >
            Previous
          </Button>
          <p role="status" aria-live="polite" aria-atomic="true" className="text-center text-sm text-slate-600">
            Page {ticketPage.meta.page} of {ticketPage.meta.totalPages} · {ticketPage.meta.total} tickets
          </p>
          <Button
            variant="secondary"
            type="button"
            onClick={() => onPageChange(ticketPage.meta.page + 1)}
            disabled={ticketPage.meta.page >= ticketPage.meta.totalPages}
            className="w-full sm:w-auto"
          >
            Next
          </Button>
        </nav>
      )}
    </div>
  );
}
