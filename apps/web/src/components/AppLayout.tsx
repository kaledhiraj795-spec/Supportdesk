import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { clearSession, getSession, type UserRole } from "../lib/auth";

type NavigationItem = {
  label: string;
  to: string;
};

const navigationByRole: Record<UserRole, NavigationItem[]> = {
  customer: [
    { label: "Dashboard", to: "/" },
    { label: "My Tickets", to: "/tickets" }
  ],
  agent: [
    { label: "Dashboard", to: "/" },
    { label: "All Tickets", to: "/tickets" }
  ],
  admin: [
    { label: "Dashboard", to: "/" },
    { label: "All Tickets", to: "/tickets" }
  ]
};

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition ${
    isActive
      ? "bg-indigo-50 text-indigo-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;

const displayRole = (role: UserRole) =>
  role.charAt(0).toUpperCase() + role.slice(1);

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getSession()?.user;
  const role = user?.role ?? "customer";
  const currentPage = location.pathname === "/tickets" ? "Tickets" : "Dashboard";
  const initials = user?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  const signOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 md:flex">
      <aside className="flex w-full flex-col border-b border-slate-200 bg-white p-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r md:p-5">
        <Link to="/" className="mb-6 flex items-center gap-3 px-2">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-lg font-bold text-white">S</span>
          <span>
            <span className="block font-semibold">SupportDesk</span>
            <span className="block text-xs text-slate-500">Support workspace</span>
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex gap-2 md:flex-col">
          {navigationByRole[role].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className={linkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 border-t border-slate-200 pt-4 md:mt-auto">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-800">
              {initials}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-slate-900">{user?.name ?? "Account"}</span>
              <span className="block truncate text-xs text-slate-500">{user?.email}</span>
              <span className="mt-1 block text-xs font-medium text-indigo-700">{displayRole(role)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700"
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3 sm:px-8">
          <div>
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-slate-500 hover:text-indigo-700">Workspace</Link>
              <span aria-hidden="true" className="text-slate-400">/</span>
              <span aria-current="page" className="font-semibold text-slate-900">{currentPage}</span>
            </nav>
            <p className="mt-1 text-xs text-slate-500">SupportDesk workspace</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-sm text-slate-600 sm:block">{user?.name}</span>
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800">
              {displayRole(role)}
            </span>
          </div>
        </header>
        <main className="w-full flex-1 px-4 py-8 sm:px-8">
          <div className="mx-auto w-full max-w-6xl"><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
