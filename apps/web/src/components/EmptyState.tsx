type EmptyStateProps = {
  title?: string;
  description?: string;
};

export function EmptyState({
  title = "Nothing here yet",
  description = "There is no data to display right now."
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <h2 className="font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-600">{description}</p>
    </div>
  );
}
