import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/auth";
import Link from "next/link";

interface DriverDashboardProps {
  user: UserProfile;
}

export default async function DriverDashboard({ user }: DriverDashboardProps) {
  const supabase = await createClient();

  const { data: driverRecord } = await (supabase as any)
    .from("drivers")
    .select("id, nama, driver_code, driver_type, status, nomor_hp, airport_id, airports(code, city)")
    .eq("user_id", user.id)
    .single();

  const today = new Date().toISOString().split("T")[0];
  const thisMonth = today.slice(0, 7);

  let queueToday: any[] = [];
  let pickupToday = 0;
  let pickupMonth = 0;
  let myViolations: any[] = [];
  let currentLocation: any = null;

  if (driverRecord) {
    const [
      { data: queues },
      { count: todayCount },
      { count: monthCount },
      { data: violations },
      { data: location },
    ] = await Promise.all([
      (supabase as any).from("pickup_queues").select("*").eq("driver_id", driverRecord.id).eq("status", "WAITING").limit(5),
      (supabase as any).from("pickup_queues").select("*", { count: "exact", head: true }).eq("driver_id", driverRecord.id).gte("created_at", `${today}T00:00:00`),
      (supabase as any).from("pickup_queues").select("*", { count: "exact", head: true }).eq("driver_id", driverRecord.id).gte("created_at", `${thisMonth}-01T00:00:00`),
      (supabase as any).from("violations").select("id, type, severity, status, occurred_at").eq("driver_id", driverRecord.id).order("occurred_at", { ascending: false }).limit(5),
      (supabase as any).from("driver_locations").select("latitude, longitude, status, last_seen, speed").eq("driver_id", driverRecord.id).single(),
    ]);

    queueToday = queues ?? [];
    pickupToday = todayCount ?? 0;
    pickupMonth = monthCount ?? 0;
    myViolations = violations ?? [];
    currentLocation = location ?? null;
  }

  const airport = (driverRecord as any)?.airports as { code: string; city: string } | null;

  const statusColor = (s: string) =>
    s === "ACTIVE" ? "bg-green-100 text-green-700" : s === "INACTIVE" ? "bg-gray-100 text-gray-500" : "bg-yellow-100 text-yellow-700";

  const VIOLATION_LABEL: Record<string, string> = {
    GEOFENCE_EXIT: "Keluar Geofence",
    LATE_CHECK_IN: "Terlambat Absen",
    NO_SHOW: "Tidak Hadir",
    SPEEDING: "Overspeed",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          Selamat Datang, {user.full_name?.split(" ")[0] ?? "Driver"} 🚗
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {!driverRecord ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-yellow-800">Profil belum terhubung</p>
          <p className="text-sm text-yellow-600 mt-1">Hubungi Koordinator untuk menghubungkan akun dengan data driver.</p>
        </div>
      ) : (
        <>
          {/* Profile + Status */}
          <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-rifim flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              {(driverRecord.nama ?? "D")[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg text-gray-800 truncate">{driverRecord.nama}</p>
              <p className="text-sm text-gray-500">{driverRecord.driver_code} · {driverRecord.driver_type}</p>
              <p className="text-xs text-gray-400 mt-0.5">{airport?.city} ({airport?.code}) · HP: {driverRecord.nomor_hp ?? "—"}</p>
            </div>
            <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${statusColor(driverRecord.status)}`}>
              {driverRecord.status}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: "Status Online",
                value: currentLocation?.status ?? "OFFLINE",
                color: currentLocation?.status === "ONLINE" ? "text-green-700" : currentLocation?.status === "ON_DUTY" ? "text-blue-700" : "text-gray-400",
                bg: currentLocation?.status === "ONLINE" ? "bg-green-50" : currentLocation?.status === "ON_DUTY" ? "bg-blue-50" : "bg-gray-50",
              },
              { label: "Pickup Hari Ini", value: pickupToday, color: "text-blue-700", bg: "bg-blue-50" },
              { label: "Pickup Bulan Ini", value: pickupMonth, color: "text-purple-700", bg: "bg-purple-50" },
              { label: "Pelanggaran", value: myViolations.filter((v) => v.status === "OPEN").length, color: myViolations.filter((v) => v.status === "OPEN").length > 0 ? "text-red-700" : "text-green-700", bg: myViolations.filter((v) => v.status === "OPEN").length > 0 ? "bg-red-50" : "bg-green-50" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
                <p className={`text-lg font-black ${s.color} leading-tight`}>{s.value}</p>
                <p className="text-xs font-medium text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Location + Queue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current location */}
            <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4">Posisi & Antrian</h3>
              {currentLocation ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${currentLocation.status === "ONLINE" ? "bg-green-500 animate-pulse-dot" : currentLocation.status === "ON_DUTY" ? "bg-blue-500" : "bg-gray-300"}`} />
                    <span className="text-sm font-semibold text-gray-700">{currentLocation.status}</span>
                    {currentLocation.speed != null && (
                      <span className="text-xs text-gray-400 ml-auto">{currentLocation.speed} km/h</span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-gray-500">
                    {currentLocation.latitude?.toFixed(5)}, {currentLocation.longitude?.toFixed(5)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-400">Belum ada data lokasi</p>
              )}

              <div className="mt-4 border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 mb-2">Antrian Aktif</p>
                {queueToday.length === 0 ? (
                  <p className="text-sm text-gray-400">Tidak ada antrian saat ini</p>
                ) : (
                  queueToday.map((q: any) => (
                    <div key={q.id} className="flex items-center gap-2 py-1.5">
                      <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                        #{q.queue_number}
                      </span>
                      <span className="text-sm text-gray-700">{q.status}</span>
                    </div>
                  ))
                )}
              </div>
              <Link href="/tracking" className="mt-3 block text-center text-xs text-blue-600 hover:underline">
                Buka Peta Tracking →
              </Link>
            </div>

            {/* Violations */}
            <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
              <h3 className="font-bold text-gray-800 mb-4">Riwayat Pelanggaran</h3>
              {myViolations.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="w-5 h-5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-green-700">Tidak ada pelanggaran</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myViolations.map((v: any) => (
                    <div key={v.id} className="flex items-center gap-2 py-1.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                        v.severity === "CRITICAL" ? "bg-red-100 text-red-700" :
                        v.severity === "HIGH" ? "bg-orange-100 text-orange-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{v.severity}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 truncate">{VIOLATION_LABEL[v.type] ?? v.type}</p>
                        <p className="text-xs text-gray-400">{new Date(v.occurred_at).toLocaleDateString("id-ID")}</p>
                      </div>
                      <span className={`text-xs font-medium ${v.status === "OPEN" ? "text-red-500" : "text-gray-400"}`}>
                        {v.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/violations" className="mt-3 block text-center text-xs text-blue-600 hover:underline">
                Lihat detail →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
