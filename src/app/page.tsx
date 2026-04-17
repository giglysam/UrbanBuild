import Link from "next/link";
import { ArrowRight, BarChart3, Box, Compass } from "lucide-react";

import { LandingHeader } from "@/components/landing-header";
import { LandingHero3DLoader } from "@/components/landing-hero-3d-loader";
import { LandingInteractiveStrip } from "@/components/landing-interactive-strip";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Box,
    title: "3D visualization",
    description:
      "Spatial context for corridors, districts, and parcels — rotate and explore study geometry before you commit to a scenario.",
  },
  {
    icon: BarChart3,
    title: "Data-driven insights",
    description:
      "OSM-backed metrics with explicit confidence, so planners and architects see the signal behind every indicator.",
  },
  {
    icon: Compass,
    title: "Custom planning",
    description:
      "Briefs, comparisons, and exports tuned to your project — saved workspaces, versions, and chat threads in one flow.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-foreground">
      <LandingHeader />

      <main>
        <section className="relative overflow-hidden border-b border-white/[0.06]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-10%,color-mix(in_srgb,var(--primary)_22%,transparent),transparent)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03)_0%,transparent_35%)]" />

          <div className="relative mx-auto grid max-w-6xl gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-2 md:items-center md:gap-14 md:pb-24 md:pt-16">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#c4b8c8]">Urban intelligence</p>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-tight text-balance text-foreground md:text-5xl lg:text-[3.35rem]">
                Plan cities with clarity, depth, and control
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-muted-foreground">
                UrbanBuild fuses maps, structured analysis, and AI assistance into one premium workspace — built for
                teams who need defensible narratives, not generic blurbs.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg" variant="glossy" className="gap-2 px-7">
                  <Link href="/signup">
                    Start a project <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-white/[0.04] shadow-none backdrop-blur-sm hover:bg-white/[0.09]"
                >
                  <Link href="/demo">Open map demo</Link>
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal delayMs={120} className="md:justify-self-end">
              <LandingHero3DLoader />
            </ScrollReveal>
          </div>
        </section>

        <section id="features" className="scroll-mt-24 border-b border-white/[0.06] bg-[#111111] py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <ScrollReveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9a8fa0]">Capabilities</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance md:text-4xl">
                Built for serious urban work
              </h2>
              <p className="mt-4 max-w-2xl text-muted-foreground">
                From first sketch to council-ready outputs — every surface is tuned for focus, contrast, and calm
                motion.
              </p>
            </ScrollReveal>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item, i) => {
                const Icon = item.icon;
                return (
                  <ScrollReveal key={item.title} delayMs={80 * i} className="h-full">
                    <Card className="group h-full border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent shadow-[0_16px_48px_rgba(0,0,0,0.35)] transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-[#6b5c6f]/35 hover:shadow-[0_22px_56px_rgba(107,92,111,0.18)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                      <CardHeader className="gap-4 p-6">
                        <span className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[#d4cad8] shadow-inner transition-colors group-hover:border-[#6b5c6f]/40 group-hover:text-[#ece6ef]">
                          <Icon className="size-6" aria-hidden />
                        </span>
                        <CardTitle className="text-xl font-semibold tracking-tight">{item.title}</CardTitle>
                        <CardDescription className="text-base leading-relaxed text-muted-foreground">
                          {item.description}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-white/[0.06] py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <ScrollReveal>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Try the controls</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Micro-interactions preview how buffers and modes feel in the full workspace.
              </p>
            </ScrollReveal>
            <div className="mt-10">
              <ScrollReveal delayMs={100}>
                <LandingInteractiveStrip />
              </ScrollReveal>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <ScrollReveal>
              <div className="relative overflow-hidden rounded-3xl border border-white/[0.1] bg-gradient-to-br from-[#6b5c6f]/25 via-[#111111] to-[#0a0a0a] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.55)] sm:p-10 md:p-12">
                <div className="pointer-events-none absolute -right-20 -top-20 size-64 rounded-full bg-[#6b5c6f]/20 blur-3xl" />
                <div className="relative max-w-2xl">
                  <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Ready when your site is</h2>
                  <p className="mt-3 text-muted-foreground">
                    Spin up a project, attach context, and keep every analysis run traceable — no fabricated zoning
                    without verified sources.
                  </p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Button asChild size="lg" variant="glossy">
                      <Link href="/signup">Create workspace</Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="outline"
                      className="border-white/20 bg-black/20 hover:bg-black/35"
                    >
                      <Link href="/demo">Explore demo</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-[#0a0a0a] py-10 text-center text-xs leading-relaxed text-muted-foreground">
        UrbanBuild — structured analysis; no fabricated official zoning without verified sources.
      </footer>
    </div>
  );
}
