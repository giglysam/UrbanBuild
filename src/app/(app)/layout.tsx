import Link from "next/link";

import { AppSidebar } from "@/components/app-sidebar";
import { SupabaseSetupNotice } from "@/components/supabase-setup-notice";
import { isSupabaseConfigured } from "@/env/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh">
        <AppSidebar email={undefined} supabaseEnabled={false} />
        <div className="flex min-h-dvh flex-1 flex-col overflow-auto p-6 md:p-10">
          <SupabaseSetupNotice />
          <p className="mt-6 text-sm text-muted-foreground">
            Map, OSM analysis, design concepts, and browser-saved chat work on the{" "}
            <Link href="/demo" className="font-medium text-primary underline">
              public demo
            </Link>{" "}
            without Supabase.
          </p>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh">
      <AppSidebar email={user.email ?? undefined} supabaseEnabled />
      <div className="flex min-h-dvh flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}
