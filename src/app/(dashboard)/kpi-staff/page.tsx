import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import KPIStaffClient from "./KPIStaffClient";

export const dynamic = "force-dynamic";

export default async function KPIStaffPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await (supabase as any)
    .from("users")
    .select("id, role_id, airport_id, full_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!me) redirect("/login");

  const isDirector    = me.role_id <= 2;
  const isCoordinator = me.role_id === 3;
  const isStaff       = me.role_id === 4;

  if (!isDirector && !isCoordinator && !isStaff) redirect("/");

  // Active airports for KPI scope (Batam, Jambi, Pekanbaru, Balikpapan, Manado)
  const { data: airports } = await (supabase as any)
    .from("airports")
    .select("id, code, name, city")
    .eq("status", "ACTIVE")
    .neq("code", "UPG001")
    .order("city");

  // Staff list — live from DB
  let staffQ = (supabase as any)
    .from("staff")
    .select("id, staff_code, nama, jabatan, airport_id, is_active")
    .eq("is_active", true)
    .order("nama");
  if (!isDirector) staffQ = staffQ.eq("airport_id", me.airport_id);
  const { data: staffList } = await staffQ;

  // Driver counts per airport (for info display)
  const { data: driverRows } = await (supabase as any)
    .from("drivers")
    .select("airport_id")
    .eq("is_active", true);

  // KPI records
  const now = new Date();
  let kpiQ = (supabase as any)
    .from("kpi_staff_bulanan")
    .select(`
      id, staff_id, airport_id, bulan, tahun,
      target_saldo, realisasi_saldo, persen_saldo, nilai_kpi_saldo,
      driver_aktif_cabang, staff_aktif_cabang, driver_dibina,
      target_pembinaan, persen_pembinaan, nilai_kpi_pembinaan,
      skor_absensi, skor_pelayanan, skor_kerapian,
      nilai_performa, nilai_kpi_performa,
      bonus_poin, kpi_akhir, kategori, catatan,
      input_by, created_at, updated_at
    `)
    .gte("tahun", now.getFullYear() - 1)
    .order("tahun", { ascending: false })
    .order("bulan", { ascending: false })
    .order("kpi_akhir", { ascending: false });

  if (isStaff) {
    const myStaff = (staffList || []).find((s: any) => s.airport_id === me.airport_id);
    if (myStaff) kpiQ = kpiQ.eq("staff_id", myStaff.id);
  } else if (isCoordinator) {
    const ids = (staffList || []).map((s: any) => s.id);
    if (ids.length) kpiQ = kpiQ.in("staff_id", ids);
  }

  const { data: kpiRecords } = await kpiQ;

  return (
    <KPIStaffClient
      airports={airports || []}
      staffList={staffList || []}
      driverRows={driverRows || []}
      kpiRecords={kpiRecords || []}
      me={me}
      isDirector={isDirector}
      isCoordinator={isCoordinator}
      isStaff={isStaff}
      currentBulan={now.getMonth() + 1}
      currentTahun={now.getFullYear()}
    />
  );
}
