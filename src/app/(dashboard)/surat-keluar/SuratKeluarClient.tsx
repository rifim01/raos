"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Surat {
  id: string; nomor_surat: string | null; perihal: string; tujuan: string;
  status: string; tanggal_surat: string; lampiran: string | null; created_at: string;
  jenis_surat: { kode_surat: string; nama_surat: string } | null;
  lokasi: { kode_lokasi: string; nama_lokasi: string } | null;
}
interface Lokasi { id: string; kode_lokasi: string; nama_lokasi: string; status: string; }
interface JenisSurat { id: string; kode_surat: string; nama_surat: string; }
interface Penandatangan { id: string; nama: string; jabatan: string; lokasi: string; ttd_url: string | null; }
interface Me { id: string; role_id: number; airport_id: string; full_name: string; }

/* ─── Constants ───────────────────────────────────────────────────────────── */
const STATUS_STYLE: Record<string, string> = {
  "Draft":                "bg-gray-100 text-gray-600 border-gray-200",
  "Menunggu Persetujuan": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Disetujui":            "bg-blue-100 text-blue-700 border-blue-200",
  "Ditolak":              "bg-red-100 text-red-700 border-red-200",
  "Diterbitkan":          "bg-green-100 text-green-700 border-green-200",
  "Diarsipkan":           "bg-gray-200 text-gray-500 border-gray-300",
};

const STATUS_ORDER = ["Draft","Menunggu Persetujuan","Disetujui","Ditolak","Diterbitkan","Diarsipkan"];

