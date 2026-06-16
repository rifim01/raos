import { createClient } from "@/lib/supabase/server";
import TrackingClient from "@/components/tracking/TrackingClient";

export const dynamic = "force-dynamic";

export default async function TrackingPage() {
  const supabase = await createClient();

  const [{ data: airports }, { data: locations }] = await Promise.all([
    supabase
      .from("airports")
      .select("id, code, name, city, latitude, longitude, radius_meter")
      .in("code", ["DJB001", "PKU001", "BTH001", "BPN001", "MDC001", "UPG001"])
      .order("code"),
    supabase
      .from("driver_locations")
      .select(
        "id, driver_id, latitude, longitude, speed, heading, status, airport_id, last_seen, drivers(nama, driver_code)"
      )
      .order("last_seen", { ascending: false }),
  ]);

  return (
    <TrackingClient
      airports={airports ?? []}
      initialLocations={(locations ?? []) as any}
    />
  );
}
