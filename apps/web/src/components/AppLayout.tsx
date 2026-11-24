import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { clearSession, getSession, type UserRole } from "../lib/auth";
import type { TicketStatus } from "../features/tickets/api/tickets-api";

type QuickView = {
  label: string;
  statuses: readonly TicketStatus[];
  href: string;
  icon: "active" | "waiting" | "resolved";
};

const quickViews: QuickView[] = [
  {
    label: "Active / Open",
    statuses: ["open", "in_progress"],
    href: "/tickets?status=open&status=in_progress",
    icon: "active"
  },
  {
    label: "Waiting on Customer",
    statuses: ["waiting_on_customer"],
    href: "/tickets?status=waiting_on_customer",
    icon: "waiting"
  },
  {
    label: "Resolved",
    statuses: ["resolved"],
    href: "/tickets?status=resolved",
    icon: "resolved"
  }
];

const navLinkClass = (isActive: boolean) =>
  `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
    isActive
      ? "bg-indigo-50 text-indigo-800"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
  }`;

const createLinkClass = (isActive: boolean) =>
  `flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700 ${
    isActive
      ? "bg-indigo-800 text-white"
      : "bg-indigo-700 text-white shadow-sm hover:bg-indigo-800"
  }`;

const iconClassName = "size-5 shrink-0 fill-none stroke-current stroke-[1.7]";

function NavigationIcon({ name }: { name: "dashboard" | "tickets" | "create" | QuickView["icon"] }) {
  switch (name) {
    case "dashboard":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName}>
          <path d="M3.5 10.5 12 3.75l8.5 6.75v9a.75.75 0 0 1-.75.75h-5.5v-6h-4.5v6h-5.5a.75.75 0 0 1-.75-.75z" />
        </svg>
      );
    case "tickets":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName}>
          <rect x="4" y="3.5" width="16" height="17" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      );
    case "create":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "active":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "waiting":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7v5l3 2M8 3.5 5.5 6M16 3.5 18.5 6" />
        </svg>
      );
    case "resolved":
      return (
        <svg aria-hidden="true" viewBox="0 0 24 24" className={iconClassName}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="m8 12.5 2.5 2.5 5.5-6" />
        </svg>
      );
  }
}

const hasSameStatuses = (actual: string[], expected: readonly string[]) => {
  const actualStatuses = [...new Set(actual.map((status) => status.toLowerCase()))].sort();
  const expectedStatuses = [...expected].sort();
  return actualStatuses.length === expectedStatuses.length
    && actualStatuses.every((status, index) => status === expectedStatuses[index]);
};

const displayRole = (role: UserRole) =>
  role.charAt(0).toUpperCase() + role.slice(1);

const getPageTitle = (pathname: string, role: UserRole) => {
  if (pathname === "/") return "Dashboard";
  if (pathname === "/tickets") return role === "customer" ? "My Tickets" : "All Tickets";
  if (pathname === "/tickets/new") return "New Ticket";
  if (pathname.startsWith("/tickets/")) return "Ticket Details";
  return "Workspace";
};

