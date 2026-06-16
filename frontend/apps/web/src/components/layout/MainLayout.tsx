"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useUiStore } from "@/stores/ui-store";
import { cn } from "@/lib/utils";

/** App chrome: fixed sidebar (desktop) + mobile slide-over, header, scrollable content. */
export function MainLayout({ children }: { children: React.ReactNode }) {
  const mobileOpen = useUiStore((s) => s.mobileSidebarOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <div className="flex h-screen overflow-hidden app-surface">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>

      {/* Mobile slide-over sidebar */}
      <div
        className={cn(
          "fixed inset-0 z-40 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-black/40 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={cn(
            "absolute left-0 top-0 h-full transition-transform",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <Sidebar />
        </div>
      </div>

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
