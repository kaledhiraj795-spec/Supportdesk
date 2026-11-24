import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { ApiError } from "../lib/api-client";
import { login, type LoginCredentials } from "../features/auth/api/auth-api";

type LocationState = { from?: string };

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <aside className="relative isolate flex min-h-64 flex-col justify-between overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-10 lg:min-h-screen lg:px-14 lg:py-12">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-20 -z-10 size-80 rounded-full border-[48px] border-indigo-700/40" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-32 -z-10 size-96 rounded-full bg-indigo-700/30 blur-2xl" />
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="grid size-11 place-items-center rounded-xl bg-white/10 text-xl font-bold ring-1 ring-white/20">S</span>
          <div>
            <p className="font-semibold tracking-wide">SupportDesk</p>
            <p className="text-xs text-indigo-200">Support workspace</p>
          </div>
        </div>
        <div className="max-w-xl py-10 lg:py-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-300">Customer support, connected</p>
          <h2 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">A clearer view of every conversation.</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-indigo-100">
            Sign in to view the support tickets available to your account and continue where you left off.
          </p>
        </div>
        <p className="hidden text-sm text-indigo-300 lg:block">SupportDesk workspace</p>
      </aside>

      <section aria-labelledby="login-title" className="flex min-h-[calc(100vh-16rem)] items-center justify-center bg-slate-50 px-4 py-10 sm:px-8 lg:min-h-screen lg:px-12">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold text-indigo-700">Welcome back</p>
            <h1 id="login-title" className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Sign in to your account</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">Enter your credentials to open your support workspace.</p>
          </div>

          {serverError && <p role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-5 text-red-800">{serverError}</p>}

          <form noValidate onSubmit={handleSubmit(submit)} aria-busy={isSubmitting} className="space-y-5">
            <Input
              id="email"
              label="Email address"
              type="email"
              autoComplete="email"
              required
              error={errors.email?.message}
              className="rounded-xl bg-white py-2.5 outline-none transition focus-visible:border-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-200"
              {...register("email", {
                required: "Enter your email address.",
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email address." },
                maxLength: { value: 254, message: "Email address is too long." }
              })}
            />

            <Input
              id="password"
              label="Password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              error={errors.password?.message}
              className="rounded-xl bg-white py-2.5 pr-20 outline-none transition focus-visible:border-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-200"
              trailingAdornment={
                <Button
                  type="button"
                  variant="text"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-indigo-700 hover:bg-indigo-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              }
              {...register("password", {
                required: "Enter your password.",
                maxLength: { value: 128, message: "Password is too long." }
              })}
            />

            <Button
              type="submit"
              loading={isSubmitting}
              loadingText="Signing in…"
              className="min-h-12 w-full rounded-xl py-3"
            >
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}
