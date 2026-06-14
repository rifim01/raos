export default function TrackingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">Live Driver Tracking</h1>
        <p className="text-sm text-gray-500 mt-0.5">Pantau lokasi driver realtime menggunakan Google Maps</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Driver Online", value: "185", color: "text-green-700", bg: "bg-green-50" },
          { label: "On Duty", value: "42", color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Di Bandara", value: "28", color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "Offline", value: "63", color: "text-gray-600", bg: "bg-gray-100" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map placeholder */}
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Peta Tracking Driver</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
                <span className="text-xs font-semibold text-green-600">LIVE</span>
              </div>
              <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                <option>BTH001 — Batam</option>
                <option>UPG001 — Makassar</option>
              </select>
            </div>
          </div>
          {/* Map placeholder - replace with Google Maps component */}
          <div className="relative bg-gradient-to-br from-blue-50 to-blue-100 h-[450px] flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl bg-[#1565C0]/20 flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="1.5" className="w-10 h-10">
                  <circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" strokeDasharray="4 2"/>
                  <line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/>
                  <line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/>
                </svg>
              </div>
              <p className="font-bold text-[#1565C0] text-lg">Google Maps</p>
              <p className="text-sm text-gray-500 mt-1 max-w-xs">
                Tambahkan NEXT_PUBLIC_GOOGLE_MAPS_API_KEY di .env.local untuk mengaktifkan live tracking
              </p>
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {[
                  { color: "bg-green-500", label: "Driver Online (185)" },
                  { color: "bg-blue-500", label: "On Duty (42)" },
                  { color: "bg-red-500", label: "Geofence Bandara" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5 bg-white rounded-lg px-2.5 py-1.5 shadow-sm">
                    <span className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                    <span className="text-xs font-medium text-gray-600">{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Driver list */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 flex flex-col">
          <div className="px-4 py-4 border-b border-gray-100">
            <input type="text" placeholder="Cari driver..." className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {[
              { name: "Ahmad Fauzi", id: "BTH-001", status: "ON_DUTY", time: "2 mnt lalu", lat: "1.12°N", lng: "104.06°E" },
              { name: "Budi Santoso", id: "BTH-002", status: "ONLINE", time: "5 mnt lalu", lat: "1.13°N", lng: "104.07°E" },
              { name: "Candra Wijaya", id: "PKU-001", status: "ONLINE", time: "1 mnt lalu", lat: "0.46°N", lng: "101.44°E" },
              { name: "Dedi Kurniawan", id: "BPN-001", status: "ON_DUTY", time: "3 mnt lalu", lat: "1.26°S", lng: "116.90°E" },
              { name: "Eko Prasetyo", id: "MDC-001", status: "OFFLINE", time: "2 jam lalu", lat: "-", lng: "-" },
              { name: "Fajar Nugroho", id: "DJB-001", status: "ONLINE", time: "8 mnt lalu", lat: "1.63°S", lng: "103.64°E" },
            ].map((d) => (
              <button key={d.id} className="w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${d.status === "OFFLINE" ? "bg-gray-300" : d.status === "ON_DUTY" ? "bg-blue-500" : "bg-green-500"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{d.name}</p>
                    <p className="text-xs text-gray-400">{d.id} · {d.time}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">{d.lat}</p>
                    <p className="text-[10px] text-gray-400">{d.lng}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
