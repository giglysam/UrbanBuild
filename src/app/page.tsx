import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Building2, MapPin, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const heroImage =
  "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=2000&q=85";

const features = [
  {
    icon: MapPin,
    title: "Site intelligence",
    description: "Map-based study areas, OSM-derived metrics, and explicit confidence on every insight.",
  },
  {
    icon: Shield,
    title: "Workspace & persistence",
    description: "Supabase-backed projects, files, analysis history, brief versions, and chat threads.",
  },
  {
    icon: Building2,
    title: "Deliverables",
    description: "Planning briefs, scenario comparison, PDF export, and JSON snapshots.",
  },
] as const;

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <Building2 className="size-6 text-primary" aria-hidden />
            UrbanBuild
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link href="/demo" className="text-muted-foreground transition-colors hover:text-foreground">
              Demo
            </Link>
            <Button asChild size="sm" variant="outline">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/signup">Get started</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border/40 bg-gradient-to-b from-muted/30 via-background to-background">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--primary)_12%,transparent),transparent)]" />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-20 pt-14 md:grid-cols-2 md:items-center md:gap-16 md:pb-28 md:pt-20">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Urban planning & design</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance md:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
                AI-assisted studies for serious site and corridor work
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
                UrbanBuild combines OpenStreetMap context, structured indicators, and domain-tuned models to support
                architects, planners, and municipalities — with saved projects, briefs, scenarios, and exports.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild size="lg" className="gap-2">
                  <Link href="/signup">
                    Start a project <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/demo">Open map demo</Link>
                </Button>
              </div>
            </div>

            <figure className="relative mx-auto w-full max-w-lg md:max-w-none">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl shadow-2xl shadow-foreground/10 ring-1 ring-border/80 md:aspect-[3/4]">
                <Image
                  src={heroImage}
                  alt="Contemporary glass facade reflecting sky and neighboring structures"
                  fill
                  className="object-cover"
                  sizes="(min-width: 768px) 42vw, 100vw"
                  priority
                />
              </div>
            </figure>
          </div>
        </section>

        <section className="border-b border-border/40 bg-muted/20 py-16 md:py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Capabilities</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Built for the scale you work at</h2>
              <p className="mt-3 text-muted-foreground">
                From districts to parcels, the workspace stays legible — maps, metrics, and narrative in one place.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {features.map((item) => {
                const Icon = item.icon;
                return (
                  <Card
                    key={item.title}
                    className="border-border/80 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <CardHeader>
                      <Icon className="mb-2 size-8 text-primary" aria-hidden />
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-10 text-center text-xs leading-relaxed text-muted-foreground">
        UrbanBuild — structured analysis; no fabricated official zoning without verified sources.
      </footer>
    </div>
  );
}
