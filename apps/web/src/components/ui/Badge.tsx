import type { TicketPriority, TicketStatus } from "../../features/tickets/api/tickets-api";

export const ticketStatuses = [
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed"
] as const satisfies readonly TicketStatus[];

export const ticketStatusLabels: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  waiting_on_customer: "Waiting on Customer",
  resolved: "Resolved",
  closed: "Closed"
};

const statusClasses: Record<TicketStatus, string> = {
  open: "bg-amber-100 text-amber-900",
  in_progress: "bg-blue-100 text-blue-900",
  waiting_on_customer: "bg-orange-100 text-orange-900",
  resolved: "bg-emerald-100 text-emerald-900",
  closed: "bg-slate-100 text-slate-800"
};

const priorityClasses: Record<TicketPriority, string> = {
  P1: "bg-rose-100 text-rose-900",
  P2: "bg-orange-100 text-orange-900",
  P3: "bg-sky-100 text-sky-900",
  P4: "bg-slate-100 text-slate-800"
};

type StatusBadgeProps = {
  type: "status";
  value: TicketStatus;
  className?: string;
};

type PriorityBadgeProps = {
  type: "priority";
  value: TicketPriority;
  className?: string;
};

type CategoryBadgeProps = {
  type: "category";
  value: string;
  className?: string;
};

export type BadgeProps = StatusBadgeProps | PriorityBadgeProps | CategoryBadgeProps;

export function Badge(props: BadgeProps) {
  const label = props.type === "status" ? ticketStatusLabels[props.value] : props.value;
  const tone = props.type === "status"
    ? statusClasses[props.value]
    : props.type === "priority"
      ? priorityClasses[props.value]
      : "bg-slate-100 text-slate-800";

  return (
    <span className={`inline-flex w-fit shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold leading-5 ${tone} ${props.className ?? ""}`}>
      {label}
    </span>
  );
}
