"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Home, LayoutDashboard, LogOut, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects/new", label: "New project", icon: Plus },
];

export function AppSidebar({ email }: { email?: string }) {
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="flex w-56 flex-col border-r bg-card/50">
      <Link
        href="/"
        className="flex items-center gap-2 border-b px-4 py-4 transition-colors hover:bg-muted/50"
      >
        <Building2 className="size-5 text-primary" aria-hidden />
        <div className="font-semibold tracking-tight">UrbanBuild</div>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        <div className="mb-2 truncate">{email ?? "Signed in"}</div>
        <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={() => void signOut()}>
          <LogOut className="size-3.5" aria-hidden />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
