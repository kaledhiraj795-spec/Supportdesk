import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "../lib/api-client";
import { login, type LoginCredentials } from "../features/auth/api/auth-api";

type LocationState = { from?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginCredentials>();

  const submit = async (credentials: LoginCredentials) => {
    setServerError("");
    try {
      await login(credentials);
      const state = location.state as LocationState | null;
      navigate(state?.from || "/tickets", { replace: true });
    } catch (error) {
      setServerError(error instanceof ApiError
        ? error.message
        : "Unable to sign in right now. Please try again.");
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-slate-50 px-4 py-10">
      <section aria-labelledby="login-title" className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
        <div className="mb-8 text-center">
          <span aria-hidden="true" className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-blue-700 text-xl font-bold text-white">S</span>
          <p className="text-sm font-semibold text-blue-700">SupportDesk</p>
          <h1 id="login-title" className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to continue to your support workspace.</p>
        </div>

        {serverError && <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{serverError}</p>}

        <form noValidate onSubmit={handleSubmit(submit)} className="space-y-5">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-200"
              {...register("email", {
                required: "Enter your email address.",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." },
                maxLength: { value: 254, message: "Email address is too long." }
              })}
            />
            {errors.email && <p id="email-error" className="mt-1 text-sm text-red-700">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-900 outline-none focus-visible:border-blue-700 focus-visible:ring-2 focus-visible:ring-blue-200"
              {...register("password", {
                required: "Enter your password.",
                maxLength: { value: 128, message: "Password is too long." }
              })}
            />
            {errors.password && <p id="password-error" className="mt-1 text-sm text-red-700">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 font-semibold text-white transition hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
