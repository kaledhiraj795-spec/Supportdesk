import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { TicketList } from "../features/tickets/components/TicketList";
import {
  ticketStatuses,
  ticketStatusLabels
} from "../features/tickets/components/StatusBadge";
import { getSession } from "../lib/auth";
import type {
  TicketListParams,
  TicketPriority,
  TicketSortBy,
  TicketStatus
} from "../features/tickets/api/tickets-api";

const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];
const sortFields: TicketSortBy[] = ["createdAt", "updatedAt", "title", "status", "priority"];
const sortOptions = sortFields.flatMap((field) => (["desc", "asc"] as const).map((order) => ({
  value: `${field}:${order}`,
  label: field === "createdAt"
    ? order === "desc" ? "Newest created" : "Oldest created"
    : field === "updatedAt"
      ? order === "desc" ? "Recently updated" : "Least recently updated"
      : field === "title"
        ? order === "asc" ? "Title A–Z" : "Title Z–A"
        : field === "status"
          ? order === "asc" ? "Status A–Z" : "Status Z–A"
          : order === "asc" ? "Priority P1 first" : "Priority P4 first"
})));

const normalizeStatus = (value: string): TicketStatus | undefined => {
  const normalized = value.toLowerCase();
  return ticketStatuses.find((status) => status === normalized);
};

const positiveInteger = (value: string | null, fallback: number, max?: number) => {
  if (value === null || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || (max !== undefined && parsed > max)) {
    return fallback;
  }
  return parsed;
};

const oneOf = <T extends string>(value: string | null, values: readonly T[]): T | undefined =>
  values.find((candidate) => candidate === value);

