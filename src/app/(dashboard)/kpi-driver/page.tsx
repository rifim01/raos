import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import KPIDriverClient from "./KPIDriverClient";

export const dynamic = "force-dynamic";

export default async function KPIDriverPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  let airportFilter: string[] = [];
  if (hasMinRole(user, "DIRECTOR")) {
    const { data: airports } = await (supabase as any)
      .from("airports").select("id").eq("status", "ACTIVE");
    airportFilter = (airports ?? []).map((a: any) => a.id);
  } else if (user.airport_id) {
    airportFilter = [user.airport_id];
  }

  const applyAirport = (q: any) =>
    airportFilter.length === 1
      ? q.eq("airport_id", airportFilter[0])
      : airportFilter.length > 1
      ? q.in("airport_id", airportFilter)
      : q;

  const [{ data: kpiData }, { data: driverData }] = await Promise.all([
    applyAirport(
      (supabase as any)
        .from("kpi_driver_bulanan")
        .select(`
          id, bulan, tahun,
          total_hari_kerja, total_hadir, skor_absensi, nilai_absensi,
          total_panggilan, total_hadir_panggil, skor_compliance, nilai_compliance,
          target_pickup, realisasi_pickup, skor_pickup, nilai_pickup,
          target_menit_respons, rata_menit_respons, skor_respons, nilai_respons,
          jumlah_pelanggaran, potongan_pelanggaran,
          kpi_akhir, kategori, catatan,
          driver:driver_id(id, nama, kode_driver, tipe, airports(code, city))
        `)
        .eq("bulan", bulan)
        .eq("tahun", tahun)
        .order("kpi_akhir", { ascending: false })
    ),
    applyAirport(
      (supabase as any)
        .from("drivers")
        .select("id, nama, kode_driver, tipe, status, airports(code, city)")
        .eq("status", "ACTIVE")
        .order("nama")
    ),
  ]);

  return (
    <KPIDriverClient
      kpiData={kpiData ?? []}
      driverData={driverData ?? []}
      bulan={bulan}
      tahun={tahun}
      userRoleLevel={user.role_level}
      userAirportCode={user.airport_code ?? null}
    />
  );
}
