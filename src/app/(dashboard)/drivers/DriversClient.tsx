"use client";

import { useState, useMemo } from "react";

type Driver = {
  id: string;
  driver_code: string;
  nama: string;
  nomor_hp: string | null;
  driver_type: string;
  status: string;
  airport_id: string | null;
  airports: { code: string; name: string; city: string } | null;
};

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

export default function DriversClient({ drivers }: { drivers: Driver[] }) {
  const [search, setSearch] = useState("");
  const [filterAirport, setFilterAirport] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");

  // Unique airport list from real data
  const airports = useMemo(() => {
    const map = new Map<string, string>();
    drivers.forEach((d) => {
      if (d.airports?.code) map.set(d.airports.code, d.airports.city || d.airports.name);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [drivers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drivers.filter((d) => {
      if (q && !d.nama?.toLowerCase().includes(q) && !d.driver_code?.toLowerCase().includes(q) && !d.nomor_hp?.includes(q)) return false;
      if (filterAirport && d.airports?.code !== filterAirport) return false;
      if (filterStatus && d.status !== filterStatus) return false;
      if (filterType && d.driver_type !== filterType) return false;
      return true;
    });
  }, [drivers, search, filterAirport, filterStatus, filterType]);

  const total = drivers.length;
  const aktif = drivers.filter((d) => d.status === "ACTIVE" || d.status === "ON_DUTY").length;
  const internal = drivers.filter((d) => d.driver_type === "INTERNAL").length;
  const external = drivers.filter((d) => d.driver_type === "EXTERNAL").length;

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
          { label: "Total Driver", value: total, color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "Aktif", value: aktif, color: "text-green-700", bg: "bg-green-50" },
          { label: "Internal", value: internal, color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "External", value: external, color: "text-purple-700", bg: "bg-purple-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value.toLocaleString("id-ID")}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 flex-1 min-w-[180px]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400 flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, ID, nomor HP..."
              className="bg-transparent text-sm text-gray-600 placeholder-gray-400 focus:outline-none flex-1"
            />
          </div>
          <select
            value={filterAirport}
            onChange={(e) => setFilterAirport(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-gray-700"
          >
            <option value="">Semua Bandara</option>
            {airports.map(([code, city]) => (
              <option key={code} value={code}>{code} — {city}</option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-gray-700"
          >
            <option value="">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="ON_DUTY">On Duty</option>
            <option value="OFF_DUTY">Off Duty</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="SUSPENDED">Suspended</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1565C0] text-gray-700"
          >
            <option value="">Semua Tipe</option>
            <option value="INTERNAL">Internal</option>
            <option value="EXTERNAL">External</option>
          </select>
          {(search || filterAirport || filterStatus || filterType) && (
            <button
              onClick={() => { setSearch(""); setFilterAirport(""); setFilterStatus(""); setFilterType(""); }}
              className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-2 hover:border-red-200 transition-colors"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <p className="font-semibold text-gray-700 text-sm">
            {filtered.length} driver ditemukan
            {filtered.length !== total && <span className="text-gray-400 font-normal"> dari {total} total</span>}
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
            <thead className="sticky top-0 z-10">
              <tr className="text-left border-b border-gray-100 bg-gray-50">
                {["Driver ID", "Nama", "Bandara", "No. HP", "Tipe", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
          </table>
          {/* Scrollable body */}
          <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 420px)", minHeight: "200px" }}>
            <table className="w-full">
              <tbody className="divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                      {total === 0 ? "Belum ada data driver." : "Tidak ada driver yang cocok dengan filter."}
                    </td>
                  </tr>
                ) : filtered.map((d) => (
                  <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-mono font-semibold text-gray-500 whitespace-nowrap">{d.driver_code}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] font-bold text-xs flex-shrink-0">
                          {d.nama?.[0] ?? "D"}
                        </div>
                        <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{d.nama}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">
                      {d.airports?.code ?? "-"}
                      {d.airports?.city && <span className="text-gray-400 text-xs ml-1">{d.airports.city}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 whitespace-nowrap">{d.nomor_hp ?? "-"}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TYPE_COLORS[d.driver_type] ?? "bg-gray-100 text-gray-600"}`}>
                        {d.driver_type}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[d.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <button className="p-1.5 text-gray-400 hover:text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
