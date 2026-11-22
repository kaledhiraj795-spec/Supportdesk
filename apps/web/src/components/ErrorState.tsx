type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800"
    >
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded-lg border border-red-300 px-3 py-2 font-medium hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}
