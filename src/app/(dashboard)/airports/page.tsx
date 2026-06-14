import { AIRPORTS } from "@/lib/utils";

const AIRPORT_DATA = [
  { ...AIRPORTS[0], partner: "Angkasa Pura Indonesia", status: "ACTIVE", drivers: 42, staff: 18, kpi: "84%" },
  { ...AIRPORTS[1], partner: "Puskopau", status: "ACTIVE", drivers: 30, staff: 16, kpi: "85%" },
  { ...AIRPORTS[2], partner: "PT BIB", status: "ACTIVE", drivers: 50, staff: 20, kpi: "92%" },
  { ...AIRPORTS[3], partner: "Primkopau", status: "ACTIVE", drivers: 35, staff: 14, kpi: "89%" },
  { ...AIRPORTS[4], partner: "Koperasi Mahkota", status: "ACTIVE", drivers: 30, staff: 12, kpi: "86%" },
  { ...AIRPORTS[5], partner: "PT Rifim Gemilang", status: "ACTIVE", drivers: 45, staff: 22, kpi: "88%" },
  { ...AIRPORTS[6], partner: "PT Rifim Gemilang", status: "PLANNED", drivers: 0, staff: 0, kpi: "-" },
];

export default function AirportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Airport Operations</h1>
          <p className="text-sm text-gray-500 mt-0.5">Data bandara, mitra, kontrak, dan monitoring operasional</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors">
          + Tambah Bandara
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AIRPORT_DATA.map((airport) => (
          <div key={airport.code} className={`bg-white rounded-2xl card-shadow border overflow-hidden hover:shadow-md transition-shadow ${airport.status === "PLANNED" ? "border-yellow-200 opacity-75" : "border-gray-100"}`}>
            {/* Header */}
            <div className={`px-5 py-4 ${airport.status === "PLANNED" ? "bg-gradient-to-r from-yellow-500 to-amber-600" : "gradient-rifim"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">{airport.code}</span>
                  <h3 className="text-white font-black text-sm mt-0.5 leading-tight">{airport.name}</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                  <span className="text-white text-lg">✈</span>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${airport.status === "ACTIVE" ? "bg-green-400/30 text-white" : "bg-yellow-300/30 text-white"}`}>
                  {airport.status}
                </span>
                <span className="text-white/70 text-xs">{airport.city}</span>
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-gray-400 flex-shrink-0">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                </svg>
                <span className="text-xs text-gray-500">Mitra: <strong className="text-gray-700">{airport.partner}</strong></span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xl font-black text-[#1565C0]">{airport.drivers}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">Driver</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xl font-black text-purple-700">{airport.staff}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">Staff</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xl font-black text-green-700">{airport.kpi}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5">KPI</p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <div className="flex-1 h-2 bg-gray-100 rounded-full">
                  <div
                    className="h-full bg-gradient-to-r from-[#1565C0] to-[#E53935] rounded-full transition-all"
                    style={{ width: airport.kpi === "-" ? "0%" : airport.kpi }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-600">{airport.kpi}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-4 flex items-center gap-2">
              <button className="flex-1 py-2 text-xs font-semibold text-[#1565C0] border border-[#1565C0]/30 rounded-xl hover:bg-blue-50 transition-colors">
                Detail
              </button>
              <button className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Laporan
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
