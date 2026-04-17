"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const modes = ["Corridor study", "District overview", "Parcel deep-dive"] as const;

export function LandingInteractiveStrip() {
  const [radius, setRadius] = React.useState([42]);
  const [mode, setMode] = React.useState<(typeof modes)[number]>(modes[0]);

  return (
    <div className="grid gap-10 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#111111] to-[#0d0d0d] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] sm:p-8 md:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="study-radius" className="text-sm font-medium text-foreground">
            Study radius
          </Label>
          <span className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-xs text-[#c4b8c8]">
            {radius[0]}% buffer
          </span>
        </div>
        <Slider
          id="study-radius"
          value={radius}
          onValueChange={setRadius}
          max={100}
          step={1}
          className="py-1"
        />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Interactive control — in the product, buffers drive OSM fetches and scenario footprints.
        </p>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Planning mode</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-xl border border-white/12 bg-gradient-to-b from-white/[0.09] to-white/[0.02] px-4 py-3 text-left text-sm font-medium text-foreground shadow-inner shadow-white/[0.03] transition-[box-shadow,transform] hover:shadow-lg hover:shadow-[#6b5c6f]/15",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b5c6f]/50",
              )}
            >
              {mode}
              <span className="text-muted-foreground">▾</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
            {modes.map((m) => (
              <DropdownMenuItem
                key={m}
                onClick={() => setMode(m)}
                className={cn(m === mode && "bg-white/[0.06] text-[#d4cad8]")}
              >
                {m}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Modes illustrate how workflows adapt — from corridors to parcels.
        </p>
      </div>
    </div>
  );
}
