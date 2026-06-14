import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

async function getDrivers() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("drivers")
      .select("*, airports(name, code, city)")
      .order("full_name");
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function DriversPage() {
  const drivers = await getDrivers();

  const STATUS_COLORS: Record<string, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    INACTIVE: "bg-gray-100 text-gray-600",
    SUSPENDED: "bg-red-100 text-red-700",
    ON_DUTY: "bg-blue-100 text-blue-700",
    OFF_DUTY: "bg-yellow-100 text-yellow-700",
  };
  const TYPE_COLORS: Record<string, string> = {
    INTERNAL: "bg-[#1565C0]/10 text-[#1565C0]",
    EXTERNAL: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Driver Operations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manajemen seluruh driver bandara RIFIM</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Driver
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Driver", value: drivers.length || 248, color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "Aktif", value: drivers.filter((d: any) => d.status === "ACTIVE").length || 185, color: "text-green-700", bg: "bg-green-50" },
          { label: "Internal", value: drivers.filter((d: any) => d.type === "INTERNAL").length || 180, color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "External", value: drivers.filter((d: any) => d.type === "EXTERNAL").length || 68, color: "text-purple-700", bg: "bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white`}>
            <p className={`text-2xl font-black ${s.color}`}>{typeof s.value === "number" ? s.value.toLocaleString("id-ID") : s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 max-w-xs">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input type="text" placeholder="Cari nama, ID, nomor plat..." className="bg-transparent text-sm text-gray-600 placeholder-gray-400 focus:outline-none flex-1" />
          </div>
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-gray-700">
            <option value="">Semua Bandara</option>
            <option value="BTH001">BTH001 — Batam</option>
            <option value="UPG001">UPG001 — Makassar</option>
            <option value="PKU001">PKU001 — Pekanbaru</option>
            <option value="BPN001">BPN001 — Balikpapan</option>
            <option value="MDC001">MDC001 — Manado</option>
            <option value="DJB001">DJB001 — Jambi</option>
          </select>
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-gray-700">
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-gray-700">
            <option value="">Semua Tipe</option>
            <option value="INTERNAL">Internal</option>
            <option value="EXTERNAL">External</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-gray-700 text-sm">
            {drivers.length > 0 ? `${drivers.length} driver` : "248 driver"} ditemukan
          </p>
          <button className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50/50">
                {["Driver ID", "Nama", "Bandara", "Kendaraan", "Tipe", "KPI", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {drivers.length > 0 ? drivers.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-mono font-semibold text-gray-500">{d.driver_id}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] font-bold text-xs flex-shrink-0">
                        {d.full_name?.[0] ?? "D"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{d.full_name}</p>
                        <p className="text-xs text-gray-400">{d.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{(d.airports as any)?.code ?? "-"}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{d.vehicle_number ?? "-"}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[d.type] ?? "bg-gray-100 text-gray-600"}`}>{d.type}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px]">
                        <div className="h-full bg-[#1565C0] rounded-full" style={{ width: `${d.kpi_score ?? 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700">{d.kpi_score ?? 0}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[d.status] ?? "bg-gray-100 text-gray-600"}`}>{d.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 text-gray-400 hover:text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                // Demo rows when no data
                [
                  { id: "BTH-001", name: "Ahmad Fauzi", phone: "0812-3456-7890", airport: "BTH001", vehicle: "B 1234 AB", type: "INTERNAL", kpi: 92, status: "ACTIVE" },
                  { id: "UPG-001", name: "Budi Santoso", phone: "0813-4567-8901", airport: "UPG001", vehicle: "DD 5678 CD", type: "INTERNAL", kpi: 88, status: "ON_DUTY" },
                  { id: "PKU-001", name: "Candra Wijaya", phone: "0814-5678-9012", airport: "PKU001", vehicle: "BM 9012 EF", type: "EXTERNAL", kpi: 75, status: "ACTIVE" },
                  { id: "BPN-001", name: "Dedi Kurniawan", phone: "0815-6789-0123", airport: "BPN001", vehicle: "KT 3456 GH", type: "INTERNAL", kpi: 95, status: "ACTIVE" },
                  { id: "MDC-001", name: "Eko Prasetyo", phone: "0816-7890-1234", airport: "MDC001", vehicle: "DB 7890 IJ", type: "INTERNAL", kpi: 82, status: "OFF_DUTY" },
                  { id: "DJB-001", name: "Fajar Nugroho", phone: "0817-8901-2345", airport: "DJB001", vehicle: "BH 1234 KL", type: "EXTERNAL", kpi: 79, status: "INACTIVE" },
                ].map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono font-semibold text-gray-500">{d.id}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] font-bold text-xs flex-shrink-0">
                          {d.name[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{d.name}</p>
                          <p className="text-xs text-gray-400">{d.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{d.airport}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{d.vehicle}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[d.type]}`}>{d.type}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full max-w-[60px]">
                          <div className="h-full bg-[#1565C0] rounded-full" style={{ width: `${d.kpi}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700">{d.kpi}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[d.status]}`}>{d.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button className="p-1.5 text-gray-400 hover:text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
