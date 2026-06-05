"use client";

import { Menu } from "lucide-react";
import { useUiStore } from "@/stores/ui-store";

/**
 * Mobile-only top bar (hamburger + wordmark). On desktop the light sidebar owns
 * search, navigation, and the user menu — SimplerQMS-style — so no top bar is shown.
 */
export function Header() {
  const setMobileOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:hidden">
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="rounded-sm p-1.5 text-muted-foreground hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>
      <span className="text-h3 font-bold tracking-tight text-brand-primary">eQMS</span>
    </header>
  );
}
