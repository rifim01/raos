import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { getCommandCenterStats } from "@/lib/alert-engine";
import TvModeClient from "./TvModeClient";

export const dynamic = "force-dynamic";

export default async function TvModePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const airports = await getCommandCenterStats();

  return <TvModeClient initialAirports={airports} />;
}
