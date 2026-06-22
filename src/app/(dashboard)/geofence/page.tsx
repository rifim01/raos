import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import GeofenceClient from "@/components/geofence/GeofenceClient";

export const dynamic = "force-dynamic";

export default async function GeofencePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();
  const isDirector = hasMinRole(user, "DIRECTOR");

  let q = (supabase as any)
    .from("airports")
    .select("id, code, name, city, latitude, longitude, radius_meter, radius_confirmed, status")
    .eq("status", "ACTIVE")
    .order("city");

  if (!isDirector && user.airport_id) q = q.eq("id", user.airport_id);

  const { data: airports } = await q;

  return (
    <GeofenceClient
      airports={(airports ?? []).map((a: any) => ({
        id: a.id,
        code: a.code,
        name: a.name ?? a.city,
        city: a.city,
        latitude: parseFloat(a.latitude),
        longitude: parseFloat(a.longitude),
        radius_meter: a.radius_meter,
        radius_confirmed: a.radius_confirmed ?? true,
      }))}
      canEdit={isDirector}
    />
  );
}