/* ─── Components ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${color}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide opacity-70 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] opacity-50 mt-0.5">{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {status}
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
interface Props {
  suratList: Surat[]; lokasi: Lokasi[]; jenisSurat: JenisSurat[];
  penandatangan: Penandatangan[]; pengaturan: any;
  me: Me; isDirector: boolean; isCoordinator: boolean; userLokasiId: string | null;
}

export default function SuratKeluarClient({
  suratList, lokasi, jenisSurat, me, isDirector, isCoordinator,
}: Props) {
  const supabase = createClient();
  const [records, setRecords] = useState<Surat[]>(suratList);
  const [search,  setSearch]  = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterLokasi, setFilterLokasi] = useState("ALL");
  const [filterJenis,  setFilterJenis]  = useState("ALL");
  const [loading, setLoading] = useState(false);

  /* ── Stats ────────────────────────────────── */
  const now = new Date();
  const bulanIni = now.getMonth();
  const tahunIni = now.getFullYear();

  const stats = useMemo(() => ({
    total:      records.length,
    bulanIni:   records.filter(r => {
      const d = new Date(r.created_at);
      return d.getMonth() === bulanIni && d.getFullYear() === tahunIni;
    }).length,
    menunggu:   records.filter(r => r.status === "Menunggu Persetujuan").length,
    diterbitkan: records.filter(r => r.status === "Diterbitkan").length,
    arsip:      records.filter(r => r.status === "Diarsipkan").length,
  }), [records, bulanIni, tahunIni]);

  /* ── Filter ────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter(r => {
      if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
      if (filterLokasi !== "ALL" && r.lokasi?.kode_lokasi !== filterLokasi) return false;
      if (filterJenis  !== "ALL" && r.jenis_surat?.kode_surat !== filterJenis) return false;
      if (q && ![r.nomor_surat, r.perihal, r.tujuan].some(v => v?.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [records, search, filterStatus, filterLokasi, filterJenis]);

  /* ── Load more ─────────────────────────────── */
  const reload = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("surat_keluar")
      .select(`id,nomor_surat,perihal,tujuan,status,tanggal_surat,lampiran,created_at,
        jenis_surat:jenis_surat_id(kode_surat,nama_surat),
        lokasi:lokasi_id(kode_lokasi,nama_lokasi)`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200);
    setRecords(data ?? []);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lokasiList = useMemo(() => {
    const s = new Set(records.map(r => r.lokasi?.kode_lokasi).filter(Boolean) as string[]);
    return [...s];
  }, [records]);

  /* ── Render ───────────────────────────────── */
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Surat Keluar</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Document Management System · PT Rifim International Gemilang
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} disabled={loading}
            className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {loading ? "⟳" : "↺"}
          </button>
          {(isDirector || isCoordinator) && (
            <Link href="/surat-keluar/buat"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 transition-colors shadow-md shadow-green-100">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Buat Surat
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Surat" value={stats.total} color="bg-white border-gray-100 text-gray-800" />
        <StatCard label="Bulan Ini"   value={stats.bulanIni} color="bg-green-50 border-green-100 text-green-800" sub="Dibuat bulan ini" />
        <StatCard label="Menunggu Persetujuan" value={stats.menunggu} color={stats.menunggu > 0 ? "bg-yellow-50 border-yellow-200 text-yellow-800" : "bg-white border-gray-100 text-gray-500"} />
        <StatCard label="Diterbitkan" value={stats.diterbitkan} color="bg-emerald-50 border-emerald-100 text-emerald-800" />
        <StatCard label="Diarsipkan"  value={stats.arsip} color="bg-gray-50 border-gray-200 text-gray-600" />
      </div>

      {/* Director: Pending Approval CTA */}
      {isDirector && stats.menunggu > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-5 py-4 flex items-center justify-between">
          <div>
            <p className="font-bold text-yellow-800">{stats.menunggu} surat menunggu persetujuan Anda</p>
            <p className="text-xs text-yellow-600 mt-0.5">Klik pada baris surat untuk approve/tolak</p>
          </div>
          <button onClick={() => setFilterStatus("Menunggu Persetujuan")}
            className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-bold text-sm hover:bg-yellow-600">
            Lihat Sekarang
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nomor, perihal, tujuan..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-300 bg-white" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300">
          <option value="ALL">Semua Status</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isDirector && (
          <select value={filterLokasi} onChange={e => setFilterLokasi(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300">
            <option value="ALL">Semua Lokasi</option>
            {lokasiList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        )}
        <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-300">
          <option value="ALL">Semua Jenis</option>
          {jenisSurat.map(j => <option key={j.id} value={j.kode_surat}>{j.kode_surat} — {j.nama_surat}</option>)}
        </select>
        <span className="text-xs text-gray-400 font-medium">{filtered.length} surat</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Nomor Surat","Jenis","Perihal","Tujuan","Lokasi","Tanggal","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-gray-400 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-green-50/30 transition-colors cursor-pointer group"
                  onClick={() => window.location.href = `/surat-keluar/${r.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                      {r.nomor_surat ?? <span className="text-gray-300 italic">Draft</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-green-50 text-green-700 border border-green-100">
                      {r.jenis_surat?.kode_surat ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800 max-w-56 truncate">{r.perihal}</p>
                    {r.lampiran && <p className="text-[11px] text-gray-400">Lamp: {r.lampiran}</p>}
                  </td>
                  <td className="px-4 py-3 max-w-40">
                    <p className="text-gray-600 truncate">{r.tujuan}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                      {r.lokasi?.kode_lokasi ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    {r.tanggal_surat ? new Date(r.tanggal_surat).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className="w-4 h-4 text-gray-300 group-hover:text-green-600 transition-colors">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-3xl mb-2">📄</p>
                    <p className="font-semibold text-gray-400">
                      {records.length === 0 ? "Belum ada surat keluar" : "Tidak ada hasil untuk filter ini"}
                    </p>
                    {isDirector || isCoordinator
                      ? <Link href="/surat-keluar/buat" className="mt-3 inline-block px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800">
                          Buat Surat Pertama
                        </Link>
                      : null}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
          {filtered.length} dari {records.length} surat · DMS RAOS v5
        </div>
      </div>
    </div>
  );
}
