import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, canAccessAirport } from "@/lib/auth";

export const dynamic = "force-dynamic";

const SEVERITY_STYLE: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-red-50 text-red-600",
  REVIEWED: "bg-blue-50 text-blue-600",
  RESOLVED: "bg-green-50 text-green-600",
  DISMISSED: "bg-gray-50 text-gray-400",
};

const VIOLATION_TYPE_LABEL: Record<string, string> = {
  GEOFENCE_EXIT: "Keluar Geofence",
  LATE_CHECK_IN: "Terlambat Absen",
  NO_SHOW: "Tidak Hadir",
  SPEEDING: "Melebihi Kecepatan",
  ROUTE_DEVIATION: "Penyimpangan Rute",
  UNAUTHORIZED_STOP: "Berhenti Tidak Resmi",
};

export default async function ViolationsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  const { data: violations } = await supabase
    .from("violations")
    .select(
      "id, type, description, severity, status, occurred_at, resolved_at, notes, airport_id, driver_id, drivers(nama, driver_code), airports(code, city)"
    )
    .order("occurred_at", { ascending: false })
    .limit(100);

  const { data: airports } = await supabase
    .from("airports")
    .select("id, code, city")
    .in("code", ["DJB001", "PKU001", "BTH001", "BPN001", "MDC001", "UPG001"])
    .order("code");

  const list = (violations ?? []) as any[];

  const open = list.filter((v) => v.status === "OPEN").length;
  const critical = list.filter((v) => v.severity === "CRITICAL").length;
  const resolved = list.filter((v) => v.status === "RESOLVED").length;

  function fmt(ts: string) {
    const d = new Date(ts);
    return d.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          Pelanggaran Driver
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Pantau dan tindaklanjuti pelanggaran operasional driver
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total", value: list.length, color: "text-gray-700", bg: "bg-gray-100" },
          { label: "Open", value: open, color: "text-red-700", bg: "bg-red-50" },
          { label: "Critical", value: critical, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Resolved", value: resolved, color: "text-green-700", bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Daftar Pelanggaran</h3>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>{list.length} pelanggaran tercatat</span>
          </div>
        </div>

        {list.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 mx-auto mb-3 text-gray-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="font-medium">Belum ada pelanggaran tercatat</p>
            <p className="text-sm mt-1">Pelanggaran akan muncul otomatis dari sistem tracking</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Driver</th>
                  <th className="px-4 py-3">Jenis Pelanggaran</th>
                  <th className="px-4 py-3">Bandara</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {list.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800">
                        {v.drivers?.nama ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">{v.drivers?.driver_code}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-700">
                        {VIOLATION_TYPE_LABEL[v.type] ?? v.type}
                      </p>
                      {v.description && (
                        <p className="text-xs text-gray-400 truncate max-w-[200px]">{v.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {v.airports?.code ?? "—"} — {v.airports?.city ?? ""}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLE[v.severity] ?? "bg-gray-100 text-gray-500"}`}>
                        {v.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[v.status] ?? "bg-gray-50 text-gray-400"}`}>
                        {v.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{fmt(v.occurred_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
