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
const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  "Draft":                { bg: "rgba(75,85,99,0.15)",    color: "#9CA3AF" },
  "Menunggu Persetujuan": { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
  "Disetujui":            { bg: "rgba(59,130,246,0.15)",  color: "#3B82F6" },
  "Ditolak":              { bg: "rgba(239,68,68,0.15)",   color: "#EF4444" },
  "Diterbitkan":          { bg: "rgba(34,197,94,0.15)",   color: "#22C55E" },
  "Diarsipkan":           { bg: "rgba(75,85,99,0.12)",    color: "#6B7280" },
};

const STATUS_ORDER = ["Draft","Menunggu Persetujuan","Disetujui","Ditolak","Diterbitkan","Diarsipkan"];

/* ─── Components ──────────────────────────────────────────────────────────── */
function StatCard({ label, value, sub, accent }: { label: string; value: number | string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl p-4" style={{
      background: accent ? `${accent}10` : "var(--bg-card)",
      border: accent ? `1px solid ${accent}33` : "1px solid var(--border)",
    }}>
      <p className="text-2xl font-black" style={{ color: accent ?? "var(--text-primary)" }}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide mt-0.5" style={{ color: "var(--text-muted)" }}>{label}</p>
      {sub && <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? { bg: "rgba(75,85,99,0.15)", color: "#6B7280" };
  return (
    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{ background: style.bg, color: style.color }}>
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
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Surat Keluar</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Document Management System · PT Rifim International Gemilang
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={reload} disabled={loading}
            className="px-3 py-2 rounded-xl text-sm disabled:opacity-50 transition-colors"
            style={{ border: "1px solid var(--border)", color: "var(--text-secondary)", background: "var(--bg-card)" }}>
            {loading ? "⟳" : "↺"}
          </button>
          {(isDirector || isCoordinator) && (
            <Link href="/surat-keluar/buat"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-colors"
              style={{ background: "#22C55E", color: "white" }}>
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
        <StatCard label="Total Surat" value={stats.total} />
        <StatCard label="Bulan Ini" value={stats.bulanIni} sub="Dibuat bulan ini" accent="#22C55E" />
        <StatCard label="Menunggu Persetujuan" value={stats.menunggu} accent={stats.menunggu > 0 ? "#F59E0B" : undefined} />
        <StatCard label="Diterbitkan" value={stats.diterbitkan} accent="#3B82F6" />
        <StatCard label="Diarsipkan" value={stats.arsip} />
      </div>

      {/* Director: Pending Approval CTA */}
      {isDirector && stats.menunggu > 0 && (
        <div className="rounded-xl px-5 py-4 flex items-center justify-between"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)" }}>
          <div>
            <p className="font-bold" style={{ color: "#F59E0B" }}>{stats.menunggu} surat menunggu persetujuan Anda</p>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>Klik pada baris surat untuk approve/tolak</p>
          </div>
          <button onClick={() => setFilterStatus("Menunggu Persetujuan")}
            className="px-4 py-2 rounded-xl font-bold text-sm text-black"
            style={{ background: "#F59E0B" }}>
            Lihat Sekarang
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }}>
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nomor, perihal, tujuan..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl focus:outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }} />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm rounded-xl px-3 py-2 focus:outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <option value="ALL">Semua Status</option>
          {STATUS_ORDER.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {isDirector && (
          <select value={filterLokasi} onChange={e => setFilterLokasi(e.target.value)}
            className="text-sm rounded-xl px-3 py-2 focus:outline-none"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
            <option value="ALL">Semua Lokasi</option>
            {lokasiList.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        )}
        <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
          className="text-sm rounded-xl px-3 py-2 focus:outline-none"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
          <option value="ALL">Semua Jenis</option>
          {jenisSurat.map(j => <option key={j.id} value={j.kode_surat}>{j.kode_surat} — {j.nama_surat}</option>)}
        </select>
        <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{filtered.length} surat</span>
      </div>

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--border)" }}>
                {["Nomor Surat","Jenis","Perihal","Tujuan","Lokasi","Tanggal","Status",""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: "var(--text-muted)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
              {filtered.map(r => (
                <tr key={r.id} className="hover:bg-white/3 transition-colors cursor-pointer group"
                  onClick={() => window.location.href = `/surat-keluar/${r.id}`}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                      {r.nomor_surat ?? <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Draft</span>}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E" }}>
                      {r.jenis_surat?.kode_surat ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium max-w-56 truncate" style={{ color: "var(--text-primary)" }}>{r.perihal}</p>
                    {r.lampiran && <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>Lamp: {r.lampiran}</p>}
                  </td>
                  <td className="px-4 py-3 max-w-40">
                    <p className="truncate" style={{ color: "var(--text-secondary)" }}>{r.tujuan}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: "rgba(255,211,0,0.12)", color: "#FFD300" }}>
                      {r.lokasi?.kode_lokasi ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                    {r.tanggal_surat ? new Date(r.tanggal_surat).toLocaleDateString("id-ID",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"
                      style={{ color: "var(--text-muted)" }}>
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <p className="text-3xl mb-2">📄</p>
                    <p className="font-semibold" style={{ color: "var(--text-muted)" }}>
                      {records.length === 0 ? "Belum ada surat keluar" : "Tidak ada hasil untuk filter ini"}
                    </p>
                    {(isDirector || isCoordinator) && (
                      <Link href="/surat-keluar/buat" className="mt-3 inline-block px-4 py-2 rounded-xl font-bold text-sm text-white"
                        style={{ background: "#22C55E" }}>
                        Buat Surat Pertama
                      </Link>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          {filtered.length} dari {records.length} surat · DMS RAOS v5
        </div>
      </div>
    </div>
  );
}
