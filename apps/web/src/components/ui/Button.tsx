import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "text";
export type ButtonSize = "default" | "icon";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: ReactNode;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-indigo-700 text-white shadow-sm hover:bg-indigo-800",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  danger: "bg-red-700 text-white shadow-sm hover:bg-red-800",
  text: "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
};

const sizeClasses: Record<ButtonSize, string> = {
  default: "px-4 py-2",
  icon: "size-11 p-0"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "default",
    type = "button",
    loading = false,
    loadingText = "Loading…",
    disabled,
    className = "",
    children,
    "aria-busy": ariaBusy,
    ...props
  },
  ref
) {
  return (
    <button
      {...props}
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || ariaBusy}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? loadingText : children}
    </button>
  );
});
