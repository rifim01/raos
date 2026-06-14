"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

const TODAY = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const DEMO_ATTENDANCE = [
  { name: "Rina Sari", airport: "BTH001", checkin: "07:58", checkout: "17:02", status: "PRESENT", shift: "Pagi" },
  { name: "Siti Rahayu", airport: "UPG001", checkin: "08:15", checkout: null, status: "LATE", shift: "Pagi" },
  { name: "Teguh Wibowo", airport: "PKU001", checkin: "07:45", checkout: "17:00", status: "PRESENT", shift: "Pagi" },
  { name: "Umar Hakim", airport: "BPN001", checkin: null, checkout: null, status: "ABSENT", shift: "Malam" },
  { name: "Vina Pratiwi", airport: "MDC001", checkin: "07:55", checkout: null, status: "PRESENT", shift: "Pagi" },
  { name: "Wahyu Hidayat", airport: "DJB001", checkin: null, checkout: null, status: "LEAVE", shift: "Pagi" },
];

const STATUS_COLORS: Record<string, string> = {
  PRESENT: "bg-green-100 text-green-700",
  LATE: "bg-orange-100 text-orange-700",
  ABSENT: "bg-red-100 text-red-700",
  SICK: "bg-purple-100 text-purple-700",
  LEAVE: "bg-blue-100 text-blue-700",
};

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"today" | "report" | "schedule">("today");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{TODAY}</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export Laporan
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Staff", value: 88, color: "text-gray-700", bg: "bg-white border border-gray-200" },
          { label: "Hadir", value: DEMO_ATTENDANCE.filter(a => a.status === "PRESENT").length, color: "text-green-700", bg: "bg-green-50" },
          { label: "Terlambat", value: DEMO_ATTENDANCE.filter(a => a.status === "LATE").length, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Tidak Hadir", value: DEMO_ATTENDANCE.filter(a => a.status === "ABSENT").length, color: "text-red-700", bg: "bg-red-50" },
          { label: "Cuti", value: DEMO_ATTENDANCE.filter(a => a.status === "LEAVE").length, color: "text-blue-700", bg: "bg-blue-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "today", label: "Absensi Hari Ini" },
          { key: "report", label: "Laporan Bulanan" },
          { key: "schedule", label: "Jadwal Kerja" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === t.key
                ? "border-[#1565C0] text-[#1565C0]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "today" && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Nama", "Bandara", "Shift", "Check-in", "Check-out", "Status", "Aksi"].map((h) => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {DEMO_ATTENDANCE.map((a) => (
                  <tr key={a.name} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] font-bold text-xs flex-shrink-0">
                          {a.name[0]}
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{a.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{a.airport}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">{a.shift}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{a.checkin ?? "-"}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{a.checkout ?? "-"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[a.status]}`}>{a.status}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="text-xs font-semibold text-[#1565C0] hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "report" && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
              <option>Juni 2025</option><option>Mei 2025</option><option>April 2025</option>
            </select>
            <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
              <option>Semua Bandara</option><option>BTH001</option><option>UPG001</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Nama", "Hadir", "Terlambat", "Alpha", "Sakit", "Cuti", "% Kehadiran"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: "Rina Sari", hadir: 22, terlambat: 1, alpha: 0, sakit: 0, cuti: 0, pct: "96%" },
                  { name: "Teguh Wibowo", hadir: 20, terlambat: 2, alpha: 1, sakit: 0, cuti: 1, pct: "87%" },
                  { name: "Siti Rahayu", hadir: 18, terlambat: 3, alpha: 2, sakit: 1, cuti: 0, pct: "78%" },
                ].map((r) => (
                  <tr key={r.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-green-700 font-semibold">{r.hadir}</td>
                    <td className="px-4 py-3 text-orange-600">{r.terlambat}</td>
                    <td className="px-4 py-3 text-red-600">{r.alpha}</td>
                    <td className="px-4 py-3 text-purple-600">{r.sakit}</td>
                    <td className="px-4 py-3 text-blue-600">{r.cuti}</td>
                    <td className="px-4 py-3 font-bold text-[#1565C0]">{r.pct}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "schedule" && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-6">
          <p className="text-sm text-gray-500 text-center py-8">
            Jadwal kerja staff dapat dikelola di sini. Fitur shift management akan tersedia setelah koneksi Supabase aktif.
          </p>
        </div>
      )}
    </div>
  );
}
