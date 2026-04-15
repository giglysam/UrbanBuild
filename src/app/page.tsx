import Link from "next/link";
import { ArrowRight, Building2, MapPin, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-background to-muted/40">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-semibold tracking-tight">
          <Building2 className="size-6 text-primary" aria-hidden />
          UrbanBuild
        </div>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/demo" className="text-muted-foreground hover:text-foreground">
            Demo
          </Link>
          <Button asChild size="sm" variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-24 pt-12 md:pt-20">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-widest text-primary">Urban planning & design</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">
            AI-assisted studies for serious site and corridor work
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            UrbanBuild combines OpenStreetMap context, structured indicators, and domain-tuned models to support architects,
            planners, and municipalities — with saved projects, briefs, scenarios, and exports.
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

        <div className="mt-20 grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <MapPin className="mb-2 size-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Site intelligence</CardTitle>
              <CardDescription>
                Map-based study areas, OSM-derived metrics, and explicit confidence on every insight.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Shield className="mb-2 size-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Workspace & persistence</CardTitle>
              <CardDescription>
                Supabase-backed projects, files, analysis history, brief versions, and chat threads.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <Building2 className="mb-2 size-8 text-primary" aria-hidden />
              <CardTitle className="text-lg">Deliverables</CardTitle>
              <CardDescription>Planning briefs, scenario comparison, PDF export, and JSON snapshots.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        UrbanBuild — structured analysis; no fabricated official zoning without verified sources.
      </footer>
    </div>
  );
}
