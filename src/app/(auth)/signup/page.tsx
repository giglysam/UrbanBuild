import Link from "next/link";

import { AuthSignupForm } from "@/components/auth-signup-form";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/env/server";

export default function SignupPage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create account</CardTitle>
        <CardDescription>Start saving urban studies, briefs, and scenarios.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!supabaseReady ? <SupabaseSetupNotice showDemoLink /> : <AuthSignupForm />}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
