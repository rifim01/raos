import { redirect } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { ROLE_LABELS } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      userEmail={user.email ?? ""}
      userName={user.full_name ?? user.email ?? ""}
      userRole={ROLE_LABELS[user.role] ?? user.role}
      userRoleLevel={user.role_level}
      airportId={user.airport_id}
      airportCode={user.airport_code}
    >
      {children}
    </AppShell>
  );
}
