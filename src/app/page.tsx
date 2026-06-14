import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardPage from "./(dashboard)/page";
import AppShell from "@/components/layout/AppShell";
import { ROLE_LABELS } from "@/lib/utils";

// Root page shows dashboard when logged in, redirects to login if not
export default async function RootPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: rawProfile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();
  const profile = rawProfile as { full_name: string | null; role: string | null } | null;

  return (
    <AppShell
      userEmail={user.email ?? ""}
      userName={profile?.full_name ?? user.email ?? ""}
      userRole={ROLE_LABELS[profile?.role ?? ""] ?? profile?.role ?? ""}
    >
      <DashboardPage />
    </AppShell>
  );
}
