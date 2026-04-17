"use client";

import Link from "next/link";
import { Building2, ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export function LandingHeader() {
  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b border-white/[0.06] transition-[background-color,box-shadow] duration-300",
        "bg-[#0a0a0a]/75 shadow-[0_1px_0_rgba(255,255,255,0.04)_inset] backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-[#0a0a0a]/55",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
        <Link href="/" className="group flex items-center gap-2.5 font-semibold tracking-tight text-foreground">
          <span className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-b from-white/12 to-white/[0.04] shadow-lg shadow-black/40 transition-transform group-hover:scale-[1.02]">
            <Building2 className="size-[1.15rem] text-[#c4b8c8]" aria-hidden />
          </span>
          <span className="text-[0.95rem] sm:text-base">UrbanBuild</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="hidden items-center gap-1 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground md:inline-flex"
              >
                Explore
                <ChevronDown className="size-3.5 opacity-70" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Product</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/#features">Features</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/demo">Map demo</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/signup">Create account</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/login">Sign in</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/demo"
            className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground md:hidden"
          >
            Demo
          </Link>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="hidden border-white/12 bg-white/[0.03] shadow-none backdrop-blur-sm hover:bg-white/[0.08] sm:inline-flex"
          >
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" variant="glossy" className="font-medium">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
