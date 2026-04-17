"use client";

import dynamic from "next/dynamic";

const LandingHero3D = dynamic(() => import("@/components/landing-hero-3d").then((m) => m.LandingHero3D), {
  ssr: false,
  loading: () => (
    <div className="flex h-[min(28rem,55vh)] min-h-[220px] items-center justify-center rounded-2xl border border-white/[0.08] bg-[#111111] md:h-[min(32rem,70vh)]">
      <div className="flex flex-col items-center gap-3">
        <span className="size-9 animate-pulse rounded-full bg-[#6b5c6f]/30 motion-reduce:animate-none" />
        <span className="text-sm text-muted-foreground">Preparing 3D scene…</span>
      </div>
    </div>
  ),
});

export function LandingHero3DLoader() {
  return <LandingHero3D />;
}
