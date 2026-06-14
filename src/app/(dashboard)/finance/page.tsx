"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

const INCOME = [
  { date: "2025-06-01", category: "Jasa Angkutan", amount: 45000000, source: "BTH001", desc: "Pendapatan jasa antar terminal" },
  { date: "2025-06-02", category: "Pendapatan External", amount: 12000000, source: "BTH001", desc: "Driver external Batam" },
  { date: "2025-06-03", category: "Jasa Angkutan", amount: 38000000, source: "UPG001", desc: "Pendapatan harian Makassar" },
  { date: "2025-06-04", category: "Komisi", amount: 8500000, source: "PKU001", desc: "Komisi mitra Pekanbaru" },
];

const EXPENSE = [
  { date: "2025-06-01", category: "Operasional", amount: 8000000, vendor: "Pertamina", desc: "BBM kendaraan operasional" },
  { date: "2025-06-02", category: "Gaji", amount: 45000000, vendor: "Staff", desc: "Payroll Juni BTH001" },
  { date: "2025-06-03", category: "Perawatan", amount: 3500000, vendor: "Bengkel", desc: "Service kendaraan" },
];

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<"overview" | "income" | "expense" | "bills">("overview");

  const totalIncome = INCOME.reduce((s, i) => s + i.amount, 0);
  const totalExpense = EXPENSE.reduce((s, e) => s + e.amount, 0);
  const profit = totalIncome - totalExpense;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Finance Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pemasukan, pengeluaran, tagihan, dan laporan keuangan</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors">
          + Transaksi Baru
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Pemasukan", value: formatCurrency(totalIncome), change: "+8.3%", color: "text-green-700", bg: "from-green-500 to-emerald-600", icon: "↑" },
          { label: "Total Pengeluaran", value: formatCurrency(totalExpense), change: "-2.1%", color: "text-red-400", bg: "from-red-500 to-rose-600", icon: "↓" },
          { label: "Profit Bersih", value: formatCurrency(profit), change: "+12.5%", color: "text-yellow-300", bg: "from-[#1565C0] to-blue-700", icon: "=" },
        ].map((s) => (
          <div key={s.label} className={`bg-gradient-to-br ${s.bg} rounded-2xl p-5 text-white shadow-lg`}>
            <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">{s.label}</p>
            <p className="text-2xl font-black mt-2">{s.value}</p>
            <p className={`text-sm font-semibold mt-1 ${s.color}`}>{s.change} vs bulan lalu</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[
          { key: "overview", label: "Overview" },
          { key: "income", label: "Pemasukan" },
          { key: "expense", label: "Pengeluaran" },
          { key: "bills", label: "Tagihan" },
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

      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Income breakdown */}
          <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Pemasukan per Kategori</h3>
            <div className="space-y-3">
              {[
                { cat: "Jasa Angkutan", amount: 83000000, pct: 62 },
                { cat: "Pendapatan External", amount: 24000000, pct: 18 },
                { cat: "Komisi", amount: 16500000, pct: 12 },
                { cat: "Lainnya", amount: 10800000, pct: 8 },
              ].map((c) => (
                <div key={c.cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{c.cat}</span>
                    <span className="text-sm font-bold text-gray-800">{formatCurrency(c.amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-[#1565C0] rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Expense breakdown */}
          <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
            <h3 className="font-bold text-gray-800 mb-4">Pengeluaran per Kategori</h3>
            <div className="space-y-3">
              {[
                { cat: "Gaji & HR", amount: 45000000, pct: 55 },
                { cat: "Operasional", amount: 22000000, pct: 27 },
                { cat: "Perawatan", amount: 10000000, pct: 12 },
                { cat: "Lainnya", amount: 5000000, pct: 6 },
              ].map((c) => (
                <div key={c.cat}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{c.cat}</span>
                    <span className="text-sm font-bold text-gray-800">{formatCurrency(c.amount)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-[#E53935] rounded-full" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {(activeTab === "income" || activeTab === "expense") && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-700">{activeTab === "income" ? "Daftar Pemasukan" : "Daftar Pengeluaran"}</p>
            <button className={`flex items-center gap-2 text-white px-3 py-1.5 rounded-lg text-sm font-semibold ${activeTab === "income" ? "bg-green-600" : "bg-red-600"}`}>
              + {activeTab === "income" ? "Pemasukan" : "Pengeluaran"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Tanggal", "Kategori", "Jumlah", activeTab === "income" ? "Sumber" : "Vendor", "Keterangan"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(activeTab === "income" ? INCOME : EXPENSE).map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{item.date}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${activeTab === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.category}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-bold ${activeTab === "income" ? "text-green-700" : "text-red-600"}`}>
                      {activeTab === "income" ? "+" : "-"}{formatCurrency(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{activeTab === "income" ? (item as any).source : (item as any).vendor}</td>
                    <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">{item.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "bills" && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5">
          <h3 className="font-bold text-gray-800 mb-4">Tagihan Tertunda</h3>
          <div className="space-y-3">
            {[
              { title: "Sewa Gedung Operasional BTH001", amount: 12000000, due: "2025-06-30", status: "UNPAID" },
              { title: "Langganan GPS Tracker", amount: 2500000, due: "2025-06-15", status: "UNPAID" },
              { title: "Listrik Kantor UPG001", amount: 1800000, due: "2025-06-20", status: "PAID" },
              { title: "Internet & Komunikasi", amount: 800000, due: "2025-07-01", status: "UNPAID" },
            ].map((b) => (
              <div key={b.title} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="font-semibold text-sm text-gray-800">{b.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Jatuh tempo: {b.due}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-bold text-gray-800">{formatCurrency(b.amount)}</p>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${b.status === "PAID" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{b.status}</span>
                  {b.status === "UNPAID" && (
                    <button className="text-xs font-bold text-white bg-[#1565C0] hover:bg-[#0D47A1] px-3 py-1.5 rounded-lg transition-colors">Bayar</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
