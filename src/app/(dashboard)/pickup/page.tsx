"use client";

import { useState } from "react";

const DEMO_QUEUE = [
  { no: 42, driver: "Ahmad Fauzi", vehicle: "B 1234 AB", airport: "BTH001", checkin: "08:15", status: "WAITING", wait: "12 mnt" },
  { no: 43, driver: "Budi Santoso", vehicle: "B 5678 CD", airport: "BTH001", checkin: "08:22", status: "SERVING", wait: "5 mnt" },
  { no: 44, driver: "Candra Wijaya", vehicle: "B 9012 EF", airport: "BTH001", checkin: "08:30", status: "WAITING", wait: "0 mnt" },
  { no: 35, driver: "Dedi Kurniawan", vehicle: "DD 3456 GH", airport: "UPG001", checkin: "07:55", status: "DONE", wait: "-" },
  { no: 36, driver: "Eko Prasetyo", vehicle: "DD 7890 IJ", airport: "UPG001", checkin: "08:10", status: "VIOLATION", wait: "-" },
];

const STATUS_COLORS: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-700",
  SERVING: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  VIOLATION: "bg-red-100 text-red-700",
};

export default function PickupPage() {
  const [activeAirport, setActiveAirport] = useState("BTH001");
  const airports = ["BTH001", "UPG001", "PKU001", "BPN001", "MDC001", "DJB001"];
  const filtered = DEMO_QUEUE.filter((q) => q.airport === activeAirport);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Pickup Point Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Sistem antrian & monitoring pickup point</p>
        </div>
        <button className="flex items-center gap-2 bg-[#E53935] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#B71C1C] transition-colors shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Tambah Antrian
        </button>
      </div>

      {/* Queue Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Antrian Aktif", value: DEMO_QUEUE.filter(q => q.status === "WAITING" || q.status === "SERVING").length, color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "Sedang Dilayani", value: DEMO_QUEUE.filter(q => q.status === "SERVING").length, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Selesai Hari Ini", value: 134, color: "text-green-700", bg: "bg-green-50" },
          { label: "Pelanggaran", value: DEMO_QUEUE.filter(q => q.status === "VIOLATION").length, color: "text-red-700", bg: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Airport tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {airports.map((ap) => (
          <button
            key={ap}
            onClick={() => setActiveAirport(ap)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
              activeAirport === ap
                ? "bg-[#1565C0] text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {ap}
          </button>
        ))}
      </div>

      {/* Queue Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Current Queue */}
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">Antrian {activeAirport}</h3>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
              <span className="text-xs font-semibold text-green-600">REALTIME</span>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["No", "Driver", "Kendaraan", "Check-in", "Tunggu", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length > 0 ? filtered.map((q) => (
                <tr key={q.no} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1565C0] flex items-center justify-center text-white font-black text-sm">
                      {q.no}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-800">{q.driver}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{q.vehicle}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{q.checkin}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{q.wait}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[q.status]}`}>{q.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {q.status === "WAITING" && (
                      <button className="text-xs font-semibold text-[#1565C0] hover:underline">Panggil</button>
                    )}
                    {q.status === "SERVING" && (
                      <button className="text-xs font-semibold text-green-600 hover:underline">Selesai</button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-gray-400">
                    Tidak ada antrian di bandara ini saat ini
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Call Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl card-shadow border border-blue-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">Panggil Antrian</h3>
            <div className="bg-[#1565C0] rounded-2xl p-6 text-center mb-4">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider mb-1">Nomor Berikutnya</p>
              <p className="text-white font-black text-6xl">43</p>
              <p className="text-white/60 text-sm mt-2">Budi Santoso</p>
            </div>
            <button className="w-full py-3 bg-[#E53935] text-white rounded-xl font-bold hover:bg-[#B71C1C] transition-colors">
              Panggil Sekarang
            </button>
          </div>
          <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-3">Statistik Hari Ini</h3>
            <div className="space-y-3">
              {[
                { label: "Rata-rata tunggu", value: "8 menit" },
                { label: "Peak hour", value: "07:00 - 09:00" },
                { label: "Total selesai", value: "134 antrian" },
                { label: "Pelanggaran", value: "3 kasus" },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{s.label}</span>
                  <span className="text-xs font-bold text-gray-800">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
