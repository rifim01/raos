import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import PayrollClient from "@/components/payroll/PayrollClient";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();

  const supabase = await createClient();

  let airportId   = user.airport_id   ?? "";
  let airportCode = user.airport_code ?? "";

  // 1. Ambil data bandara acuan pertama jika diakses oleh Direksi Nasional (Role Level >= 4)
  if (!airportId && user.role_level >= 4) {
    const { data: first } = await (supabase as any)
      .from("airports").select("id, code")
      .in("code", ["DJB001","PKU001","BTH001","BPN001","MDC001","UPG001"])
      .order("code").limit(1).single();
    airportId   = first?.id   ?? "";
    airportCode = first?.code ?? "";
  }

  // 2. Proteksi (supabase as any) disuntikkan di sini untuk mengamankan relasi kompilasi data staff
  const { data: payrolls } = await (supabase as any)
    .from("payroll")
    .select("id,status,periode,gaji_pokok,bpjs,kuota,bonus,lembur,denda_telat,potongan_alpha,kasbon,deposit,total_pendapatan,total_potongan,gaji_bersih,total_hadir,total_terlambat,total_alpha,jam_lembur,staff(nama,jabatan,staff_code)")
    .eq("airport_id", airportId)
    .eq("periode_bulan", bulan)
    .eq("periode_tahun", tahun)
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Payroll</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {airportCode} · {now.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
        </p>
      </div>
      {!airportId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-yellow-800">Airport tidak dikonfigurasi</p>
        </div>
      ) : (
        <PayrollClient
          payrolls={payrolls ?? []}
          airportId={airportId}
          bulan={bulan}
          tahun={tahun}
          userRoleLevel={user.role_level}
        />
      )}
    </div>
  );
}
