import { Link } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { useTickets } from "../features/tickets/hooks/useTickets";
import type { Ticket } from "../features/tickets/api/tickets-api";
import { getSession, type UserRole } from "../lib/auth";

const statusLabels: Record<Ticket["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting on Customer",
  resolved: "Resolved",
  closed: "Closed"
};

const roleCopy: Record<UserRole, { eyebrow: string; title: string; description: string }> = {
  customer: {
    eyebrow: "Your support overview",
    title: "How can we help today?",
    description: "Track your requests and see the latest updates from your support team."
  },
  agent: {
    eyebrow: "Agent workspace",
    title: "Your support queue at a glance",
    description: "Review ticket activity and keep customer requests moving."
  },
  admin: {
    eyebrow: "Administration",
    title: "Support operations overview",
    description: "Monitor ticket volume and status across the support workspace."
  }
};

const countByStatus = (tickets: Ticket[], status: Ticket["status"]) =>
  tickets.filter((ticket) => ticket.status === status).length;

const countByPriority = (tickets: Ticket[], priority: Ticket["priority"]) =>
  tickets.filter((ticket) => ticket.priority === priority).length;

const recentFirst = (left: Ticket, right: Ticket) =>
  new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};

type SummaryCardProps = {
  label: string;
  value: number | "—";
  accent: string;
};

function SummaryCard({ label, value, accent }: SummaryCardProps) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{label}</p>
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${accent}`}>{value}</p>
    </article>
  );
}

type DistributionBarProps = {
  label: string;
  count: number;
  total: number;
  color: string;
};

function DistributionBar({ label, count, total, color }: DistributionBarProps) {
  const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-slate-700">{label}</span>
        <span className="tabular-nums text-slate-500">{count}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`${label} tickets`}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={count}
        className="h-2 overflow-hidden rounded-full bg-slate-100"
      >
        <div className={`h-full rounded-full ${color}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const role = getSession()?.user.role ?? "customer";
  const copy = roleCopy[role];
  const { data: tickets, error, isPending, isError, refetch } = useTickets();
  const values = tickets ?? [];
  const total = isPending || isError ? "—" : values.length;
  const openCount = isPending || isError ? "—" : countByStatus(values, "open");
  const inProgressCount = isPending || isError ? "—" : countByStatus(values, "in_progress");
  const resolvedClosedCount = isPending || isError
    ? "—"
    : countByStatus(values, "resolved") + countByStatus(values, "closed");
  const recentTickets = [...values].sort(recentFirst).slice(0, 5);
  const showDistributions = role === "agent" || role === "admin";

  return (
    <div className="space-y-7">
      <section className="overflow-hidden rounded-2xl bg-indigo-950 px-6 py-8 text-white shadow-sm sm:px-8 sm:py-10">
        <p className="text-sm font-semibold text-indigo-200">{copy.eyebrow}</p>
        <h1 className="mt-3 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">{copy.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-100 sm:text-base">{copy.description}</p>
      </section>

      <section aria-label="Ticket summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Tickets" value={total} accent="text-slate-900" />
        <SummaryCard label="Open" value={openCount} accent="text-amber-700" />
        <SummaryCard label="In Progress" value={inProgressCount} accent="text-blue-700" />
        <SummaryCard label="Resolved / Closed" value={resolvedClosedCount} accent="text-emerald-700" />
      </section>

      {showDistributions && !isPending && !isError && (
        <section aria-label="Ticket distributions" className="grid gap-5 lg:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-slate-900">Ticket status</h2>
            <div className="mt-5 space-y-4">
              {(Object.keys(statusLabels) as Ticket["status"][]).map((status) => (
                <DistributionBar
                  key={status}
                  label={statusLabels[status]}
                  count={countByStatus(values, status)}
                  total={values.length}
                  color={status === "resolved" || status === "closed" ? "bg-emerald-500" : "bg-indigo-500"}
                />
              ))}
            </div>
          </article>
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="font-semibold text-slate-900">Ticket priority</h2>
            <div className="mt-5 space-y-4">
              {(["P1", "P2", "P3", "P4"] as const).map((priority, index) => (
                <DistributionBar
                  key={priority}
                  label={priority}
                  count={countByPriority(values, priority)}
                  total={values.length}
                  color={index === 0 ? "bg-red-500" : index === 1 ? "bg-orange-500" : index === 2 ? "bg-blue-500" : "bg-slate-500"}
                />
              ))}
            </div>
          </article>
        </section>
      )}

      <section aria-labelledby="recent-tickets-heading" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <h2 id="recent-tickets-heading" className="font-semibold text-slate-900">Recent Tickets</h2>
            <p className="mt-1 text-sm text-slate-500">The latest tickets available to your account.</p>
          </div>
          <Link
            to="/tickets"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >
            View all
          </Link>
        </div>

        <div className="p-5 sm:p-6">
          {isPending && <LoadingState label="Loading recent tickets…" />}
          {isError && (
            <ErrorState
              message={error instanceof Error ? error.message : "Tickets could not be loaded."}
              onRetry={() => void refetch()}
            />
          )}
          {!isPending && !isError && values.length === 0 && (
            <EmptyState title="No tickets yet" description="Tickets available to your account will appear here." />
          )}
          {!isPending && !isError && recentTickets.length > 0 && (
            <div className="-mx-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-5 py-3 font-medium sm:px-3">Ticket</th>
                    <th scope="col" className="px-5 py-3 font-medium">Status</th>
                    <th scope="col" className="px-5 py-3 font-medium">Priority</th>
                    <th scope="col" className="px-5 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentTickets.map((ticket) => (
                    <tr key={ticket.id} className="text-slate-700">
                      <td className="max-w-xs px-5 py-4 sm:px-3">
                        <p className="truncate font-medium text-slate-900">{ticket.title}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{ticket.category}</p>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">{statusLabels[ticket.status]}</td>
                      <td className="whitespace-nowrap px-5 py-4">{ticket.priority}</td>
                      <td className="whitespace-nowrap px-5 py-4">{formatDate(ticket.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
