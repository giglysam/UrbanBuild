import Link from "next/link";

import { SUPABASE_NOT_CONFIGURED_ERROR, SUPABASE_FEATURE_FALLBACK } from "@/lib/supabase/config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SupabaseSetupNoticeProps = {
  title?: string;
  showDemoLink?: boolean;
};

export function SupabaseSetupNotice({
  title = "Supabase is not configured",
  showDemoLink = true,
}: SupabaseSetupNoticeProps) {
  const lines = SUPABASE_NOT_CONFIGURED_ERROR.split("\n").filter(Boolean);

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>{SUPABASE_FEATURE_FALLBACK}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <pre className="overflow-x-auto whitespace-pre-wrap rounded-md border bg-muted/60 p-4 font-mono text-xs leading-relaxed">
          {lines.join("\n")}
        </pre>
        <p className="text-sm text-muted-foreground">
          Get values from your{" "}
          <a
            href="https://supabase.com/dashboard/project/_/settings/api"
            className="text-primary underline"
            target="_blank"
            rel="noreferrer"
          >
            Supabase project API settings
          </a>
          . Copy <code className="rounded bg-muted px-1">.env.example</code> to{" "}
          <code className="rounded bg-muted px-1">.env.local</code> and fill in the keys.
        </p>
        {showDemoLink ? (
          <Button asChild variant="secondary" size="sm">
            <Link href="/demo">Use the demo without Supabase</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Inline message for buttons / sidebars when a feature needs Supabase. */
export function SupabaseFeatureFallback({ compact }: { compact?: boolean }) {
  if (compact) {
    return (
      <p className="max-w-xs text-xs text-muted-foreground" title={SUPABASE_NOT_CONFIGURED_ERROR}>
        {SUPABASE_FEATURE_FALLBACK}
      </p>
    );
  }
  return <SupabaseSetupNotice showDemoLink={false} />;
}