export function TicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const role = getSession()?.user.role ?? "customer";
  const isStaff = role === "agent" || role === "admin";
  const statuses = [...new Set(
    searchParams.getAll("status")
      .map(normalizeStatus)
      .filter((status): status is TicketStatus => status !== undefined)
  )];
  const statusFilterValue = statuses.length > 1 ? "__multiple__" : statuses[0] ?? "";
  const priority = oneOf(searchParams.get("priority"), priorities);
  const sortBy = oneOf(searchParams.get("sortBy"), sortFields) ?? "createdAt";
  const sortOrder = oneOf(searchParams.get("sortOrder"), ["asc", "desc"] as const) ?? "desc";
  const sortValue = `${sortBy}:${sortOrder}`;
  const page = positiveInteger(searchParams.get("page"), 1);
  const limit = positiveInteger(searchParams.get("limit"), 20, 100);
  const search = searchParams.get("search")?.trim() || undefined;
  const assigneeId = searchParams.get("assigneeId")?.trim() || undefined;

  const params: TicketListParams = {
    page,
    limit,
    status: statuses.length > 0 ? statuses : undefined,
    priority,
    assigneeId,
    search,
    sortBy,
    sortOrder
  };

  const applyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    const selectedStatus = String(formData.get("statusFilter") || "");
    if (selectedStatus === "__multiple__") {
      statuses.forEach((status) => next.append("status", status));
    } else {
      const status = normalizeStatus(selectedStatus);
      if (status) next.append("status", status);
    }

    const nextPriority = oneOf(String(formData.get("priority") || ""), priorities);
    if (nextPriority) next.set("priority", nextPriority);
    const nextAssigneeId = isStaff
      ? String(formData.get("assigneeId") || "").trim()
      : assigneeId ?? "";
    if (nextAssigneeId) next.set("assigneeId", nextAssigneeId);
    const nextSearch = String(formData.get("search") || "").trim();
    if (nextSearch) next.set("search", nextSearch);

    const [nextSortByValue, nextSortOrderValue] = String(formData.get("sort") || "").split(":");
    const nextSortBy = oneOf(nextSortByValue || null, sortFields);
    const nextSortOrder = oneOf(nextSortOrderValue || null, ["asc", "desc"] as const);
    if (nextSortBy && nextSortOrder) {
      next.set("sortBy", nextSortBy);
      next.set("sortOrder", nextSortOrder);
    }

    next.set("limit", String(limit));
    setSearchParams(next);
  };

  const changePage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setSearchParams(next);
  };

  const activeFilters = [
    ...(statuses.length > 0 ? [`Status: ${statuses.map((status) => ticketStatusLabels[status]).join(" / ")}`] : []),
    ...(priority ? [`Priority: ${priority}`] : []),
    ...(search ? [`Search: ${search}`] : []),
    ...(assigneeId
      ? [isStaff ? `Assignee: ${assigneeId}` : "Assignment filter applied"]
      : [])
  ];

  return (
    <section aria-labelledby="tickets-title" className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">
            {isStaff ? "Support workspace" : "Your support"}
          </p>
          <h1 id="tickets-title" className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
            {isStaff ? "All Tickets" : "My Tickets"}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            {isStaff
              ? "Review, prioritize, and respond to support requests."
              : "Track your requests and continue conversations with our support team."}
          </p>
        </div>
        <Link
          to="/tickets/new"
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
            isStaff
              ? "border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-800"
              : "bg-indigo-700 text-white shadow-sm hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-md"
          }`}
        >
          <span aria-hidden="true" className="text-lg leading-none">+</span>
          New Ticket
        </Link>
      </header>

      <form
        key={searchParams.toString()}
        onSubmit={applyFilters}
        aria-labelledby="ticket-filters-title"
        className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
      >
        <h2 id="ticket-filters-title" className="sr-only">Filter tickets</h2>
        <div className={`grid items-end gap-3 sm:grid-cols-2 ${isStaff ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
          <Input
            id="filter-search"
            name="search"
            label="Search"
            type="search"
            defaultValue={search ?? ""}
            maxLength={200}
            aria-invalid={false}
            placeholder="Search tickets…"
            wrapperClassName="space-y-1"
            labelClassName="px-1 text-xs font-semibold text-slate-600"
            className="border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white"
          />
          <div className="space-y-1">
            <label htmlFor="filter-status" className="block px-1 text-xs font-semibold text-slate-600">Status</label>
            <select id="filter-status" name="statusFilter" defaultValue={statusFilterValue} aria-invalid={false} className="block min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-indigo-400 focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
              <option value="">All statuses</option>
              {statuses.length > 1 && <option value="__multiple__">Multiple statuses</option>}
              {ticketStatuses.map((status) => <option key={status} value={status}>{ticketStatusLabels[status]}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="filter-priority" className="block px-1 text-xs font-semibold text-slate-600">Priority</label>
            <select id="filter-priority" name="priority" defaultValue={priority ?? ""} aria-invalid={false} className="block min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-indigo-400 focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
              <option value="">All priorities</option>
              {priorities.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          {isStaff && (
            <Input
              id="filter-assignee"
              name="assigneeId"
              label="Assignee ID"
              defaultValue={assigneeId ?? ""}
              aria-invalid={false}
              placeholder="Filter by assignee…"
              wrapperClassName="space-y-1"
              labelClassName="px-1 text-xs font-semibold text-slate-600"
              className="border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-400 focus:bg-white"
            />
          )}
          <div className="space-y-1">
            <label htmlFor="filter-sort" className="block px-1 text-xs font-semibold text-slate-600">Sort</label>
            <select id="filter-sort" name="sort" defaultValue={sortValue} aria-invalid={false} className="block min-h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 transition focus:border-indigo-400 focus:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
              {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-1">
            <Button type="submit" variant="primary" className="flex-1 bg-slate-900 hover:bg-slate-700">
              Apply
            </Button>
            <Link to="/tickets" className="inline-flex min-h-11 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
              Reset
            </Link>
          </div>
        </div>
      </form>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p aria-live="polite" aria-atomic="true" className="text-sm text-indigo-950">
            Filtering by: <span className="font-semibold">{activeFilters.join(" · ")}</span>
          </p>
        </div>
      )}
      <TicketList params={params} onPageChange={changePage} />
    </section>
  );
}
