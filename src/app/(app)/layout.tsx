import { AppSidebar } from "@/components/app-sidebar";
import { isSupabaseConfigured } from "@/env/server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured()) {
    redirect("/login?error=config");
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
      <AppSidebar email={user.email ?? undefined} />
      <div className="flex min-h-dvh flex-1 flex-col overflow-auto">{children}</div>
    </div>
  );
}
