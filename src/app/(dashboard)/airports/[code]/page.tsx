import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canAccessAirport } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

const AIRPORT_NAMES: Record<string, string> = {
  DJB001: "Bandara Sultan Thaha",
  PKU001: "Bandara Sultan Syarif Kasim II",
  BTH001: "Bandara Internasional Hang Nadim",
  BPN001: "Bandara Sultan Aji Muhammad Sulaiman Sepinggan",
  MDC001: "Bandara Sam Ratulangi",
  UPG001: "Bandara Sultan Hasanuddin",
};

export default async function AirportDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const { data: airport } = await (supabase as any)
    .from("airports")
    .select("*")
    .eq("code", upperCode)
    .single();

  if (!airport) notFound();

  if (!canAccessAirport(user, airport.id)) redirect("/");

  const { data: bandara } = await (supabase as any)
    .from("vw_dashboard_bandara")
    .select("*")
    .eq("airport_code", upperCode)
    .single();

  const { data: topDrivers } = await (supabase as any)
    .from("drivers")
    .select("id, nama, driver_code, status, driver_type")
    .eq("airport_id", airport.id)
    .eq("status", "ACTIVE")
    .limit(5);

  const { data: recentAttendance } = await (supabase as any)
    .from("attendance")
    .select("id, tanggal, check_type, staff(nama)")
    .eq("airport_id", airport.id)
    .order("tanggal", { ascending: false })
    .limit(8);

  const b = bandara as any;

  const kpis = [
    { label: "Total Driver", value: b?.total_driver ?? 0, color: "blue", icon: "M19 17H5a2 2 0 01-2-2V9l3-6h12l3 6v6a2 2 0 01-2 2zM7.5 17.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM16.5 17.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM5 9h14" },
    { label: "Driver Online", value: b?.driver_online ?? 0, color: "green", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
    { label: "Total Staff", value: b?.total_staff ?? 0, color: "purple", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8z" },
    { label: "Staff Hadir", value: b?.staff_hadir ?? 0, color: "green", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
    { label: "Queue Hari Ini", value: b?.queue_hari_ini ?? 0, color: "yellow", icon: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" },
    { label: "Queue Menunggu", value: b?.queue_waiting ?? 0, color: "orange", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Pendapatan Hari Ini", value: formatCurrency(Number(b?.income_hari_ini ?? 0)), color: "green", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" },
    { label: "Tagihan Overdue", value: b?.tagihan_overdue ?? 0, color: "red", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
  ];

  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    purple: "bg-purple-50 text-purple-700",
    yellow: "bg-yellow-50 text-yellow-700",
    orange: "bg-orange-50 text-orange-700",
    red: "bg-red-50 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link href="/" className="hover:text-blue-600">Dashboard</Link>
            <span>/</span>
            <span className="text-gray-600 font-medium">{upperCode}</span>
          </div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
            {AIRPORT_NAMES[upperCode] ?? airport.name}
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {airport.city} · {upperCode}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-xl">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
          <span className="text-xs font-bold text-green-600">AKTIF</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-xl p-4 ${colorMap[kpi.color]?.split(" ")[0] ?? "bg-gray-50"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-2xl font-black ${colorMap[kpi.color]?.split(" ")[1] ?? "text-gray-700"}`}>
                  {kpi.value}
                </p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">{kpi.label}</p>
              </div>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
                className={`w-5 h-5 opacity-50 ${colorMap[kpi.color]?.split(" ")[1] ?? ""}`}>
                <path strokeLinecap="round" strokeLinejoin="round" d={kpi.icon} />
              </svg>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Drivers */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Driver Aktif</h3>
            <Link href="/drivers" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {!topDrivers?.length ? (
            <div className="py-10 text-center text-gray-400 text-sm">Belum ada driver</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topDrivers.map((d: any, i: number) => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.nama}</p>
                    <p className="text-xs text-gray-400">{d.driver_code} · {d.driver_type}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    d.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>{d.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Attendance */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Absensi Terbaru</h3>
            <Link href="/attendance" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {!recentAttendance?.length ? (
            <div className="py-10 text-center text-gray-400 text-sm">Belum ada data absensi</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentAttendance.map((a: any) => (
                <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    a.check_type === "CHECK_IN" ? "bg-green-500" : "bg-orange-500"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {(a.staff as any)?.nama ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      {a.tanggal} · {a.check_type === "CHECK_IN" ? "Masuk" : "Pulang"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
