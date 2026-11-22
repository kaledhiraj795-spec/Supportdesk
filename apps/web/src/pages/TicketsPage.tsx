import { TicketList } from "../features/tickets/components/TicketList";

export function TicketsPage() {
  return (
    <section aria-labelledby="tickets-title" className="space-y-5">
      <div>
        <p className="text-sm font-medium text-blue-700">Support workspace</p>
        <h1 id="tickets-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Tickets</h1>
        <p className="mt-2 text-sm text-slate-600">Tickets available to your account.</p>
      </div>
      <TicketList />
    </section>
  );
}
