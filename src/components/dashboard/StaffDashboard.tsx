import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/auth";
import Link from "next/link";

interface StaffDashboardProps {
  user: UserProfile;
}

export default async function StaffDashboard({ user }: StaffDashboardProps) {
  const supabase = await createClient();

  const { data: staffRecord } = await (supabase as any)
    .from("staff")
    .select("id, nama, jabatan, gaji_pokok, staff_code, airport_id, airports(code, city)")
    .eq("user_id", user.id)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  let attendanceToday: any[] = [];
  let attendanceCount = 0;
  let lateCount = 0;
  let payrollThisMonth: any = null;
  let recentPayroll: any[] = [];

  if (staffRecord) {
    const [{ data: todayAtt }, { count: hadir }, { count: telat }, { data: payroll }, { data: allPayroll }] =
      await Promise.all([
        supabase.from("attendance").select("*").eq("staff_id", staffRecord.id).eq("tanggal", today).order("created_at"),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("staff_id", staffRecord.id),
        supabase.from("attendance").select("*", { count: "exact", head: true }).eq("staff_id", staffRecord.id),
        (supabase as any).from("payroll").select("*").eq("staff_id", staffRecord.id).like("periode", `${thisMonth}%`).single(),
        (supabase as any).from("payroll").select("periode, gaji_bersih, status").eq("staff_id", staffRecord.id).order("created_at", { ascending: false }).limit(6),
      ]);

    attendanceToday = todayAtt ?? [];
    attendanceCount = hadir ?? 0;
    lateCount = telat ?? 0;
    payrollThisMonth = payroll ?? null;
    recentPayroll = allPayroll ?? [];
  }

  const airport = (staffRecord as any)?.airports as { code: string; city: string } | null;

  function fmt(n: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
  }

  const checkIn = attendanceToday.find((a) => a.check_type === "CHECK_IN");
  const checkOut = attendanceToday.find((a) => a.check_type === "CHECK_OUT");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          Selamat Datang, {user.full_name?.split(" ")[0] ?? "Staff"} 👋
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {!staffRecord ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-yellow-800">Profil belum terhubung</p>
          <p className="text-sm text-yellow-600 mt-1">Hubungi Admin untuk menghubungkan akun dengan data staff.</p>
        </div>
      ) : (
        <>
          {/* Profile card */}
          <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-rifim flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {(staffRecord.nama ?? "S")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg text-gray-800 truncate">{staffRecord.nama}</p>
              <p className="text-sm text-gray-500">{staffRecord.jabatan} · {staffRecord.staff_code}</p>
              <p className="text-xs text-gray-400 mt-0.5">{airport?.city} ({airport?.code})</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400">Gaji Pokok</p>
              <p className="font-bold text-gray-800">{fmt(Number(staffRecord.gaji_pokok ?? 0))}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Absensi Hari Ini", value: checkIn ? "✓ Hadir" : "— Belum", color: checkIn ? "text-green-700" : "text-gray-400", bg: checkIn ? "bg-green-50" : "bg-gray-50" },
              { label: "Total Hadir", value: attendanceCount, color: "text-blue-700", bg: "bg-blue-50" },
              { label: "Terlambat", value: lateCount, color: "text-orange-700", bg: "bg-orange-50" },
              { label: "Payroll Bulan Ini", value: payrollThisMonth ? fmt(Number(payrollThisMonth.gaji_bersih)) : "—", color: "text-purple-700", bg: "bg-purple-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <p className={`text-lg font-black ${s.color} leading-tight`}>{s.value}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Absensi hari ini */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4">Absensi Hari Ini</h3>
              <div className="space-y-3">
                {[
                  { label: "Check In", record: checkIn, color: "bg-green-500" },
                  { label: "Check Out", record: checkOut, color: "bg-orange-500" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${item.record ? item.color : "bg-gray-200"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                      {item.record ? (
                        <p className="text-xs text-gray-500">
                          {new Date(item.record.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-300">Belum diabsen</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/attendance" className="mt-4 block text-center text-xs text-blue-600 hover:underline">
                Riwayat Absensi →
              </Link>
            </div>

            {/* Payroll history */}
            <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4">Riwayat Payroll</h3>
              {recentPayroll.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Belum ada data payroll</p>
              ) : (
                <div className="space-y-2">
                  {recentPayroll.map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <p className="text-sm font-medium text-gray-700">{p.periode}</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          p.status === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>{p.status}</span>
                        <p className="text-sm font-bold text-gray-800">{fmt(Number(p.gaji_bersih))}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/payroll" className="mt-3 block text-center text-xs text-blue-600 hover:underline">
                Lihat semua →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
