"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Building2, BadgeCheck, Blocks, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingScreen } from "@/components/ui/loading-spinner";
import { cn } from "@/lib/utils";
import { usePlatformAuth } from "@/hooks/usePlatformAuth";

const nav = [
  { href: "/platform/organizations", label: "Organizations", icon: Building2 },
  { href: "/platform/plans", label: "Plans", icon: BadgeCheck },
  { href: "/platform/modules", label: "Modules", icon: Blocks },
];

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentAdmin, isAuthenticated, isLoading, logout } = usePlatformAuth();

  const isLogin = pathname === "/platform/login";

  useEffect(() => {
    if (!isLogin && !isLoading && !isAuthenticated) {
      router.replace("/platform/login");
    }
  }, [isLogin, isLoading, isAuthenticated, router]);

  if (isLogin) {
    return <>{children}</>;
  }

  if (isLoading) {
    return <LoadingScreen label="Checking platform session" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background lg:block">
        <div className="flex h-16 items-center gap-2 px-4">
          <ShieldCheck className="h-6 w-6 text-brand-primary" />
          <span className="text-h3 font-bold text-brand-primary">eQMS Platform</span>
        </div>
        <nav className="px-2">
          <ul className="space-y-1">
            {nav.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-body transition-colors",
                      active ? "bg-brand-light font-medium text-brand-primary" : "text-foreground/80 hover:bg-accent"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-16 items-center gap-3 border-b border-border bg-background px-4">
          <ShieldCheck className="h-5 w-5 text-brand-primary lg:hidden" />
          <span className="text-body font-medium">Platform Control Plane</span>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-body font-medium">{currentAdmin?.fullName}</p>
              <p className="text-label text-muted-foreground">{currentAdmin?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        </header>
        <main className="p-4">{children}</main>
      </div>
    </div>
  );
}
