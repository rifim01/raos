import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardPage from "./(dashboard)/page";
import AppShell from "@/components/layout/AppShell";
import { ROLE_LABELS } from "@/lib/utils";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell
      userEmail={user.email ?? ""}
      userName={user.full_name ?? user.email ?? ""}
      userRole={ROLE_LABELS[user.role] ?? user.role}
      userRoleLevel={user.role_level}
      airportId={user.airport_id ?? undefined}
      airportCode={user.airport_code ?? undefined}
    >
      <DashboardPage />
    </AppShell>
  );
}
