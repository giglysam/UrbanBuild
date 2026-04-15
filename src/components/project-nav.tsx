"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = (projectId: string) =>
  [
    { href: `/projects/${projectId}`, label: "Overview" },
    { href: `/projects/${projectId}/site`, label: "Site" },
    { href: `/projects/${projectId}/analysis`, label: "Analysis" },
    { href: `/projects/${projectId}/brief`, label: "Planning brief" },
    { href: `/projects/${projectId}/scenarios`, label: "Scenarios" },
    { href: `/projects/${projectId}/chat`, label: "Chat" },
    { href: `/projects/${projectId}/files`, label: "Files" },
    { href: `/projects/${projectId}/reports`, label: "Reports" },
    { href: `/projects/${projectId}/settings`, label: "Settings" },
  ] as const;

export function ProjectNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const items = tabs(projectId);

  return (
    <nav className="flex flex-wrap gap-1 border-b bg-background/80 px-4 py-2 text-sm">
      {items.map((t) => {
        const active =
          t.href === `/projects/${projectId}`
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(`${t.href}/`);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium transition-colors",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
