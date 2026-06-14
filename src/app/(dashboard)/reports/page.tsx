import { formatCurrency } from "@/lib/utils";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">Reporting & Analytics</h1>
        <p className="text-sm text-gray-500 mt-0.5">Laporan harian, mingguan, bulanan, dan tahunan</p>
      </div>

      {/* Quick Export */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Laporan Harian", icon: "📅", color: "bg-blue-50 border-blue-100", btn: "text-[#1565C0]" },
          { label: "Laporan Mingguan", icon: "📊", color: "bg-purple-50 border-purple-100", btn: "text-purple-600" },
          { label: "Laporan Bulanan", icon: "📈", color: "bg-green-50 border-green-100", btn: "text-green-600" },
          { label: "Laporan Tahunan", icon: "📋", color: "bg-orange-50 border-orange-100", btn: "text-orange-600" },
        ].map((r) => (
          <div key={r.label} className={`bg-white rounded-2xl card-shadow border ${r.color} p-5 text-center hover:shadow-md cursor-pointer transition-shadow`}>
            <div className="text-3xl mb-3">{r.icon}</div>
            <p className="font-bold text-sm text-gray-800">{r.label}</p>
            <button className={`text-xs font-semibold ${r.btn} mt-2 hover:underline`}>Generate PDF</button>
          </div>
        ))}
      </div>

      {/* KPI Table */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">KPI per Bandara — Juni 2025</h3>
          <div className="flex gap-2">
            <select className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none">
              <option>Juni 2025</option><option>Mei 2025</option>
            </select>
            <button className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              Export Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Bandara", "Kota", "Total Antrian", "Driver Aktif", "Staff Hadir", "Pendapatan", "KPI Score", "Ranking"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                { code: "BTH001", city: "Batam", antrian: 1250, driver: 42, staff: 18, revenue: 45000000, kpi: 92, rank: 1 },
                { code: "BPN001", city: "Balikpapan", antrian: 980, driver: 28, staff: 14, revenue: 32000000, kpi: 89, rank: 2 },
                { code: "MDC001", city: "Manado", antrian: 870, driver: 25, staff: 12, revenue: 28000000, kpi: 86, rank: 3 },
                { code: "UPG001", city: "Makassar", antrian: 1100, driver: 38, staff: 22, revenue: 38000000, kpi: 88, rank: 4 },
                { code: "PKU001", city: "Pekanbaru", antrian: 820, driver: 30, staff: 16, revenue: 22000000, kpi: 85, rank: 5 },
                { code: "DJB001", city: "Jambi", antrian: 650, driver: 22, staff: 14, revenue: 18000000, kpi: 84, rank: 6 },
              ].sort((a, b) => b.kpi - a.kpi).map((row, i) => (
                <tr key={row.code} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] text-xs font-bold">✈</div>
                      <span className="font-semibold text-sm text-gray-800">{row.code}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{row.city}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-800">{row.antrian.toLocaleString("id-ID")}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{row.driver}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{row.staff}</td>
                  <td className="px-4 py-3 text-sm font-medium text-green-700">{formatCurrency(row.revenue)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full max-w-[80px]">
                        <div className="h-full bg-[#1565C0] rounded-full" style={{ width: `${row.kpi}%` }} />
                      </div>
                      <span className="text-sm font-bold text-[#1565C0]">{row.kpi}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" :
                      i === 1 ? "bg-gray-100 text-gray-700" :
                      i === 2 ? "bg-orange-100 text-orange-700" : "bg-blue-50 text-blue-600"
                    }`}>#{i + 1}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
