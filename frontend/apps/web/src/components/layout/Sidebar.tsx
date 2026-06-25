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
  const settingsActive = pathname === "/settings" || pathname.startsWith("/settings/");
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const { logout } = useAuth();
  const unread = useUnreadCount();

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        "flex h-full flex-col border-r border-border/80 bg-background/95 shadow-sm backdrop-blur transition-[width] duration-200",
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
          className="ml-auto hidden rounded-sm p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:inline-flex"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>

      {/* Utility items: Search + Notifications */}
      <div className="px-2">
        <ul className="space-y-1">
          <li>
            <Link
              href="/search"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                pathname === "/search" ? "bg-accent font-semibold text-accent-foreground shadow-sm" : "text-foreground/75 hover:bg-accent/80 hover:text-accent-foreground"
              )}
            >
              <Search className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed && <span>Search</span>}
            </Link>
          </li>
          <li>
            <Link
              href="/notifications"
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === "/notifications" ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                pathname === "/notifications" ? "bg-accent font-semibold text-accent-foreground shadow-sm" : "text-foreground/75 hover:bg-accent/80 hover:text-accent-foreground"
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
                    ? "bg-accent font-semibold text-accent-foreground shadow-sm"
                    : "text-foreground/75 hover:bg-accent/80 hover:text-accent-foreground",
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

      {/* Bottom: settings + logout */}
      <div className="border-t border-border p-2">
        <ul className="space-y-1">
          <li>
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              aria-current={settingsActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                settingsActive
                  ? "bg-accent font-semibold text-accent-foreground shadow-sm"
                  : "text-foreground/75 hover:bg-accent/80 hover:text-accent-foreground"
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
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-body text-foreground/75 transition-colors hover:bg-accent/80 hover:text-accent-foreground disabled:opacity-50"
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
