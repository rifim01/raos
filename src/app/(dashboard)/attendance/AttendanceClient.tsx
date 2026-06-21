"use client";

import { useState } from "react";

export type DailyRecord = {
  staff_id: string;
  staff_code: string;
  nama: string;
  jabatan: string;
  airport_code: string;
  waktu_masuk: string | null;
  waktu_keluar: string | null;
  masuk_valid: boolean;
  keluar_valid: boolean;
  status: "HADIR" | "TERLAMBAT" | "ALPHA";
  durasi_menit: number | null;
};

export type MonthlyRecord = {
  staff_id: string;
  nama: string;
  airport_code: string;
  hadir: number;
  terlambat: number;
  alpha: number;
  pct_kehadiran: number;
};

type Props = {
  records: DailyRecord[];
  totalStaff: number;
  todayLabel: string;
  monthly: MonthlyRecord[];
  syncKey: string;
};

const STATUS_COLORS: Record<string, string> = {
  HADIR: "bg-green-100 text-green-700",
  TERLAMBAT: "bg-orange-100 text-orange-700",
  ALPHA: "bg-red-100 text-red-700",
  LEAVE: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS: Record<string, string> = {
  HADIR: "HADIR",
  TERLAMBAT: "TERLAMBAT",
  ALPHA: "ALPHA",
};

function formatTime(ts: string | null) {
  if (!ts) return "-";
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

export default function AttendanceClient({ records, totalStaff, todayLabel, monthly, syncKey }: Props) {
  const [activeTab, setActiveTab] = useState<"today" | "report" | "sync">("today");

  const hadir = records.filter((r) => r.status === "HADIR").length;
  const terlambat = records.filter((r) => r.status === "TERLAMBAT").length;
  const alpha = totalStaff - hadir - terlambat;

  const TABS = [
    { key: "today", label: "Absensi Hari Ini" },
    { key: "report", label: "Laporan Bulanan" },
    { key: "sync", label: "Integrasi Rifim Attendance" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{todayLabel}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export Laporan
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Staff", value: totalStaff, color: "text-gray-700", bg: "bg-white border border-gray-200" },
          { label: "Hadir", value: hadir, color: "text-green-700", bg: "bg-green-50" },
          { label: "Terlambat", value: terlambat, color: "text-orange-700", bg: "bg-orange-50" },
          { label: "Tidak Hadir", value: Math.max(0, alpha), color: "text-red-700", bg: "bg-red-50" },
          { label: "Terdata Hari Ini", value: records.length, color: "text-blue-700", bg: "bg-blue-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
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

      {/* Today Tab */}
      {activeTab === "today" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mb-3">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <p className="text-sm font-medium">Belum ada data absensi hari ini</p>
              <p className="text-xs mt-1">Data akan muncul setelah staff check-in via Rifim Attendance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    {["Nama", "Jabatan", "Bandara", "Check-in", "Check-out", "Durasi", "GPS", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {records.map((r) => (
                    <tr key={r.staff_id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] font-bold text-xs flex-shrink-0">
                            {r.nama[0]}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{r.nama}</p>
                            <p className="text-xs text-gray-400">{r.staff_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{r.jabatan}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{r.airport_code}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{formatTime(r.waktu_masuk)}</td>
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-800">{formatTime(r.waktu_keluar)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {r.durasi_menit ? `${Math.floor(r.durasi_menit / 60)}j ${r.durasi_menit % 60}m` : "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        {r.masuk_valid ? (
                          <span className="text-xs font-semibold text-green-600">✓ Valid</span>
                        ) : (
                          <span className="text-xs font-semibold text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[r.status] ?? "bg-gray-100 text-gray-600"}`}
                        >
                          {STATUS_LABELS[r.status] ?? r.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Monthly Report Tab */}
      {activeTab === "report" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {monthly.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Belum ada data bulan ini. Data akan tersedia setelah staff melakukan absensi.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {["Nama", "Bandara", "Hadir", "Terlambat", "Alpha", "% Kehadiran"].map((h) => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthly.map((r) => (
                    <tr key={r.staff_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{r.nama}</td>
                      <td className="px-4 py-3 text-gray-500">{r.airport_code}</td>
                      <td className="px-4 py-3 text-green-700 font-semibold">{r.hadir}</td>
                      <td className="px-4 py-3 text-orange-600">{r.terlambat}</td>
                      <td className="px-4 py-3 text-red-600">{r.alpha}</td>
                      <td className="px-4 py-3 font-bold text-[#1565C0]">{r.pct_kehadiran}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sync / Integration Tab */}
      {activeTab === "sync" && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
            <h3 className="font-bold text-blue-900 text-base mb-1">Integrasi dengan Rifim Attendance</h3>
            <p className="text-sm text-blue-700 mb-4">
              Rifim Attendance (aplikasi mobile staff) dapat mengirim data absensi langsung ke RAOS melalui API
              berikut. Tambahkan kode ini ke file JavaScript Rifim Attendance.
            </p>
            <div className="bg-white rounded-xl border border-blue-200 p-4 font-mono text-xs text-gray-700 overflow-x-auto">
              <pre>{`// Tambahkan fungsi ini ke Rifim Attendance
const RAOS_SYNC_URL = "https://raos-ten.vercel.app/api/attendance/sync";
const RAOS_SYNC_KEY = "${syncKey}";

async function syncToRAOS(data) {
  try {
    const res = await fetch(RAOS_SYNC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sync-Key": RAOS_SYNC_KEY,
      },
      body: JSON.stringify({
        staff_code: data.staffCode,   // atau: nama: data.namaStaff
        nama: data.namaStaff,
        airport_code: data.kode_bandara,  // contoh: "BTH001"
        check_type: data.jenis,           // "CHECK_IN" atau "CHECK_OUT"
        latitude: data.lat,
        longitude: data.lng,
        photo_url: data.fotoUrl,
        device_info: navigator.userAgent,
        notes: data.catatan ?? "",
      }),
    });
    const result = await res.json();
    console.log("RAOS sync:", result);
    return result;
  } catch (err) {
    console.warn("RAOS sync gagal (non-fatal):", err);
  }
}

// Panggil saat check-in (setelah simpan ke Firebase):
// await syncToRAOS({ staffCode: "STF001", namaStaff: "Rina Sari",
//   kode_bandara: "BTH001", jenis: "CHECK_IN", lat: 1.12, lng: 104.11, fotoUrl: photoUrl });`}</pre>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-gray-800">Endpoint API Sinkronisasi</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <span className="bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded text-xs self-start mt-0.5">POST</span>
                <div>
                  <p className="font-mono text-gray-700">/api/attendance/sync</p>
                  <p className="text-gray-500 text-xs mt-0.5">Kirim data check-in / check-out dari Rifim Attendance ke Supabase RAOS</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Header yang Diperlukan</p>
              <div className="font-mono text-xs bg-gray-50 rounded-lg p-3 space-y-1 text-gray-700">
                <div><span className="text-purple-600">Content-Type:</span> application/json</div>
                <div><span className="text-purple-600">X-Sync-Key:</span> {syncKey}</div>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Field Wajib</p>
              <div className="space-y-1.5 text-xs text-gray-600">
                <div className="flex gap-2"><code className="bg-gray-100 px-1 rounded font-mono">airport_code</code><span>Kode bandara: BTH001, PKU001, dll.</span></div>
                <div className="flex gap-2"><code className="bg-gray-100 px-1 rounded font-mono">check_type</code><span>CHECK_IN atau CHECK_OUT</span></div>
                <div className="flex gap-2"><code className="bg-gray-100 px-1 rounded font-mono">staff_code</code><span>atau <code className="bg-gray-100 px-1 rounded font-mono">nama</code> — untuk lookup staff</span></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
