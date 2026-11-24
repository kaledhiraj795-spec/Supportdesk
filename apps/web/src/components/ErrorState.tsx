import { Button } from "./ui/Button";

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
        <Button
          variant="secondary"
          type="button"
          onClick={onRetry}
          className="mt-4 border-red-300 text-red-800 hover:bg-red-100 focus-visible:outline-red-700"
        >
          Try again
        </Button>
      )}
    </div>
  );
}
