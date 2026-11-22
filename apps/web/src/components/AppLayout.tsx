import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { clearSession, getSession } from "../lib/auth";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

export function AppLayout() {
  const navigate = useNavigate();
  const session = getSession();

  const signOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="flex w-full flex-col border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
        <div className="mb-6 flex items-center gap-3 px-2">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-blue-700 text-lg font-bold text-white">S</span>
          <div>
            <p className="font-semibold">SupportDesk</p>
            <p className="text-xs text-slate-500">Customer support</p>
          </div>
        </div>
        <nav aria-label="Main navigation" className="flex gap-2 md:flex-col">
          <NavLink to="/tickets" className={linkClass}>Tickets</NavLink>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 sm:px-8">
          <div>
            <p className="text-sm font-semibold">Support workspace</p>
            <p className="hidden text-xs text-slate-500 sm:block">Signed in as {session?.user.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-slate-600 sm:block">{session?.user.email}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Sign out
            </button>
          </div>
        </header>
        <main className="w-full flex-1 px-4 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-6xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
