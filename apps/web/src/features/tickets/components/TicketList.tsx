import { useTickets } from "../hooks/useTickets";

export function TicketList() {
  const { data: tickets, error, isPending, isError } = useTickets();

  if (isPending) {
    return <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600">Loading tickets…</p>;
  }
  if (isError) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
      {error instanceof Error ? error.message : "Tickets could not be loaded."}
    </p>;
  }
  if (tickets.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
      No tickets to display yet.
    </p>;
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
