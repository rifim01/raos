import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import KPIStaffClient from "./KPIStaffClient";

export const dynamic = "force-dynamic";

export default async function KPIStaffPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [{ data: kpiData }, { data: staffData }] = await Promise.all([
    (supabase as any)
      .from("kpi_staff_bulanan")
      .select(`
        id, bulan, tahun,
        target_saldo, realisasi_saldo, persen_saldo, nilai_kpi_saldo,
        driver_aktif_cabang, staff_aktif_cabang, driver_dibina,
        target_pembinaan, persen_pembinaan, nilai_kpi_pembinaan,
        skor_absensi, skor_pelayanan, skor_kerapian,
        nilai_performa, nilai_kpi_performa,
        bonus_poin, kpi_akhir, kategori, catatan,
        staff:staff_id(id, nama, staff_code, jabatan, airports(code, city))
      `)
      .eq("bulan", bulan)
      .eq("tahun", tahun)
      .order("kpi_akhir", { ascending: false }),

    (supabase as any)
      .from("staff")
      .select("id, nama, staff_code, jabatan, airports(code, city)")
      .eq("status", "ACTIVE")
      .order("nama"),
  ]);

  return (
    <KPIStaffClient
      kpiData={kpiData ?? []}
      staffData={staffData ?? []}
      bulan={bulan}
      tahun={tahun}
      userRoleLevel={user.role_level}
      userAirportCode={user.airport_code ?? null}
    />
  );
}
