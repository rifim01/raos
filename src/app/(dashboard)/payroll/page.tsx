"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const DEMO_PAYROLL = [
  { name: "Rina Sari", airport: "BTH001", position: "Koordinator", base: 5000000, overtime: 750000, bonus: 500000, kasbon: 200000, deductions: 100000, net: 5950000, status: "PAID" },
  { name: "Siti Rahayu", airport: "UPG001", position: "Staff Operasional", base: 3500000, overtime: 350000, bonus: 0, kasbon: 0, deductions: 75000, net: 3775000, status: "PROCESSED" },
  { name: "Teguh Wibowo", airport: "PKU001", position: "Supervisor", base: 4500000, overtime: 600000, bonus: 300000, kasbon: 500000, deductions: 90000, net: 4810000, status: "DRAFT" },
  { name: "Vina Pratiwi", airport: "MDC001", position: "Admin", base: 3200000, overtime: 0, bonus: 200000, kasbon: 0, deductions: 64000, net: 3336000, status: "PAID" },
];

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PROCESSED: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
};

export default function PayrollPage() {
  const [activeTab, setActiveTab] = useState<"payroll" | "kasbon" | "slip">("payroll");
  const [period, setPeriod] = useState("Juni 2025");

  const totalNet = DEMO_PAYROLL.reduce((sum, p) => sum + p.net, 0);
  const totalBase = DEMO_PAYROLL.reduce((sum, p) => sum + p.base, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Payroll & HR</h1>
          <p className="text-sm text-gray-500 mt-0.5">Penggajian, tunjangan, kasbon, dan slip gaji</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0]"
          >
            {["Juni 2025", "Mei 2025", "April 2025", "Maret 2025"].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <button className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors">
            Proses Payroll
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Gaji Bersih", value: formatCurrency(totalNet), color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "Total Gaji Pokok", value: formatCurrency(totalBase), color: "text-gray-700", bg: "bg-white border border-gray-200" },
          { label: "Sudah Dibayar", value: DEMO_PAYROLL.filter(p => p.status === "PAID").length, color: "text-green-700", bg: "bg-green-50" },
          { label: "Belum Dibayar", value: DEMO_PAYROLL.filter(p => p.status !== "PAID").length, color: "text-orange-700", bg: "bg-orange-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "payroll", label: "Daftar Payroll" },
          { key: "kasbon", label: "Kasbon" },
          { key: "slip", label: "Slip Gaji" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
              activeTab === t.key ? "border-[#1565C0] text-[#1565C0]" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "payroll" && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-700">Periode: {period} — {DEMO_PAYROLL.length} staff</p>
            <button className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export Excel
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  {["Nama", "Bandara", "Gaji Pokok", "Lembur", "Bonus", "Kasbon", "Potongan", "Total Bersih", "Status", "Aksi"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {DEMO_PAYROLL.map((p) => (
                  <tr key={p.name} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] font-bold text-xs">{p.name[0]}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.name}</p>
                          <p className="text-xs text-gray-400">{p.position}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-600">{p.airport}</td>
                    <td className="px-4 py-3.5 text-sm text-gray-800">{formatCurrency(p.base)}</td>
                    <td className="px-4 py-3.5 text-sm text-blue-600">{formatCurrency(p.overtime)}</td>
                    <td className="px-4 py-3.5 text-sm text-green-600">{formatCurrency(p.bonus)}</td>
                    <td className="px-4 py-3.5 text-sm text-red-500">-{formatCurrency(p.kasbon)}</td>
                    <td className="px-4 py-3.5 text-sm text-red-500">-{formatCurrency(p.deductions)}</td>
                    <td className="px-4 py-3.5 text-sm font-bold text-[#1565C0]">{formatCurrency(p.net)}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button className="text-xs font-semibold text-[#1565C0] hover:underline">Slip</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={7} className="px-4 py-3 text-sm font-bold text-gray-700 text-right">TOTAL PAYROLL:</td>
                  <td className="px-4 py-3 text-sm font-black text-[#1565C0]">{formatCurrency(totalNet)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {activeTab === "kasbon" && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="font-semibold text-gray-700">Daftar Kasbon Aktif</p>
            <button className="flex items-center gap-2 bg-[#E53935] text-white px-3 py-2 rounded-xl text-sm font-semibold hover:bg-[#B71C1C] transition-colors">
              + Kasbon Baru
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Nama", "Bandara", "Total Kasbon", "Sisa", "Cicilan/Bulan", "Tujuan", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: "Rina Sari", airport: "BTH001", total: 2000000, sisa: 1200000, cicilan: 400000, tujuan: "Kebutuhan keluarga", status: "ACTIVE" },
                  { name: "Teguh Wibowo", airport: "PKU001", total: 5000000, sisa: 5000000, cicilan: 500000, tujuan: "Biaya sekolah", status: "ACTIVE" },
                  { name: "Budi Santoso", airport: "UPG001", total: 1500000, sisa: 0, cicilan: 500000, tujuan: "Kesehatan", status: "PAID" },
                ].map((k) => (
                  <tr key={k.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold">{k.name}</td>
                    <td className="px-4 py-3 text-gray-600">{k.airport}</td>
                    <td className="px-4 py-3">{formatCurrency(k.total)}</td>
                    <td className="px-4 py-3 font-bold text-red-600">{formatCurrency(k.sisa)}</td>
                    <td className="px-4 py-3">{formatCurrency(k.cicilan)}</td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]">{k.tujuan}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${k.status === "PAID" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>{k.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "slip" && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-6 text-center py-12">
          <div className="w-16 h-16 rounded-2xl bg-[#1565C0]/10 flex items-center justify-center mx-auto mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="1.5" className="w-8 h-8">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <p className="font-bold text-gray-700">Generator Slip Gaji</p>
          <p className="text-sm text-gray-400 mt-1">Pilih staff dan periode untuk generate slip gaji PDF & WhatsApp</p>
          <div className="flex flex-wrap gap-3 justify-center mt-4">
            {DEMO_PAYROLL.map((p) => (
              <div key={p.name} className="border border-gray-200 rounded-xl px-4 py-3 text-left min-w-[200px] hover:border-[#1565C0] hover:bg-blue-50 cursor-pointer transition-colors">
                <p className="font-semibold text-sm text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">{p.airport} · {formatCurrency(p.net)}</p>
                <div className="flex gap-2 mt-2">
                  <button className="text-xs font-semibold text-[#1565C0] hover:underline">PDF</button>
                  <button className="text-xs font-semibold text-green-600 hover:underline">WhatsApp</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
