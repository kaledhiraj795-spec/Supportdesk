import { useTickets } from "../hooks/useTickets";
import { EmptyState } from "../../../components/EmptyState";
import { ErrorState } from "../../../components/ErrorState";
import { LoadingState } from "../../../components/LoadingState";

export function TicketList() {
  const { data: tickets, error, isPending, isError, refetch } = useTickets();

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
  if (tickets.length === 0) {
    return <EmptyState title="No tickets yet" description="Tickets available to your account will appear here." />;
  }

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-slate-900">{ticket.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{ticket.category} · {ticket.priority}</p>
          </div>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-700">
            {ticket.status.replaceAll("_", " ")}
          </span>
        </li>
      ))}
    </ul>
  );
}
