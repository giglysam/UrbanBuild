import Link from "next/link";

import { AuthLoginForm } from "@/components/auth-login-form";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/env/server";

export default async function LoginPage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your email and password to access your projects.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supabaseReady ? <SupabaseSetupNotice showDemoLink /> : <AuthLoginForm />}
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Link href="/signup" className="text-primary underline">
            Sign up
          </Link>
        </p>
        {supabaseReady ? (
          <p className="text-center text-sm">
            <Link href="/forgot-password" className="text-muted-foreground underline">
              Forgot password
            </Link>
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
