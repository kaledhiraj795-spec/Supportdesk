import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError } from "../lib/api-client";
import { getSession } from "../lib/auth";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { StatusBadge, ticketStatuses, ticketStatusLabels } from "../features/tickets/components/StatusBadge";
import {
  useCreateTicketComment,
  useTicket,
  useTicketComments,
  useUpdateTicketStatus
} from "../features/tickets/hooks/useTicket";
import type { TicketStatus } from "../features/tickets/api/tickets-api";

const formatDate = (value: string | null | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
};

const ticketLoadMessage = (error: unknown) => {
  if (error instanceof ApiError && error.status === 404) return "Ticket not found or you do not have access to it.";
  if (error instanceof ApiError && error.status === 403) return "You do not have permission to view this ticket.";
  return error instanceof Error ? error.message : "Ticket could not be loaded.";
};

export function TicketDetailPage() {
  const { id = "" } = useParams();
  const sessionUser = getSession()?.user;
  const role = sessionUser?.role ?? "customer";
  const isStaff = role === "agent" || role === "admin";
  const ticketQuery = useTicket(id);
  const commentsQuery = useTicketComments(id, ticketQuery.isSuccess);
  const commentMutation = useCreateTicketComment(id);
  const statusMutation = useUpdateTicketStatus(id);
  const [commentBody, setCommentBody] = useState("");
  const [commentAttempted, setCommentAttempted] = useState(false);
  const [isInternal, setIsInternal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus | null>(null);

  if (ticketQuery.isPending) {
    return <LoadingState label="Loading ticket…" />;
  }
  if (ticketQuery.isError) {
    return (
      <div className="space-y-5">
        <Link to="/tickets" className="inline-flex rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
          ← Back to tickets
        </Link>
        <ErrorState message={ticketLoadMessage(ticketQuery.error)} onRetry={() => void ticketQuery.refetch()} />
      </div>
    );
  }

  const ticket = ticketQuery.data;
  const statusValue = selectedStatus ?? ticket.status;
  const comments = (commentsQuery.data ?? [])
    .filter((comment) => isStaff || !comment.isInternal)
    .slice()
    .sort((left, right) => {
      const leftTime = Date.parse(left.createdAt);
      const rightTime = Date.parse(right.createdAt);
      if (Number.isNaN(leftTime) || Number.isNaN(rightTime)) return 0;
      return leftTime - rightTime;
    });

  const submitComment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = commentBody.trim();
    setCommentAttempted(true);
    if (!body || commentMutation.isPending) return;
    commentMutation.mutate(
      { body, ...(isStaff ? { isInternal } : {}) },
      { onSuccess: () => setCommentBody("") }
    );
  };

  const submitStatus = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isStaff || !selectedStatus || selectedStatus === ticket.status || statusMutation.isPending) return;
    statusMutation.mutate(selectedStatus, { onSuccess: () => setSelectedStatus(null) });
  };

  return (
    <section aria-labelledby="ticket-title" className="space-y-5">
      <nav aria-label="Ticket navigation">
        <Link to="/tickets" className="inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
          ← Back to tickets
        </Link>
      </nav>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <header className="border-b border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-wide text-indigo-700">Ticket conversation</p>
            <h1 id="ticket-title" className="mt-2 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
              {ticket.title}
            </h1>
            <p className="mt-2 break-all text-xs text-slate-500">Ticket ID: {ticket.id}</p>
          </header>

          <div className="space-y-7 p-5 sm:p-7">
            <section aria-labelledby="ticket-description-title">
              <div className="mb-3">
                <h2 id="ticket-description-title" className="text-base font-semibold text-slate-900">Description</h2>
                <p className="mt-1 text-sm text-slate-500">Original request</p>
              </div>
              <p className="whitespace-pre-wrap break-words rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700 sm:p-5">
                {ticket.description || "No description provided."}
              </p>
            </section>

            <section aria-labelledby="ticket-messages-title" className="border-t border-slate-200 pt-6">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 id="ticket-messages-title" className="text-base font-semibold text-slate-900">Messages</h2>
                  <p className="mt-1 text-sm text-slate-500">Conversation history, in chronological order.</p>
                </div>
              </div>
              {commentsQuery.isPending && <LoadingState label="Loading ticket messages…" />}
              {commentsQuery.isError && (
                <ErrorState
                  message={ticketLoadMessage(commentsQuery.error)}
                  onRetry={() => void commentsQuery.refetch()}
                />
              )}
              {!commentsQuery.isPending && !commentsQuery.isError && comments.length === 0 && (
                <EmptyState title="No messages yet" description="Replies and updates for this ticket will appear here." />
              )}
              {!commentsQuery.isPending && !commentsQuery.isError && comments.length > 0 && (
                <ol aria-label="Ticket comments" className="space-y-4">
                  {comments.map((comment) => {
                    const isOwnComment = comment.authorId === sessionUser?.id;
                    const authorName = isOwnComment
                      ? "You"
                      : isStaff
                        ? "Ticket participant"
                        : "Support team";
                    const authorRole = isOwnComment
                      ? role.charAt(0).toUpperCase() + role.slice(1)
                      : !isStaff
                        ? "Support"
                        : comment.authorId === ticket.creatorId
                          ? "Ticket creator"
                          : comment.authorId === ticket.assigneeId
                            ? "Assignee"
                            : "Participant";
                    return (
                      <li key={comment.id} className={`flex ${isOwnComment ? "justify-end" : "justify-start"}`}>
                        <article className={`w-full max-w-3xl rounded-2xl border p-4 shadow-sm sm:p-5 ${
                          comment.isInternal
                            ? "border-amber-200 bg-amber-50"
                            : isOwnComment
                              ? "border-indigo-100 bg-indigo-50/70"
                              : "border-slate-200 bg-white"
                        }`}>
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-slate-900">{authorName}</p>
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium text-slate-600">
                                {authorRole}
                              </span>
                              {isStaff && !isOwnComment && (
                                <span className="text-xs text-slate-500">ID: {comment.authorId}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {isStaff && comment.isInternal && (
                                <span className="rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-900">
                                  Internal note
                                </span>
                              )}
                              <time dateTime={comment.createdAt} className="text-xs text-slate-500">
                                {formatDate(comment.createdAt)}
                              </time>
                            </div>
                          </div>
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{comment.body}</p>
                        </article>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>

            <section aria-labelledby="add-comment-title" className="border-t border-slate-200 pt-6">
              <div className="mb-4">
                <h2 id="add-comment-title" className="text-base font-semibold text-slate-900">Add a comment</h2>
                <p className="mt-1 text-sm text-slate-500">Your reply will be added to this conversation.</p>
              </div>
              <form onSubmit={submitComment} noValidate aria-busy={commentMutation.isPending} className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="space-y-1">
                  <label htmlFor="comment-body" className="block text-sm font-semibold text-slate-800">Message</label>
                  <textarea
                    id="comment-body"
                    required
                    maxLength={5000}
                    rows={4}
                    value={commentBody}
                    aria-invalid={commentAttempted && !commentBody.trim()}
                    aria-describedby={commentAttempted && !commentBody.trim()
                      ? "comment-body-help comment-body-error"
                      : "comment-body-help"}
                    onChange={(event) => setCommentBody(event.target.value)}
                    className="block w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                  />
                  <p id="comment-body-help" className="text-xs text-slate-500">Keep your message under 5,000 characters.</p>
                  {commentAttempted && !commentBody.trim() && (
                    <p id="comment-body-error" role="alert" className="text-sm text-red-700">Enter a message before submitting.</p>
                  )}
                </div>
                {isStaff && (
                  <label htmlFor="comment-internal" className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-slate-700 hover:bg-white">
                    <input
                      id="comment-internal"
                      type="checkbox"
                      checked={isInternal}
                      aria-invalid={false}
                      onChange={(event) => setIsInternal(event.target.checked)}
                      className="size-4 rounded border-slate-300 text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
                    />
                    Internal note (visible to staff only)
                  </label>
                )}
                {commentMutation.isSuccess && (
                  <p role="status" aria-live="polite" className="text-sm text-emerald-700">Comment added.</p>
                )}
                {commentMutation.isError && (
                  <p role="alert" aria-live="assertive" className="text-sm text-red-700">
                    {commentMutation.error instanceof Error ? commentMutation.error.message : "Comment could not be added."}
                  </p>
                )}
                <Button
                  type="submit"
                  loading={commentMutation.isPending}
                  loadingText="Posting…"
                  className="px-5"
                >
                  Post comment
                </Button>
              </form>
            </section>
          </div>
        </article>

        <aside aria-labelledby="ticket-properties-title" className="space-y-4 lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {isStaff && (
              <form onSubmit={submitStatus} aria-busy={statusMutation.isPending} className="space-y-3 border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
                <h2 id="ticket-status-title" className="text-sm font-semibold text-slate-900">Update status</h2>
                <div className="space-y-1">
                  <label htmlFor="ticket-status" className="sr-only">Update status</label>
                  <select
                    id="ticket-status"
                    value={statusValue}
                    aria-invalid={statusMutation.isError}
                    aria-describedby={statusMutation.isError
                      ? "ticket-status-help ticket-status-error"
                      : "ticket-status-help"}
                    disabled={statusMutation.isPending}
                    onChange={(event) => {
                      const status = ticketStatuses.find((value) => value === event.target.value);
                      setSelectedStatus(status ?? null);
                    }}
                    className="block min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {ticketStatuses.map((status) => (
                      <option key={status} value={status}>{ticketStatusLabels[status]}</option>
                    ))}
                  </select>
                  <p id="ticket-status-help" className="text-xs text-slate-500">Choose the current ticket status.</p>
                </div>
                <Button
                  type="submit"
                  disabled={!selectedStatus || selectedStatus === ticket.status || statusMutation.isPending}
                  loading={statusMutation.isPending}
                  loadingText="Updating…"
                  className="w-full"
                >
                  Update status
                </Button>
                {statusMutation.isSuccess && (
                  <p role="status" aria-live="polite" className="text-sm text-emerald-700">Ticket status updated.</p>
                )}
                {statusMutation.isError && (
                  <p id="ticket-status-error" role="alert" aria-live="assertive" className="text-sm text-red-700">
                    {statusMutation.error instanceof Error ? statusMutation.error.message : "Status could not be updated."}
                  </p>
                )}
              </form>
            )}
            <div className="p-4 sm:p-5">
              <h2 id="ticket-properties-title" className="text-base font-semibold text-slate-900">Ticket properties</h2>
              <dl className="mt-4 divide-y divide-slate-100">
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-sm text-slate-500">Status</dt>
                  <dd><StatusBadge status={ticket.status} /></dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-sm text-slate-500">Priority</dt>
                  <dd><Badge type="priority" value={ticket.priority} /></dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-3">
                  <dt className="text-sm text-slate-500">Category</dt>
                  <dd className="max-w-[60%] text-right text-sm font-medium text-slate-800">{ticket.category}</dd>
                </div>
                <div className="flex items-start justify-between gap-3 py-3">
                  <dt className="text-sm text-slate-500">Created</dt>
                  <dd className="text-right text-sm text-slate-800">{formatDate(ticket.createdAt)}</dd>
                </div>
                <div className="flex items-start justify-between gap-3 py-3">
                  <dt className="text-sm text-slate-500">Last updated</dt>
                  <dd className="text-right text-sm text-slate-800">{formatDate(ticket.updatedAt)}</dd>
                </div>
                {ticket.slaDueAt && (
                  <div className="flex items-start justify-between gap-3 py-3">
                    <dt className="text-sm text-slate-500">SLA due</dt>
                    <dd className="text-right text-sm text-slate-800">{formatDate(ticket.slaDueAt)}</dd>
                  </div>
                )}
                {isStaff && ticket.creatorId && (
                  <div className="flex items-start justify-between gap-3 py-3">
                    <dt className="text-sm text-slate-500">Ticket creator</dt>
                    <dd className="max-w-[60%] break-all text-right text-xs text-slate-700">{ticket.creatorId}</dd>
                  </div>
                )}
                {isStaff && ticket.assigneeId && (
                  <div className="flex items-start justify-between gap-3 py-3">
                    <dt className="text-sm text-slate-500">Assignee</dt>
                    <dd className="max-w-[60%] break-all text-right text-xs text-slate-700">{ticket.assigneeId}</dd>
                  </div>
                )}
              </dl>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
