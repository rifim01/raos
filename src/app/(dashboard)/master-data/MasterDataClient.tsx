"use client";

import { useState, useTransition, useMemo } from "react";

interface Airport { id: string; code: string; city: string; status: string; }
interface Staff   { id: string; staff_code: string; nama: string; jabatan: string; email?: string; gaji_pokok?: number; deposit?: number; status: string; is_active: boolean; source_sheet_url?: string; airports?: { id: string; code: string; city: string }; }
interface Driver  { id: string; driver_code: string; nama: string; driver_type: "INTERNAL"|"EXTERNAL"; status: string; is_active: boolean; source_sheet_url?: string; source_gid?: string; airports?: { id: string; code: string; city: string }; }
interface SyncLog { id: string; triggered_by: string; started_at: string; finished_at?: string; status: string; total_imported: number; total_skipped: number; total_failed: number; details: any[]; error_message?: string; }

type Tab = "staff" | "driver_int" | "driver_ext" | "sync";

function statusBadge(s: string) {
  if (s === "ACTIVE" || s === "success") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (s === "running" || s === "partial") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "INACTIVE" || s === "failed") return "bg-red-100 text-red-700 border-red-200";
  return "bg-gray-100 text-gray-500 border-gray-200";
}

function formatDur(start: string, end?: string) {
  if (!end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s/60)}m ${s%60}s`;
}

export default function MasterDataClient({ airports, staffList, driverList, syncLogs, userRoleLevel, userAirportId }: {
  airports: Airport[]; staffList: Staff[]; driverList: Driver[]; syncLogs: SyncLog[];
  userRoleLevel: number; userAirportId: string | null;
}) {
  const [tab, setTab] = useState<Tab>("staff");
  const [search, setSearch] = useState("");
  const [filterAirport, setFilterAirport] = useState("");
  const [syncing, startSync] = useTransition();
  const [syncResult, setSyncResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>(syncLogs);

  const isDirector = userRoleLevel >= 4;

  function triggerSync() {
    startSync(async () => {
      setSyncResult(null);
      try {
        const res = await fetch("/api/import/sync-all", { method: "POST" });
        const data = await res.json();
        if (data.success) {
          setSyncResult({ ok: true, msg: `Sync selesai — ${data.total_imported} data diperbarui, ${data.total_failed} gagal` });
          // refresh logs
          const logsRes = await fetch("/api/import/sync-logs");
          if (logsRes.ok) { const ld = await logsRes.json(); setLogs(ld.data ?? []); }
        } else {
          setSyncResult({ ok: false, msg: data.error ?? "Sync gagal" });
        }
      } catch (e: any) {
        setSyncResult({ ok: false, msg: e.message });
      }
      setTimeout(() => setSyncResult(null), 8000);
    });
  }

  const q = search.toLowerCase();

  const staffFiltered = useMemo(() =>
    staffList.filter(s =>
      (!filterAirport || s.airports?.id === filterAirport) &&
      (!q || s.nama.toLowerCase().includes(q) || s.staff_code.toLowerCase().includes(q) || (s.jabatan ?? "").toLowerCase().includes(q))
    ), [staffList, filterAirport, q]);

  const driverIntFiltered = useMemo(() =>
    driverList.filter(d =>
      d.driver_type === "INTERNAL" &&
      (!filterAirport || d.airports?.id === filterAirport) &&
      (!q || d.nama.toLowerCase().includes(q) || d.driver_code.includes(q))
    ), [driverList, filterAirport, q]);

  const driverExtFiltered = useMemo(() =>
    driverList.filter(d =>
      d.driver_type === "EXTERNAL" &&
      (!filterAirport || d.airports?.id === filterAirport) &&
      (!q || d.nama.toLowerCase().includes(q) || d.driver_code.includes(q))
    ), [driverList, filterAirport, q]);

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "staff",      label: "Staff",           count: staffList.length },
    { key: "driver_int", label: "Driver Airport",  count: driverList.filter(d => d.driver_type === "INTERNAL").length },
    { key: "driver_ext", label: "Driver External", count: driverList.filter(d => d.driver_type === "EXTERNAL").length },
    { key: "sync",       label: "Riwayat Sync",    count: logs.length },
  ];

  return (
    <div className="space-y-6">

      {syncResult && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl max-w-sm ${syncResult.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {syncResult.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Master Data</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Staff & Driver — single source of truth dari Google Sheets
          </p>
        </div>
        {isDirector && (
          <button
            onClick={triggerSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#FFD600] text-black font-bold text-sm hover:bg-yellow-400 disabled:opacity-60 shadow-md shadow-yellow-200"
          >
            {syncing ? (
              <>
                <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Menyinkronkan...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" width="16" height="16">
                  <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/>
                  <path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                Sync dari Google Sheets
              </>
            )}
          </button>
        )}
      </div>

      {/* Stats cards per bandara */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {airports.map(ap => {
          const stf = staffList.filter(s => s.airports?.id === ap.id).length;
          const drv = driverList.filter(d => d.airports?.id === ap.id && d.driver_type === "INTERNAL").length;
          const ext = driverList.filter(d => d.airports?.id === ap.id && d.driver_type === "EXTERNAL").length;
          return (
            <div key={ap.id} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
              <p className="font-black text-gray-800 text-sm truncate">✈ {ap.city}</p>
              <p className="text-xs text-gray-400 font-mono mt-0.5">{ap.code}</p>
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-xs"><span className="text-gray-500">Staff</span><span className="font-bold text-gray-700">{stf}</span></div>
                <div className="flex justify-between text-xs"><span className="text-gray-500">Driver AP</span><span className="font-bold text-blue-600">{drv}</span></div>
                {ext > 0 && <div className="flex justify-between text-xs"><span className="text-gray-500">Driver Ext</span><span className="font-bold text-indigo-600">{ext}</span></div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${tab === t.key ? "border-[#FFD600] text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${tab === t.key ? "bg-[#FFD600] text-black" : "bg-gray-100 text-gray-500"}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        {tab !== "sync" && (
          <div className="px-5 py-3 border-b border-gray-100 flex gap-3 flex-wrap">
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder={tab === "staff" ? "Cari nama / kode staff..." : "Cari nama / ID driver..."}
              className="flex-1 min-w-48 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
            {isDirector && (
              <select value={filterAirport} onChange={e => setFilterAirport(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 bg-white">
                <option value="">Semua Bandara</option>
                {airports.map(a => <option key={a.id} value={a.id}>{a.city}</option>)}
              </select>
            )}
          </div>
        )}

        {/* ─── Tab: STAFF ─── */}
        {tab === "staff" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">ID Staff</th>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Jabatan</th>
                  <th className="px-4 py-3 text-left">Bandara</th>
                  <th className="px-4 py-3 text-right">Gaji Pokok</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {staffFiltered.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{s.staff_code}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{s.nama}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{s.jabatan}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold text-gray-600">
                        {s.airports?.city ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 text-xs">
                      {s.gaji_pokok ? `Rp ${s.gaji_pokok.toLocaleString("id-ID")}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {staffFiltered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Tidak ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Tab: DRIVER INTERNAL ─── */}
        {tab === "driver_int" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">ID Driver (Maxim)</th>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Bandara</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {driverIntFiltered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.driver_code}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{d.nama}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-600">{d.airports?.city ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {driverIntFiltered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Tidak ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Tab: DRIVER EXTERNAL ─── */}
        {tab === "driver_ext" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">ID Driver (Maxim)</th>
                  <th className="px-4 py-3 text-left">Nama</th>
                  <th className="px-4 py-3 text-left">Cabang (External)</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {driverExtFiltered.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{d.driver_code}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{d.nama}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-indigo-600">{d.airports?.city ?? "—"} Luar</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${statusBadge(d.status)}`}>
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {driverExtFiltered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400">Tidak ada data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ─── Tab: SYNC HISTORY ─── */}
        {tab === "sync" && (
          <div className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <div className="px-5 py-12 text-center text-gray-400">
                <p className="text-3xl mb-2">🔄</p>
                <p>Belum ada riwayat sync</p>
              </div>
            )}
            {logs.map(log => (
              <div key={log.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusBadge(log.status)}`}>
                      {log.status.toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(log.started_at).toLocaleString("id-ID", { day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit" })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Durasi: {formatDur(log.started_at, log.finished_at)} · Trigger: {log.triggered_by}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs">
                    <div className="text-center">
                      <p className="font-black text-emerald-600">{log.total_imported}</p>
                      <p className="text-gray-400">Diperbarui</p>
                    </div>
                    <div className="text-center">
                      <p className="font-black text-gray-400">{log.total_skipped}</p>
                      <p className="text-gray-400">Dilewati</p>
                    </div>
                    <div className="text-center">
                      <p className={`font-black ${log.total_failed > 0 ? "text-red-500" : "text-gray-300"}`}>{log.total_failed}</p>
                      <p className="text-gray-400">Gagal</p>
                    </div>
                  </div>
                </div>
                {log.error_message && (
                  <p className="mt-2 text-xs text-red-500 bg-red-50 rounded-lg px-3 py-1.5">{log.error_message}</p>
                )}
                {Array.isArray(log.details) && log.details.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {log.details.map((d: any, i: number) => (
                      <span key={i} className={`px-2 py-0.5 rounded-md text-xs font-medium ${d.error ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"}`}>
                        {d.type} {d.airport} {d.error ? `⚠ ${d.error}` : `+${d.imported ?? 0}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Note tentang RIF0125 ─── */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
        <p className="text-sm font-bold text-amber-800">⚠ Perlu Tindak Lanjut Manual</p>
        <p className="text-xs text-amber-700 mt-1">
          ID Staff <code className="bg-amber-100 px-1 rounded">RIF0125</code> dipakai oleh 2 orang berbeda di Google Sheet:
          <strong> Audra Agung Pratama</strong> dan <strong>Dwi Fitrianti</strong> (keduanya Batam).
          Satu dari keduanya memiliki ID yang salah. Koreksi langsung di Google Sheet Batam,
          lalu tekan <em>Sync dari Google Sheets</em> untuk memperbarui database.
        </p>
      </div>
    </div>
  );
}
