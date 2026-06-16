import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { getCommandCenterStats, getRecentAlerts } from "@/lib/alert-engine";
import DirectorCCClient from "./DirectorCCClient";

export const dynamic = "force-dynamic";

export default async function DirectorCommandCenterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "DIRECTOR")) redirect("/");

  const [airports, alerts] = await Promise.all([
    getCommandCenterStats(),
    getRecentAlerts(30),
  ]);

  return <DirectorCCClient initialAirports={airports} initialAlerts={alerts} />;
}
