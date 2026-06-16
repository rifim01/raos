import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import GeofenceClient from "@/components/geofence/GeofenceClient";

export const dynamic = "force-dynamic";

export default async function GeofencePage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: airports } = await supabase
    .from("airports")
    .select("id, code, name, city, latitude, longitude, radius_meter")
    .in("code", ["DJB001", "PKU001", "BTH001", "BPN001", "MDC001", "UPG001"])
    .order("code");

  const canEdit = user ? hasMinRole(user, "DIRECTOR") : false;

  return <GeofenceClient airports={airports ?? []} canEdit={canEdit} />;
}
