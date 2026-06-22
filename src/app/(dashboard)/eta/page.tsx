import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ETAClient from "./ETAClient";

export const dynamic = "force-dynamic";

export default async function ETAPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();

  let airportFilter: string[] = [];
  if (hasMinRole(user, "DIRECTOR")) {
    const { data: ap } = await (supabase as any).from("airports").select("id, code, city, latitude, longitude, radius_meter").eq("status", "ACTIVE");
    const airports = ap ?? [];
    return <ETAClient airports={airports} userRoleLevel={user.role_level} userAirportId={user.airport_id ?? null} />;
  }

  const { data: airports } = await (supabase as any)
    .from("airports").select("id, code, city, latitude, longitude, radius_meter")
    .eq(user.airport_id ? "id" : "status", user.airport_id ?? "ACTIVE");

  const [{ data: etaList }, { data: drivers }] = await Promise.all([
    (supabase as any)
      .from("eta_records")
      .select(`
        id, jarak_km, eta_menit, eta_tiba_at, status, tiba_at, durasi_aktual_menit, created_at,
        lat_driver, lng_driver,
        driver:driver_id(id, nama, kode_driver, tipe)
      `)
      .in("status", ["ON_WAY"])
      .order("created_at", { ascending: false })
      .limit(50),
    (supabase as any)
      .from("drivers")
      .select("id, nama, kode_driver, tipe, status, airports(id, code, city)")
      .eq("status", "ACTIVE")
      .order("nama"),
  ]);

  return (
    <ETAClient
      airports={airports ?? []}
      etaList={etaList ?? []}
      drivers={drivers ?? []}
      userRoleLevel={user.role_level}
      userAirportId={user.airport_id ?? null}
    />
  );
}
