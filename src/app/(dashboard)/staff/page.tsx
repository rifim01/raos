import { createClient } from "@/lib/supabase/server";

async function getStaff() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("staff")
      .select("id, staff_code, nama, jabatan, department, status, airports(code, city)")
      .eq("status", "ACTIVE") //  KUNCI UTAMA: Hanya mengambil staff yang aktif di Google Sheet terbaru
      .order("nama");
    return data ?? [];
  } catch { return []; }
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "text-emerald-700 bg-emerald-50 border border-emerald-200",
  INACTIVE: "text-gray-500 bg-gray-100 border border-gray-200",
  LEAVE: "text-blue-700 bg-blue-50 border border-blue-200",
  TERMINATED: "text-red-600 bg-red-50 border border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  LEAVE: "Cuti",
  TERMINATED: "Berhenti",
};

export default async function StaffPage() {
  const staff = await getStaff();

  // Kalkulasi matriks otomatis berbasis real-time data active (Total: 22)
  const total    = staff.length;
  const aktif    = staff.filter((s: any) => s.status === "ACTIVE").length;
  const cuti     = staff.filter((s: any) => s.status === "LEAVE").length;
  const nonaktif = staff.filter((s: any) => ["INACTIVE", "TERMINATED"].includes(s.status)).length;

  return (
    /* Break out of dashboard padding, fill with airport background */
    <div
      className="-m-4 lg:-m-6 min-h-full flex items-start justify-center pt-6 pb-8 px-4 relative"
      style={{
        backgroundImage: "url('/baground.png')",
        backgroundSize: "cover",
        backgroundPosition: "center top",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "local",
      }}
    >
      {/* Subtle dark overlay so background doesn't compete with UI */}
      <div className="absolute inset-0 bg-black/25 pointer-events-none" />

      {/* ── Floating glass panel ── */}
      <div
        className="relative z-10 w-full max-w-6xl rounded-2xl overflow-hidden"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.85)",
          boxShadow: "0 32px 64px -12px rgba(0,0,0,0.40), 0 0 0 1px rgba(255,255,255,0.5)",
        }}
      >
        {/* Top gradient stripe */}
        <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#1565C0,#E53935)" }} />

        <div className="p-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black text-gray-900">Staff Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">Database seluruh staff RIFIM di semua bandara</p>
            </div>
            <button className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah Staff
            </button>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Staff",  value: total,    color: "text-[#1565C0]",   bg: "bg-blue-50",    border: "border-blue-100" },
              { label: "Aktif",        value: aktif,    color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100" },
              { label: "Cuti",         value: cuti,     color: "text-sky-600",     bg: "bg-sky-50",     border: "border-sky-100" },
              { label: "Nonaktif",     value: nonaktif, color: "text-gray-600",    bg: "bg-gray-50",    border: "border-gray-200" },
            ].map((s) => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 border ${s.border} shadow-sm`}>
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs font-semibold text-gray-500 mt-0.5 uppercase tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Table card */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

            {/* Filters */}
            <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
              <input
                type="text"
                placeholder="Cari nama, jabatan..."
                className="flex-1 min-w-[160px] max-w-xs bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1565C0]/30"
              />
              <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none">
                <option>Semua Bandara</option>
                <option>BTH001</option><option>DJB001</option><option>PKU001</option>
                <option>BPN001</option><option>MDC001</option><option>UPG001</option>
              </select>
              <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none">
                <option>Semua Status</option>
                <option>ACTIVE</option><option>LEAVE</option><option>INACTIVE</option>
              </select>
            </div>

            {/* Scrollable table — visible scrollbar via inline styles */}
            <div
              className="overflow-x-auto overflow-y-auto"
              style={{
                maxHeight: "calc(100vh - 420px)",
                scrollbarWidth: "thin",
                scrollbarColor: "#CBD5E1 #F8FAFC",
              }}
            >
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-gray-50">
                  <tr className="border-b border-gray-200">
                    {["Staff ID", "Nama", "Jabatan", "Departemen", "Bandara", "Status", "Aksi"].map((h) => (
                      <th key={h} className="px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wide text-left whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {staff.map((s: any) => {
                    const airport = s.airports as { code: string; city: string } | null;
                    return (
                      <tr key={s.id} className="hover:bg-blue-50/50 transition-colors">

                        {/* Staff ID */}
                        <td className="px-5 py-3.5 text-xs font-mono font-semibold text-gray-400 whitespace-nowrap">
                          {s.staff_code || "—"}
                        </td>

                        {/* Nama */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs text-white"
                              style={{ background: "linear-gradient(135deg,#1565C0,#E53935)" }}
                            >
                              {s.nama?.[0]?.toUpperCase() ?? "S"}
                            </div>
                            <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{s.nama}</p>
                          </div>
                        </td>

                        {/* Jabatan */}
                        <td className="px-5 py-3.5 text-sm text-gray-700 whitespace-nowrap">{s.jabatan || "—"}</td>

                        {/* Departemen */}
                        <td className="px-5 py-3.5 text-sm text-gray-500 whitespace-nowrap">{s.department || "—"}</td>

                        {/* Bandara */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          {airport ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-[#1565C0] border border-blue-100">
                              ✈ {airport.code}
                            </span>
                          ) : "—"}
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                            {STATUS_LABEL[s.status] ?? s.status}
                          </span>
                        </td>

                        {/* Aksi */}
                        <td className="px-5 py-3.5">
                          <button
                            className="p-1.5 text-gray-400 hover:text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit staff"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        </td>

                      </tr>
                    );
                  })}

                  {staff.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-5 py-16 text-center">
                        <p className="text-gray-400 text-sm">Tidak ada data staff</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
              <p className="text-xs text-gray-500 font-medium">{total} staff terdaftar</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
