import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import KPIBranchClient from "./KPIBranchClient";

export const dynamic = "force-dynamic";

export default async function KPIBranchPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "DIRECTOR")) redirect("/");

  const supabase = await createClient();
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const [{ data: kpiData }, { data: airports }] = await Promise.all([
    (supabase as any)
      .from("kpi_branch_bulanan")
      .select(`
        id, bulan, tahun,
        total_driver, driver_aktif, persen_driver_aktif, nilai_driver,
        total_saldo, target_saldo, persen_saldo, nilai_saldo,
        total_pickup, target_pickup, persen_pickup, nilai_pickup,
        skor_ketepatan, nilai_ketepatan,
        jumlah_komplain, nilai_komplain,
        kpi_akhir, kategori, catatan,
        airport:airport_id(id, code, city, latitude, longitude)
      `)
      .eq("bulan", bulan)
      .eq("tahun", tahun)
      .order("kpi_akhir", { ascending: false }),
    (supabase as any)
      .from("airports")
      .select("id, code, city")
      .eq("status", "ACTIVE")
      .order("city"),
  ]);

  return (
    <KPIBranchClient
      kpiData={kpiData ?? []}
      airports={airports ?? []}
      bulan={bulan}
      tahun={tahun}
      userRoleLevel={user.role_level}
    />
  );
}
