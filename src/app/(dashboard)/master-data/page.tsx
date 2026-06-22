import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import MasterDataClient from "./MasterDataClient";

export const dynamic = "force-dynamic";

export default async function MasterDataPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();
  const isDirector = hasMinRole(user, "DIRECTOR");

  // Filter bandara: direktur lihat semua (kecuali PLANNED), koordinator lihat bandara sendiri
  const applyAirport = (q: any) => {
    if (isDirector) return q.eq("status", "ACTIVE");
    return user.airport_id ? q.eq("id", user.airport_id).eq("status", "ACTIVE") : q.eq("id", "");
  };

  const [
    { data: airports },
    { data: staffList },
    { data: driverList },
    { data: syncLogs },
  ] = await Promise.all([
    applyAirport((supabase as any).from("airports").select("id, code, city, status")).order("city"),
    applyAirport(
      (supabase as any).from("staff")
        .select("id, staff_code, nama, jabatan, email, gaji_pokok, deposit, status, is_active, source_sheet_url, airports(id, code, city)")
    ).eq("is_active", true).order("nama"),
    applyAirport(
      (supabase as any).from("drivers")
        .select("id, driver_code, nama, driver_type, status, is_active, source_sheet_url, source_gid, airports(id, code, city)")
    ).order("nama"),
    (supabase as any)
      .from("sync_logs")
      .select("id, triggered_by, started_at, finished_at, status, total_imported, total_skipped, total_failed, details, error_message")
      .order("started_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <MasterDataClient
      airports={airports ?? []}
      staffList={staffList ?? []}
      driverList={driverList ?? []}
      syncLogs={syncLogs ?? []}
      userRoleLevel={user.role_level}
      userAirportId={user.airport_id ?? null}
    />
  );
}
