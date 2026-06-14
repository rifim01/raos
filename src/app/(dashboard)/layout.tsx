import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { ROLE_LABELS } from "@/lib/utils";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <AppShell
      userEmail={user.email}
      userName={profile?.full_name ?? user.email}
      userRole={ROLE_LABELS[profile?.role ?? ""] ?? profile?.role}
    >
      {children}
    </AppShell>
  );
}