export function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getSession()?.user;
  const role = user?.role ?? "customer";
  const pageTitle = getPageTitle(location.pathname, role);
  const ticketsLabel = role === "customer" ? "My Tickets" : "All Tickets";
  const selectedStatuses = new URLSearchParams(location.search).getAll("status");
  const activeQuickView = location.pathname === "/tickets"
    ? quickViews.find((item) => hasSameStatuses(selectedStatuses, item.statuses))
    : undefined;
  const isTicketsActive = location.pathname === "/tickets" && !activeQuickView;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [signOutModalOpen, setSignOutModalOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const initials = user?.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "U";

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    closeButtonRef.current?.focus();
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileNavOpen(false);
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = drawerRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      menuButtonRef.current?.focus();
    };
  }, [mobileNavOpen]);

  const signOut = () => {
    clearSession();
    navigate("/login", { replace: true });
  };
  const requestSignOut = () => setSignOutModalOpen(true);
  const closeMobileNav = () => setMobileNavOpen(false);

  const profileCard = () => (
    <section aria-label="User profile" className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-800">
        {initials}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-slate-950">{user?.name ?? "Account"}</span>
        <span className="mt-1 inline-flex rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-800">
          {displayRole(role)}
        </span>
      </span>
      <Button
        type="button"
        variant="text"
        size="icon"
        onClick={requestSignOut}
        aria-label="Sign out"
        title="Sign out"
        className="shrink-0 hover:bg-white"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
          <path d="M10 17l5-5-5-5M15 12H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        </svg>
      </Button>
    </section>
  );

  const sidebarNavigation = (onNavigate?: () => void) => (
    <div className="space-y-7">
      <section aria-labelledby="overview-navigation-heading">
        <h2 id="overview-navigation-heading" className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Overview
        </h2>
        <nav aria-label="Overview" className="mt-2 space-y-1">
          <Link
            to="/"
            aria-current={location.pathname === "/" ? "page" : undefined}
            className={navLinkClass(location.pathname === "/")}
            onClick={onNavigate}
          >
            <NavigationIcon name="dashboard" />
            Dashboard
          </Link>
          <Link
            to="/tickets"
            aria-current={isTicketsActive ? "page" : undefined}
            className={navLinkClass(isTicketsActive)}
            onClick={onNavigate}
          >
            <NavigationIcon name="tickets" />
            {ticketsLabel}
          </Link>
          <Link
            to="/tickets/new"
            aria-current={location.pathname === "/tickets/new" ? "page" : undefined}
            className={createLinkClass(location.pathname === "/tickets/new")}
            onClick={onNavigate}
          >
            <NavigationIcon name="create" />
            Create Ticket
          </Link>
        </nav>
      </section>

      <section aria-labelledby="quick-views-navigation-heading">
        <h2 id="quick-views-navigation-heading" className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Quick Views
        </h2>
        <nav aria-label="Quick views" className="mt-2 space-y-1">
          {quickViews.map((item) => {
            const isActive = location.pathname === "/tickets"
              && hasSameStatuses(selectedStatuses, item.statuses);
            return (
              <Link
                key={item.label}
                to={item.href}
                aria-current={isActive ? "page" : undefined}
                className={navLinkClass(isActive)}
                onClick={onNavigate}
              >
                <NavigationIcon name={item.icon} />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen bg-canvas text-slate-900">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 shadow-sm lg:flex">
        <Link to="/" className="flex items-center gap-3 rounded-xl px-2 py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
          <span aria-hidden="true" className="grid size-10 place-items-center rounded-xl bg-indigo-700 text-lg font-bold text-white shadow-sm">S</span>
          <span>
            <span className="block font-semibold tracking-tight text-slate-950">SupportDesk</span>
            <span className="block text-xs text-slate-500">Support workspace</span>
          </span>
        </Link>

        <div className="mt-8">{sidebarNavigation()}</div>
        <div className="mt-auto pt-6">{profileCard()}</div>
      </aside>

      <div className="min-h-screen min-w-0 bg-slate-50 lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6 lg:px-8">
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 lg:hidden">
              <Button
                ref={menuButtonRef}
                type="button"
                variant="secondary"
                size="icon"
                aria-label={mobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={mobileNavOpen}
                aria-controls="mobile-navigation"
                onClick={() => setMobileNavOpen((open) => !open)}
                className="shrink-0 rounded-xl"
              >
                {mobileNavOpen ? (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                ) : (
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
                    <path d="M4 7h16M4 12h16M4 17h16" />
                  </svg>
                )}
              </Button>
              <Link to="/" className="flex min-w-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-lg bg-indigo-700 text-sm font-bold text-white">S</span>
                <span className="truncate text-sm font-semibold text-slate-950">SupportDesk</span>
              </Link>
            </div>

            <div className="hidden min-w-0 lg:block">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
                <Link to="/" className="text-slate-500 transition hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">Workspace</Link>
                <span aria-hidden="true" className="text-slate-300">/</span>
                {location.pathname.startsWith("/tickets/") && (
                  <>
                    <Link to="/tickets" className="text-slate-500 transition hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
                      {role === "customer" ? "My Tickets" : "All Tickets"}
                    </Link>
                    <span aria-hidden="true" className="text-slate-300">/</span>
                  </>
                )}
                <span aria-current="page" className="font-semibold text-slate-900">{pageTitle}</span>
              </nav>
              <p className="mt-1 text-xs text-slate-500">SupportDesk workspace</p>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800 sm:hidden">{initials}</span>
              <div className="hidden min-w-0 items-center gap-3 sm:flex">
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-800">{initials}</span>
                <span className="hidden max-w-40 truncate text-sm font-medium text-slate-700 md:block">{user?.name}</span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{displayRole(role)}</span>
              </div>
              <Button
                type="button"
                variant="text"
                onClick={requestSignOut}
                aria-label="Sign out"
                className="px-2.5 sm:border sm:border-slate-200 sm:bg-white sm:hover:bg-slate-50"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4 fill-none stroke-current stroke-2">
                  <path d="M10 17l5-5-5-5M15 12H3m9-8h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
                </svg>
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 lg:hidden">{pageTitle}</p>
        </header>

        <main className="min-w-0 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="mx-auto w-full max-w-6xl min-w-0"><Outlet /></div>
        </main>
      </div>

      <div id="mobile-navigation" className={`${mobileNavOpen ? "fixed" : "hidden"} inset-0 z-50 lg:hidden`}>
        {mobileNavOpen && (
          <>
            <div
              role="presentation"
              onClick={closeMobileNav}
              className="absolute inset-0 bg-slate-950/40"
            />
            <aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
              className="relative flex h-full w-[min(20rem,85vw)] flex-col overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3">
                <Link to="/" onClick={closeMobileNav} className="flex min-h-11 min-w-0 items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-700">
                  <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-700 text-lg font-bold text-white">S</span>
                  <span className="truncate font-semibold tracking-tight text-slate-950">SupportDesk</span>
                </Link>
                <Button
                  ref={closeButtonRef}
                  type="button"
                  variant="text"
                  size="icon"
                  aria-label="Close navigation menu"
                  onClick={closeMobileNav}
                  className="shrink-0 rounded-xl"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current stroke-2">
                    <path d="m6 6 12 12M18 6 6 18" />
                  </svg>
                </Button>
              </div>
              <div className="mt-8">{sidebarNavigation(closeMobileNav)}</div>
              <div className="mt-auto pt-6">{profileCard()}</div>
            </aside>
          </>
        )}
      </div>
      <Modal
        open={signOutModalOpen}
        onClose={() => setSignOutModalOpen(false)}
        title="Sign out?"
        description="You will need to sign in again to continue to your support workspace."
      >
        <div className="flex flex-col-reverse justify-end gap-3 sm:flex-row">
          <Button variant="secondary" onClick={() => setSignOutModalOpen(false)}>
            Stay signed in
          </Button>
          <Button variant="danger" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </Modal>
    </div>
  );
}
