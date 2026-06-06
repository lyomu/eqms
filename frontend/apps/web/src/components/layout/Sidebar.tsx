"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Bell,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";
import { useAuth } from "@/hooks/useAuth";
import { useUnreadCount } from "@/hooks/useNotifications";
import { NAV_GROUPS } from "./nav-config";

/**
 * Light, SimplerQMS-style left navigation:
 *  - top: brand wordmark + collapse toggle, then Search / Notifications
 *  - middle: "Workspace" nav groups
 *  - bottom: user identity, Settings, Logout
 *
 * Collapses to an icon rail on desktop (UI store) and renders inside a slide-over on
 * mobile (frontend rule 8 — responsive).
 */
export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const { currentUser, logout } = useAuth();
  const unread = useUnreadCount();
  const isOrgAdmin = currentUser?.authorities.some(
    (authority) => authority === "ROLE_ADMIN" || authority === "ADMIN"
  );

  const initials = currentUser?.fullName
    ? currentUser.fullName
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "flex h-full flex-col border-r border-border bg-background transition-[width] duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand + collapse */}
      <div className="flex h-16 items-center gap-2 px-4">
        {!collapsed && (
          <span className="text-h3 font-bold tracking-tight text-brand-primary">eQMS</span>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="ml-auto hidden rounded-sm p-1.5 text-muted-foreground hover:bg-accent lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Utility items: Search + Notifications (placeholders until their milestones) */}
      <div className="px-2">
        <ul className="space-y-1">
          <li>
            <span
              className={cn(
                "flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-body text-muted-foreground opacity-60"
              )}
              aria-disabled="true"
              title="Search (coming soon)"
            >
              <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Search</span>}
            </span>
          </li>
          <li>
            <Link
              href="/notifications"
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === "/notifications" ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                pathname === "/notifications" ? "bg-brand-light font-medium text-brand-primary" : "text-foreground/80 hover:bg-accent"
              )}
            >
              <Bell className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Notifications</span>}
              {!!unread.data && unread.data > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-error px-1.5 text-[11px] font-medium text-white">
                  {unread.data > 99 ? "99+" : unread.data}
                </span>
              )}
            </Link>
          </li>
        </ul>
      </div>

      {/* Workspace nav */}
      <div className="mt-2 flex-1 overflow-y-auto px-2 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="mb-4">
            {!collapsed && (
              <p className="px-3 pb-1 text-label uppercase tracking-wide text-muted-foreground/70">
                {group.heading}
              </p>
            )}
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                const content = (
                  <>
                    <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.comingSoon && (
                      <span className="ml-auto rounded-sm bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                        Soon
                      </span>
                    )}
                  </>
                );

                const baseClasses = cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                  active
                    ? "bg-brand-light font-medium text-brand-primary"
                    : "text-foreground/80 hover:bg-accent",
                  item.comingSoon && "cursor-not-allowed opacity-50 hover:bg-transparent"
                );

                return (
                  <li key={item.href}>
                    {item.comingSoon ? (
                      <span className={baseClasses} aria-disabled="true" title="Coming soon">
                        {content}
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        className={baseClasses}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                      >
                        {content}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom: user + settings + logout */}
      <div className="border-t border-border p-2">
        <div className={cn("flex items-center gap-2 px-2 py-2", collapsed && "justify-center")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary text-label font-medium text-white">
            {initials}
          </span>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-body font-medium">{currentUser?.fullName ?? "Account"}</p>
              <p className="truncate text-label text-muted-foreground">{currentUser?.email}</p>
            </div>
          )}
        </div>
        <ul className="space-y-1">
          {isOrgAdmin && (
            <li>
              <Link
                href="/admin/settings"
                onClick={() => setMobileOpen(false)}
                aria-current={pathname === "/admin/settings" ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                  pathname.startsWith("/admin/settings")
                    ? "bg-brand-light font-medium text-brand-primary"
                    : "text-foreground/80 hover:bg-accent"
                )}
              >
                <ShieldCheck className="h-5 w-5 shrink-0" aria-hidden="true" />
                {!collapsed && <span>Organization Admin</span>}
              </Link>
            </li>
          )}
          <li>
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === "/settings" ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                pathname === "/settings"
                  ? "bg-brand-light font-medium text-brand-primary"
                  : "text-foreground/80 hover:bg-accent"
              )}
            >
              <Settings className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Settings</span>}
            </Link>
          </li>
          <li>
            <button
              type="button"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body text-foreground/80 transition-colors hover:bg-accent disabled:opacity-50"
            >
              <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>{logout.isPending ? "Signing out…" : "Logout"}</span>}
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
