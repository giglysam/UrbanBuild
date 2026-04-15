import Link from "next/link";

import { AuthLoginForm } from "@/components/auth-login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your email and password to access your projects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sp.error === "config" ? (
          <p className="rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
            Configure Supabase (<code className="text-xs">NEXT_PUBLIC_SUPABASE_URL</code> and anon key) to use the
            workspace.
          </p>
        ) : null}
        <AuthLoginForm />
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="text-primary underline">
            Sign up
          </Link>
        </p>
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-muted-foreground underline">
            Forgot password
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
