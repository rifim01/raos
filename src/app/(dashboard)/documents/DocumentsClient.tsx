"use client";

import { useState, useMemo, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

/* ─── Types ─────────────────────────────────────────────────── */
interface SuratRow {
  id: string;
  nomor_surat: string | null;
  perihal: string | null;
  tujuan: string | null;
  status: string;
  tanggal_surat: string;
  created_at: string;
  jenis_surat: { kode_surat: string; nama_surat: string } | null;
  lokasi: { kode_lokasi: string; nama_lokasi: string } | null;
  penandatangan: { nama: string; jabatan: string } | null;
  pembuat: { full_name: string } | null;
}

interface JenisSurat { id: string; kode_surat: string; nama_surat: string; }
interface LokasiSurat { id: string; kode_lokasi: string; nama_lokasi: string; }
interface Penandatangan { id: string; nama: string; jabatan: string; }

interface Props {
  suratList: SuratRow[];
  jenisList: JenisSurat[];
  lokasiList: LokasiSurat[];
  penandatanganList: Penandatangan[];
  userRoleLevel: number;
  userId: string;
}

/* ─── Constants ──────────────────────────────────────────────── */
const BULAN_ROMAWI = ["","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const STATUS_COLORS: Record<string, string> = {
  "Draft":                 "bg-gray-100 text-gray-600 border-gray-200",
  "Menunggu Persetujuan":  "bg-amber-100 text-amber-700 border-amber-200",
  "Disetujui":             "bg-blue-100 text-blue-700 border-blue-200",
  "Ditolak":               "bg-red-100 text-red-700 border-red-200",
  "Diterbitkan":           "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Diarsipkan":            "bg-slate-100 text-slate-600 border-slate-200",
};

/* ─── Generate nomor surat ───────────────────────────────────── */
async function generateNomor(supabase: any, jenisKode: string, lokasiKode: string, bulan: number, tahun: number): Promise<string> {
  const prefix = `%/${jenisKode}/${lokasiKode}/MIG/${BULAN_ROMAWI[bulan]}/${tahun}`;
  const { data } = await supabase
    .from("surat_keluar")
    .select("nomor_urut")
    .like("nomor_surat", prefix)
    .order("nomor_urut", { ascending: false })
    .limit(1);
  const lastNo = data?.[0]?.nomor_urut ?? 0;
  const nextNo = lastNo + 1;
  return `${String(nextNo).padStart(3, "0")}/${jenisKode}/${lokasiKode}/MIG/${BULAN_ROMAWI[bulan]}/${tahun}`;
}

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div className={`rounded-2xl border p-5 flex items-center gap-4 ${color}`}>
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-3xl font-black">{value}</p>
        <p className="text-xs font-bold uppercase tracking-wide mt-0.5 opacity-70">{label}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function DocumentsClient({ suratList, jenisList, lokasiList, penandatanganList, userRoleLevel, userId }: Props) {
  const [rows, setRows] = useState<SuratRow[]>(suratList);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterLokasi, setFilterLokasi] = useState("ALL");
  const [filterJenis, setFilterJenis] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, startSave] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const supabase = createClient();

  /* ─── Form state ─────────────────────────────── */
  const [form, setForm] = useState({
    jenis_surat_id: "", lokasi_id: "", perihal: "", tujuan: "", isi_surat: "",
    signed_by: "", tanggal_surat: new Date().toISOString().split("T")[0],
  });
  const [nomorPreview, setNomorPreview] = useState("");

  async function onJenisOrLokasiChange(newForm: typeof form) {
    const jenis = jenisList.find(j => j.id === newForm.jenis_surat_id);
    const lokasi = lokasiList.find(l => l.id === newForm.lokasi_id);
    if (jenis && lokasi) {
      const now = new Date(newForm.tanggal_surat);
      const b = now.getMonth() + 1;
      const y = now.getFullYear();
      const nomor = await generateNomor(supabase, jenis.kode_surat, lokasi.kode_lokasi, b, y);
      setNomorPreview(nomor);
    } else {
      setNomorPreview("");
    }
  }

  /* ─── Filtered rows ──────────────────────────── */
  const filtered = useMemo(() => {
    return rows.filter(r => {
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const matchLokasi = filterLokasi === "ALL" || r.lokasi?.kode_lokasi === filterLokasi;
      const matchJenis  = filterJenis  === "ALL" || r.jenis_surat?.kode_surat === filterJenis;
      const matchSearch = !search || (r.perihal ?? "").toLowerCase().includes(search.toLowerCase())
        || (r.nomor_surat ?? "").toLowerCase().includes(search.toLowerCase())
        || (r.tujuan ?? "").toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchLokasi && matchJenis && matchSearch;
    });
  }, [rows, filterStatus, filterLokasi, filterJenis, search]);

  /* ─── Stats ──────────────────────────────────── */
  const now = new Date();
  const bulanIni = rows.filter(r => new Date(r.created_at).getMonth() === now.getMonth() && new Date(r.created_at).getFullYear() === now.getFullYear()).length;
  const menunggu  = rows.filter(r => r.status === "Menunggu Persetujuan").length;
  const diterbitkan = rows.filter(r => r.status === "Diterbitkan").length;
  const arsip     = rows.filter(r => r.status === "Diarsipkan").length;

  /* ─── Save surat baru ────────────────────────── */
  function handleSave() {
    startSave(async () => {
      if (!form.jenis_surat_id || !form.lokasi_id || !form.perihal) {
        setToast({ msg: "Jenis surat, lokasi, dan perihal wajib diisi", ok: false });
        return;
      }
      const jenis = jenisList.find(j => j.id === form.jenis_surat_id);
      const lokasi = lokasiList.find(l => l.id === form.lokasi_id);
      const d = new Date(form.tanggal_surat);
      const b = d.getMonth() + 1;
      const y = d.getFullYear();
      const nomor = nomorPreview || await generateNomor(supabase, jenis!.kode_surat, lokasi!.kode_lokasi, b, y);

      const { count } = await (supabase as any)
        .from("surat_keluar")
        .select("*", { count: "exact", head: true })
        .like("nomor_surat", `%/${jenis!.kode_surat}/${lokasi!.kode_lokasi}/MIG/${BULAN_ROMAWI[b]}/${y}`);

      const { data: inserted, error } = await (supabase as any)
        .from("surat_keluar")
        .insert({
          ...form,
          nomor_surat: nomor,
          nomor_urut: (count ?? 0) + 1,
          status: "Draft",
          created_by: userId,
          signed_by: form.signed_by || null,
        })
        .select(`id, nomor_surat, perihal, tujuan, status, tanggal_surat, created_at,
          jenis_surat:jenis_surat_id(kode_surat, nama_surat),
          lokasi:lokasi_id(kode_lokasi, nama_lokasi),
          penandatangan:signed_by(nama, jabatan),
          pembuat:created_by(full_name)`)
        .single();

      if (error) {
        setToast({ msg: error.message, ok: false });
      } else {
        setRows(prev => [inserted, ...prev]);
        setToast({ msg: `Surat ${nomor} berhasil dibuat`, ok: true });
        setShowModal(false);
        setForm({ jenis_surat_id: "", lokasi_id: "", perihal: "", tujuan: "", isi_surat: "", signed_by: "", tanggal_surat: new Date().toISOString().split("T")[0] });
        setNomorPreview("");
        setTimeout(() => setToast(null), 4000);
      }
    });
  }

  /* ─── Update status ──────────────────────────── */
  async function updateStatus(id: string, newStatus: string) {
    const { error } = await (supabase as any).from("surat_keluar").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", id);
    if (!error) {
      setRows(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      setToast({ msg: `Status diupdate: ${newStatus}`, ok: true });
      setTimeout(() => setToast(null), 3000);
    }
  }

  /* ─── Render ─────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl
          ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Manajemen Surat</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Document Management System — PT. RIFIM INTERNATIONAL GEMILANG
          </p>
        </div>
        {userRoleLevel >= 3 && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Buat Surat
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Surat" value={rows.length} color="bg-slate-50 border-slate-200 text-slate-800" icon="📄" />
        <StatCard label="Bulan Ini" value={bulanIni} color="bg-blue-50 border-blue-200 text-blue-800" icon="📅" />
        <StatCard label="Menunggu Approval" value={menunggu} color="bg-amber-50 border-amber-200 text-amber-800" icon="⏳" />
        <StatCard label="Diterbitkan" value={diterbitkan} color="bg-emerald-50 border-emerald-200 text-emerald-800" icon="✅" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input placeholder="Cari nomor, perihal, tujuan..." value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 w-56" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none">
          <option value="ALL">Semua Status</option>
          {["Draft","Menunggu Persetujuan","Disetujui","Ditolak","Diterbitkan","Diarsipkan"].map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={filterLokasi} onChange={e => setFilterLokasi(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none">
          <option value="ALL">Semua Lokasi</option>
          {lokasiList.map(l => <option key={l.id} value={l.kode_lokasi}>{l.nama_lokasi} ({l.kode_lokasi})</option>)}
        </select>
        <select value={filterJenis} onChange={e => setFilterJenis(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none">
          <option value="ALL">Semua Jenis</option>
          {jenisList.map(j => <option key={j.id} value={j.kode_surat}>{j.kode_surat} — {j.nama_surat}</option>)}
        </select>
        <span className="text-xs text-gray-400 font-medium">{filtered.length} surat</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 420px)", overflowY: "auto" }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 z-10 border-b border-gray-200">
              <tr>
                {["Nomor Surat", "Perihal", "Tujuan", "Jenis", "Lokasi", "Tanggal", "Status", "Aksi"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(row => (
                <tr key={row.id} className={`hover:bg-gray-50 transition-colors ${selectedId === row.id ? "bg-emerald-50" : ""}`}
                  onClick={() => setSelectedId(row.id === selectedId ? null : row.id)}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="font-mono text-xs font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded-lg">
                      {row.nomor_surat ?? "DRAFT"}
                    </span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm font-semibold text-gray-800 truncate">{row.perihal ?? "—"}</p>
                    {row.penandatangan && (
                      <p className="text-xs text-gray-400 truncate">Ttd: {row.penandatangan.nama}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <p className="text-sm text-gray-600 truncate">{row.tujuan ?? "—"}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.jenis_surat ? (
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        {row.jenis_surat.kode_surat}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {row.lokasi ? (
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                        ✈ {row.lokasi.kode_lokasi}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    {new Date(row.tanggal_surat).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      {/* Workflow actions */}
                      {row.status === "Draft" && (
                        <button onClick={() => updateStatus(row.id, "Menunggu Persetujuan")}
                          title="Ajukan"
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors text-xs font-bold">
                          Ajukan
                        </button>
                      )}
                      {row.status === "Menunggu Persetujuan" && userRoleLevel >= 4 && (
                        <>
                          <button onClick={() => updateStatus(row.id, "Disetujui")}
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-bold">✓</button>
                          <button onClick={() => updateStatus(row.id, "Ditolak")}
                            className="p-1 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold">✗</button>
                        </>
                      )}
                      {row.status === "Disetujui" && userRoleLevel >= 4 && (
                        <button onClick={() => updateStatus(row.id, "Diterbitkan")}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-bold">Terbitkan</button>
                      )}
                      {row.status === "Diterbitkan" && (
                        <button onClick={() => updateStatus(row.id, "Diarsipkan")}
                          className="p-1 text-gray-500 hover:bg-gray-50 rounded-lg text-xs font-bold">Arsip</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <p className="text-4xl mb-3">📁</p>
                    <p className="text-gray-500 font-semibold">Belum ada surat</p>
                    <p className="text-gray-400 text-sm mt-1">Klik "Buat Surat" untuk membuat surat pertama</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 font-medium">{filtered.length} dari {rows.length} surat · {arsip} diarsipkan</p>
        </div>
      </div>

      {/* ═══ MODAL BUAT SURAT ══════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="font-black text-gray-900 text-lg">Buat Surat Baru</h2>
                {nomorPreview && (
                  <p className="text-xs text-emerald-600 font-mono font-bold mt-0.5">{nomorPreview}</p>
                )}
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Jenis & Lokasi */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Jenis Surat *</label>
                  <select value={form.jenis_surat_id} onChange={async e => {
                    const updated = { ...form, jenis_surat_id: e.target.value };
                    setForm(updated);
                    await onJenisOrLokasiChange(updated);
                  }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                    <option value="">-- Pilih Jenis --</option>
                    {jenisList.map(j => <option key={j.id} value={j.id}>{j.kode_surat} — {j.nama_surat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Lokasi *</label>
                  <select value={form.lokasi_id} onChange={async e => {
                    const updated = { ...form, lokasi_id: e.target.value };
                    setForm(updated);
                    await onJenisOrLokasiChange(updated);
                  }}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                    <option value="">-- Pilih Lokasi --</option>
                    {lokasiList.map(l => <option key={l.id} value={l.id}>{l.nama_lokasi} ({l.kode_lokasi})</option>)}
                  </select>
                </div>
              </div>

              {/* Tanggal */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Tanggal Surat</label>
                <input type="date" value={form.tanggal_surat} onChange={async e => {
                  const updated = { ...form, tanggal_surat: e.target.value };
                  setForm(updated);
                  await onJenisOrLokasiChange(updated);
                }}
                  className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>

              {/* Perihal & Tujuan */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Perihal *</label>
                <input type="text" value={form.perihal} onChange={e => setForm(f => ({ ...f, perihal: e.target.value }))}
                  placeholder="Perihal surat..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Kepada / Tujuan</label>
                <input type="text" value={form.tujuan} onChange={e => setForm(f => ({ ...f, tujuan: e.target.value }))}
                  placeholder="Nama penerima / instansi..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>

              {/* Isi Surat */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Isi Surat</label>
                <textarea value={form.isi_surat} onChange={e => setForm(f => ({ ...f, isi_surat: e.target.value }))}
                  rows={5} placeholder="Isi surat resmi..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300" />
              </div>

              {/* Penandatangan */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Penandatangan</label>
                <select value={form.signed_by} onChange={e => setForm(f => ({ ...f, signed_by: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-300">
                  <option value="">-- Pilih Penandatangan --</option>
                  {penandatanganList.map(p => <option key={p.id} value={p.id}>{p.nama} — {p.jabatan}</option>)}
                </select>
              </div>

              {/* Nomor preview */}
              {nomorPreview && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">Nomor Surat (Otomatis)</p>
                  <p className="font-mono font-bold text-gray-900 text-lg mt-1">{nomorPreview}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Format: nomor/jenis/lokasi/MIG/bulan-romawi/tahun</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-60 shadow-md shadow-emerald-200">
                  {saving ? "Menyimpan..." : "Simpan sebagai Draft"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
