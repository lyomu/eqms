"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useNotifications";
import { useUiStore } from "@/stores/ui-store";

/** Shared top bar for authenticated pages: search, session context, notifications, help, and logout. */
export function Header() {
  const router = useRouter();
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const { currentUser, logout } = useAuth();
  const unread = useUnreadCount();
  const [now, setNow] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    if (profileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const initials = useMemo(() => {
    if (!currentUser?.fullName) return "?";
    return currentUser.fullName
      .split(" ")
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [currentUser?.fullName]);

  return (
    <header className="flex min-h-16 items-center gap-3 border-b border-border/80 bg-background/95 px-4 shadow-sm backdrop-blur lg:px-6">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-h3 font-bold tracking-tight text-brand-primary lg:hidden">eQMS</span>

      <form
        className="relative hidden w-full max-w-xl md:block"
        onSubmit={(event) => {
          event.preventDefault();
          const term = search.trim();
          if (term) router.push(`/search?q=${encodeURIComponent(term)}`);
        }}
      >
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search records, documents, CAPAs..."
          className="h-11 w-full rounded-full border border-border bg-muted/30 pl-12 pr-4 text-body shadow-sm outline-none transition focus:border-ring/60 focus:bg-background focus:ring-2 focus:ring-ring/20"
        />
      </form>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 text-body text-foreground/80 xl:flex">
          <UserRound className="h-4 w-4 text-brand-primary" />
          <span>{now ? formatTopbarDate(now) : ""}</span>
        </div>

        <Link
          href="/notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {!!unread.data && unread.data > 0 ? (
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-error ring-2 ring-background" />
          ) : null}
        </Link>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-3 rounded-full border border-border bg-background px-2 py-1.5 shadow-sm transition-colors hover:bg-accent/40"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-label font-semibold text-white">
              {initials}
            </span>
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-body font-semibold text-foreground">{currentUser?.fullName ?? "Account"}</p>
              <p className="truncate text-label text-muted-foreground">{roleLabel(currentUser?.authorities)}</p>
            </div>
            <ChevronDown className={`hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:block ${profileOpen ? "rotate-180" : ""}`} />
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-border bg-background shadow-lg">
              <div className="border-b border-border px-4 py-3">
                <p className="truncate text-body font-semibold text-foreground">{currentUser?.fullName ?? "Account"}</p>
                <p className="truncate text-label text-muted-foreground">{roleLabel(currentUser?.authorities)}</p>
              </div>
              <div className="py-1">
                <Link
                  href="/settings"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-body text-foreground hover:bg-accent/50 transition-colors"
                >
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                  My Profile
                </Link>
                <Link
                  href="/settings/organization"
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-body text-foreground hover:bg-accent/50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </Link>
              </div>
              <div className="border-t border-border py-1">
                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); logout.mutate(); }}
                  disabled={logout.isPending}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-body text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                >
                  <LogOut className="h-4 w-4" />
                  {logout.isPending ? "Signing out…" : "Sign Out"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function roleLabel(authorities?: string[]) {
  const values = authorities ?? [];
  if (values.some((authority) => authority === "ROLE_ADMIN" || authority === "ADMIN")) return "Administrator";
  if (values.some((authority) => authority.includes("QA"))) return "QA User";
  if (values.length > 0) {
    return values[0]
      .replace(/^ROLE_/, "")
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/\b\w/g, (match) => match.toUpperCase());
  }
  return "User";
}

function formatTopbarDate(date: Date) {
  const day = date.toLocaleDateString("en-GB", { weekday: "long" });
  const datePart = date
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
  const timePart = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${day}, ${datePart} ${timePart}`;
}
