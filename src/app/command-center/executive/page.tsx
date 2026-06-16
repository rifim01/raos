import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface TopAirport {
  airport_code: string;
  airport_city: string;
  pickup_hari_ini: number;
  queue_waiting: number;
  driver_online: number;
  staff_hadir: number;
  income_hari_ini: number;
  airport_status: string;
}

export default async function ExecutivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "DIRECTOR")) redirect("/");

  const supabase = await createClient();
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const monthStart = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const monthEnd = bulan === 12
    ? `${tahun + 1}-01-01`
    : `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const [
    { data: ccStats },
    { data: topDriversRaw },
    { data: topStaffRaw },
    { data: revenueRaw },
    { data: payrollRaw },
  ] = await Promise.all([
    // Per-airport stats (today)
    (supabase as any)
      .from("vw_command_center_per_airport")
      .select("*")
      .order("pickup_hari_ini", { ascending: false }),

    // Top drivers by trips this month
    (supabase as any)
      .from("pickup_queues")
      .select("driver_id, drivers(nama, driver_code, airports(code, city))")
      .eq("status", "COMPLETED")
      .gte("created_at", monthStart)
      .lt("created_at", monthEnd),

    // Top staff by attendance this month
    (supabase as any)
      .from("attendance")
      .select("staff_id, check_type, staff(nama, staff_code, jabatan, airports(code, city))")
      .eq("check_type", "CHECK_IN")
      .gte("tanggal", monthStart)
      .lt("tanggal", monthEnd),

    // Revenue per airport this month
    (supabase as any)
      .from("finance_transactions")
      .select("airport_id, nominal, airports(code, city)")
      .eq("jenis", "PEMASUKAN")
      .gte("tanggal", monthStart)
      .lt("tanggal", monthEnd),

    // Payroll this month
    (supabase as any)
      .from("payroll")
      .select("airport_id, gaji_bersih, airports(code, city)")
      .eq("periode_bulan", bulan)
      .eq("periode_tahun", tahun)
      .in("status", ["APPROVED", "PAID"]),
  ]);

  // Aggregate top drivers
  const driverTripMap: Record<string, { trips: number; nama: string; code: string; airport: string }> = {};
  for (const r of topDriversRaw ?? []) {
    const id = r.driver_id;
    if (!driverTripMap[id]) {
      driverTripMap[id] = {
        trips: 0,
        nama: (r.drivers as any)?.nama ?? "—",
        code: (r.drivers as any)?.driver_code ?? "—",
        airport: (r.drivers as any)?.airports?.code ?? "—",
      };
    }
    driverTripMap[id].trips++;
  }
  const topDrivers = Object.values(driverTripMap)
    .sort((a, b) => b.trips - a.trips)
    .slice(0, 5);

  // Aggregate top staff attendance
  const staffAttMap: Record<string, { days: number; nama: string; code: string; jabatan: string; airport: string }> = {};
  for (const r of topStaffRaw ?? []) {
    const id = r.staff_id;
    if (!staffAttMap[id]) {
      staffAttMap[id] = {
        days: 0,
        nama: (r.staff as any)?.nama ?? "—",
        code: (r.staff as any)?.staff_code ?? "—",
        jabatan: (r.staff as any)?.jabatan ?? "—",
        airport: (r.staff as any)?.airports?.code ?? "—",
      };
    }
    staffAttMap[id].days++;
  }
  const topStaff = Object.values(staffAttMap)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5);

  // Aggregate revenue by airport
  const revenueMap: Record<string, { nominal: number; code: string; city: string }> = {};
  for (const r of revenueRaw ?? []) {
    const id = r.airport_id;
    if (!revenueMap[id]) {
      revenueMap[id] = { nominal: 0, code: (r.airports as any)?.code ?? "—", city: (r.airports as any)?.city ?? "—" };
    }
    revenueMap[id].nominal += Number(r.nominal ?? 0);
  }
  const topRevenue = Object.values(revenueMap)
    .sort((a, b) => b.nominal - a.nominal)
    .slice(0, 6);

  // Aggregate payroll by airport
  const payrollMap: Record<string, { total: number; code: string }> = {};
  for (const r of payrollRaw ?? []) {
    const id = r.airport_id;
    if (!payrollMap[id]) payrollMap[id] = { total: 0, code: (r.airports as any)?.code ?? "—" };
    payrollMap[id].total += Number(r.gaji_bersih ?? 0);
  }

  const airports: TopAirport[] = (ccStats ?? []) as TopAirport[];
  const topAirportsByPickup = [...airports].sort((a, b) => Number(b.pickup_hari_ini) - Number(a.pickup_hari_ini));

  const STATUS_STYLE: Record<string, string> = {
    NORMAL:   "bg-green-100 text-green-700",
    PADAT:    "bg-yellow-100 text-yellow-700",
    OVERLOAD: "bg-red-100 text-red-700",
  };

  const totalPickup  = airports.reduce((s, a) => s + Number(a.pickup_hari_ini ?? 0), 0);
  const totalOnline  = airports.reduce((s, a) => s + Number(a.driver_online ?? 0), 0);
  const totalRevenue = topRevenue.reduce((s, r) => s + r.nominal, 0);
  const totalPayroll = Object.values(payrollMap).reduce((s, p) => s + p.total, 0);

  return (
    <div className="min-h-screen" style={{ background: "#f8fafc" }}>
      {/* Nav header */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">
            ← Dashboard
          </Link>
          <div className="w-px h-4 bg-gray-200" />
          <p className="font-black text-sm text-gray-800">RAOS Executive Analytics</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/command-center/director"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{ background: "#0D47A1" }}
          >
            Director CC
          </Link>
          <Link
            href="/command-center/tv-mode"
            target="_blank"
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
            style={{ background: "#1e293b" }}
          >
            TV Wall
          </Link>
        </div>
      </div>

    <div className="space-y-6 px-6 py-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            Executive Analytics
          </h1>
          <p className="text-sm mt-0.5 text-gray-500">
            Nasional · {monthName}
          </p>
        </div>
      </div>

      {/* National KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Pickup Hari Ini",   value: totalPickup.toLocaleString("id-ID"),  color: "text-blue-700",  bg: "bg-blue-50",   icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
          { label: "Driver Online",     value: totalOnline.toLocaleString("id-ID"),  color: "text-green-700", bg: "bg-green-50",  icon: "M19 17H5a2 2 0 01-2-2V9l3-6h12l3 6v6a2 2 0 01-2 2z" },
          { label: "Revenue Bulan Ini", value: formatCurrency(totalRevenue),          color: "text-purple-700",bg: "bg-purple-50", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" },
          { label: "Total Payroll",     value: formatCurrency(totalPayroll),          color: "text-orange-700",bg: "bg-orange-50", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${s.color}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-500">{s.label}</p>
            </div>
            <p className={`text-xl font-black ${s.color} leading-tight`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Top Airport by Pickup */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Top Airport — Pickup Hari Ini</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {topAirportsByPickup.slice(0, 6).map((a, i) => (
              <div key={a.airport_code} className="flex items-center gap-3 px-5 py-3">
                <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center text-xs font-black text-blue-600 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-800 font-mono">{a.airport_code}</p>
                  <p className="text-xs text-gray-400">{a.airport_city}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-blue-700">{Number(a.pickup_hari_ini ?? 0)}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[a.airport_status] ?? "bg-gray-100 text-gray-500"}`}>
                    {a.airport_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Revenue by Airport */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Top Revenue — {monthName}</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {topRevenue.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-400">Belum ada data transaksi</p>
            ) : (
              topRevenue.map((r, i) => (
                <div key={r.code} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-6 h-6 rounded-full bg-purple-50 flex items-center justify-center text-xs font-black text-purple-600 flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-800 font-mono">{r.code}</p>
                    <p className="text-xs text-gray-400">{r.city}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-purple-700">{formatCurrency(r.nominal)}</p>
                    {payrollMap[Object.keys(payrollMap).find((k) => payrollMap[k].code === r.code) ?? ""]?.total && (
                      <p className="text-[10px] text-gray-400">
                        Payroll: {formatCurrency(
                          payrollMap[Object.keys(payrollMap).find((k) => payrollMap[k].code === r.code) ?? ""]?.total ?? 0
                        )}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Airport Grid Summary */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Status Bandara Hari Ini</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {airports.map((a) => (
              <div key={a.airport_code} className="px-5 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-bold font-mono text-gray-800">{a.airport_code}</p>
                    <p className="text-[10px] text-gray-400">{a.airport_city}</p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[a.airport_status] ?? "bg-gray-100 text-gray-500"}`}>
                    {a.airport_status}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Tunggu",  value: a.queue_waiting,   color: "text-yellow-600" },
                    { label: "Online",  value: a.driver_online,   color: "text-green-600" },
                    { label: "Pickup",  value: a.pickup_hari_ini, color: "text-blue-600" },
                    { label: "Hadir",   value: a.staff_hadir,     color: "text-purple-600" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className={`text-xs font-black ${s.color}`}>{Number(s.value ?? 0)}</p>
                      <p className="text-[9px] text-gray-400">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Top Drivers */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Top Driver — {monthName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Berdasarkan jumlah trip selesai</p>
          </div>
          {topDrivers.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Belum ada data trip</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topDrivers.map((d, i) => (
                <div key={d.code} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#d97706" : "#f1f5f9",
                      color: i < 3 ? "white" : "#64748b",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{d.nama}</p>
                    <p className="text-xs text-gray-400">{d.code} · {d.airport}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-green-700">{d.trips}</p>
                    <p className="text-[10px] text-gray-400">trip</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Staff Attendance */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Top Staff — {monthName}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Berdasarkan jumlah hari hadir</p>
          </div>
          {topStaff.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Belum ada data absensi</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topStaff.map((s, i) => (
                <div key={s.code} className="flex items-center gap-3 px-5 py-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{
                      background: i === 0 ? "#fbbf24" : i === 1 ? "#94a3b8" : i === 2 ? "#d97706" : "#f1f5f9",
                      color: i < 3 ? "white" : "#64748b",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{s.nama}</p>
                    <p className="text-xs text-gray-400">{s.jabatan} · {s.airport}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-700">{s.days}</p>
                    <p className="text-[10px] text-gray-400">hari hadir</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}
