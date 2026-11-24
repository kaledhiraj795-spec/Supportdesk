import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode
} from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  helperText?: ReactNode;
  error?: string;
  trailingAdornment?: ReactNode;
  wrapperClassName?: string;
  labelClassName?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    label,
    helperText,
    error,
    trailingAdornment,
    required,
    className = "",
    wrapperClassName = "",
    labelClassName = "",
    "aria-describedby": ariaDescribedBy,
    "aria-invalid": ariaInvalid,
    ...props
  },
  ref
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const helperId = helperText ? `${inputId}-helper` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [ariaDescribedBy, helperId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={wrapperClassName}>
      <label htmlFor={inputId} className={`mb-1.5 block text-sm font-medium text-slate-700 ${labelClassName}`}>
        {label}
      </label>
      <div className="relative">
        <input
          {...props}
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={describedBy}
          className={`block min-h-11 w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
            error ? "border-red-500" : "border-slate-300"
          } ${className}`}
        />
        {trailingAdornment}
      </div>
      {helperText && <p id={helperId} className="mt-1 text-xs text-slate-500">{helperText}</p>}
      {error && <p id={errorId} role="alert" className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  );
});
