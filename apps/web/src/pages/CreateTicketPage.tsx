import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { createTicketSchema } from "../../../api/src/validators/tickets.schema";
import { ErrorState } from "../components/ErrorState";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ticketStatuses, ticketStatusLabels } from "../features/tickets/components/StatusBadge";
import { useCreateTicket } from "../features/tickets/hooks/useTicket";
import type { CreateTicketInput, TicketPriority } from "../features/tickets/api/tickets-api";
import { getSession } from "../lib/auth";

const priorities: TicketPriority[] = ["P1", "P2", "P3", "P4"];

export function CreateTicketPage() {
  const navigate = useNavigate();
  const role = getSession()?.user.role ?? "customer";
  const isStaff = role === "agent" || role === "admin";
  const createTicketMutation = useCreateTicket();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      category: ""
    }
  });

  const submit = (values: CreateTicketInput) => {
    createTicketMutation.mutate(values, {
      onSuccess: (ticket) => navigate(`/tickets/${ticket.id}`)
    });
  };

  return (
    <section aria-labelledby="create-ticket-title" className="mx-auto max-w-3xl space-y-5">
      <Link to="/tickets" className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
        ← Back to tickets
      </Link>
      <div className="flex items-start gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 sm:p-6">
        <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-xl bg-indigo-700 text-2xl font-medium text-white shadow-sm">+</span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Support workspace</p>
          <h1 id="create-ticket-title" className="mt-1 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">New ticket</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Tell us what you need help with. Our team will follow up here.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(submit)} noValidate aria-busy={createTicketMutation.isPending} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <Input
          id="create-ticket-title-field"
          label="Title"
          required
          {...register("title")}
          error={errors.title?.message}
          wrapperClassName="space-y-1"
          labelClassName="font-semibold text-slate-800"
        />

        <div className="space-y-1">
          <label htmlFor="create-ticket-description" className="block text-sm font-semibold text-slate-800">Description</label>
          <textarea
            id="create-ticket-description"
            {...register("description")}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={errors.description ? "ticket-description-error" : undefined}
            rows={6}
            className="block w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          />
          {errors.description && <span id="ticket-description-error" role="alert" className="block text-sm font-normal text-red-700">{errors.description.message}</span>}
        </div>

        <Input
          id="create-ticket-category"
          label="Category"
          required
          {...register("category")}
          error={errors.category?.message}
          wrapperClassName="space-y-1"
          labelClassName="font-semibold text-slate-800"
        />

        <div className="space-y-1">
          <label htmlFor="create-ticket-priority" className="block text-sm font-semibold text-slate-800">Priority</label>
          <select
            id="create-ticket-priority"
            {...register("priority")}
            aria-invalid={Boolean(errors.priority)}
            aria-describedby={errors.priority ? "ticket-priority-error" : undefined}
            className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >
            <option value="">Select priority</option>
            {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
          </select>
          {errors.priority && <span id="ticket-priority-error" role="alert" className="block text-sm font-normal text-red-700">{errors.priority.message}</span>}
        </div>

        {isStaff && (
          <>
            <Input
              id="create-ticket-assignee"
              label={<>Assignee ID <span className="font-normal text-slate-500">(optional UUID)</span></>}
              {...register("assigneeId", { setValueAs: (value: string) => value === "" ? undefined : value })}
              error={errors.assigneeId?.message}
              wrapperClassName="space-y-1"
              labelClassName="font-semibold text-slate-800"
            />
            <div className="space-y-1">
              <label htmlFor="create-ticket-status" className="block text-sm font-semibold text-slate-800">
                Initial status <span className="font-normal text-slate-500">(defaults to Open)</span>
              </label>
              <select
                id="create-ticket-status"
                {...register("status", { setValueAs: (value: string) => value === "" ? undefined : value })}
                aria-invalid={Boolean(errors.status)}
                aria-describedby={errors.status ? "ticket-status-error" : undefined}
                className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
              >
                <option value="">Use default (Open)</option>
                {ticketStatuses.map((status) => <option key={status} value={status}>{ticketStatusLabels[status]}</option>)}
              </select>
              {errors.status && <span id="ticket-status-error" role="alert" className="block text-sm font-normal text-red-700">{errors.status.message}</span>}
            </div>
            <Input
              id="create-ticket-sla"
              label={<>SLA due at <span className="font-normal text-slate-500">(optional ISO date-time)</span></>}
              {...register("slaDueAt", { setValueAs: (value: string) => value === "" ? undefined : value })}
              error={errors.slaDueAt?.message}
              helperText="Enter a date-time in ISO 8601 format."
              placeholder="2026-11-24T15:00:00.000Z"
              wrapperClassName="space-y-1"
              labelClassName="font-semibold text-slate-800"
            />
          </>
        )}

        {createTicketMutation.isError && (
          <ErrorState
            message={createTicketMutation.error instanceof Error
              ? createTicketMutation.error.message
              : "The ticket could not be created."}
          />
        )}

        <Button
          type="submit"
          loading={createTicketMutation.isPending}
          loadingText="Creating ticket…"
          className="min-h-12 px-6 py-3"
        >
          Create ticket
        </Button>
      </form>
    </section>
  );
}
