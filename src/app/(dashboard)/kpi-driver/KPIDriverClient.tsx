"use client";

import { useState, useMemo, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const BULAN_NAMES = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

const KATEGORI_COLORS: Record<string, string> = {
  "OUTSTANDING":     "bg-purple-100 text-purple-700 border-purple-200",
  "SANGAT BAIK":     "bg-emerald-100 text-emerald-700 border-emerald-200",
  "BAIK":            "bg-blue-100 text-blue-700 border-blue-200",
  "CUKUP":           "bg-yellow-100 text-yellow-800 border-yellow-200",
  "PERLU PEMBINAAN": "bg-orange-100 text-orange-700 border-orange-200",
  "EVALUASI KHUSUS": "bg-red-100 text-red-700 border-red-200",
};

function getKategori(k: number) {
  if (k >= 110) return "OUTSTANDING";
  if (k >= 100) return "SANGAT BAIK";
  if (k >= 90)  return "BAIK";
  if (k >= 80)  return "CUKUP";
  if (k >= 70)  return "PERLU PEMBINAAN";
  return "EVALUASI KHUSUS";
}

interface Form {
  driver_id: string;
  total_hari_kerja: number; total_hadir: number; skor_absensi: number;
  total_panggilan: number; total_hadir_panggil: number; skor_compliance: number;
  target_pickup: number; realisasi_pickup: number; skor_pickup: number;
  target_menit_respons: number; rata_menit_respons: number; skor_respons: number;
  jumlah_pelanggaran: number;
  catatan: string;
}

const EMPTY: Form = {
  driver_id: "", total_hari_kerja: 26, total_hadir: 0, skor_absensi: 0,
  total_panggilan: 0, total_hadir_panggil: 0, skor_compliance: 0,
  target_pickup: 0, realisasi_pickup: 0, skor_pickup: 0,
  target_menit_respons: 10, rata_menit_respons: 0, skor_respons: 0,
  jumlah_pelanggaran: 0, catatan: "",
};

function calcKPI(f: Form) {
  // Absensi (auto dari hadir/hari_kerja jika skor_absensi = 0)
  const skorAbsensi = f.skor_absensi > 0
    ? f.skor_absensi
    : f.total_hari_kerja > 0 ? Math.min((f.total_hadir / f.total_hari_kerja) * 100, 100) : 0;
  const nilaiAbsensi = skorAbsensi * 0.20;

  // Compliance (auto dari hadir_panggil/panggilan)
  const skorCompliance = f.skor_compliance > 0
    ? f.skor_compliance
    : f.total_panggilan > 0 ? Math.min((f.total_hadir_panggil / f.total_panggilan) * 100, 100) : 0;
  const nilaiCompliance = skorCompliance * 0.20;

  // Pickup (auto dari realisasi/target)
  const skorPickup = f.skor_pickup > 0
    ? f.skor_pickup
    : f.target_pickup > 0 ? Math.min((f.realisasi_pickup / f.target_pickup) * 100, 100) : 0;
  const nilaiPickup = skorPickup * 0.30;

  // Respons (auto: semakin cepat semakin baik)
  const skorRespons = f.skor_respons > 0
    ? f.skor_respons
    : f.rata_menit_respons > 0
      ? Math.max(0, Math.min(100, ((f.target_menit_respons - f.rata_menit_respons) / f.target_menit_respons + 1) * 100))
      : 100;
  const nilaiRespons = skorRespons * 0.20;

  // Pelanggaran (-10% max)
  const potongan = Math.min(f.jumlah_pelanggaran * 3.33, 10);

  const kpiAkhir = nilaiAbsensi + nilaiCompliance + nilaiPickup + nilaiRespons - potongan;
  return {
    skor_absensi: skorAbsensi, nilai_absensi: nilaiAbsensi,
    skor_compliance: skorCompliance, nilai_compliance: nilaiCompliance,
    skor_pickup: skorPickup, nilai_pickup: nilaiPickup,
    skor_respons: skorRespons, nilai_respons: nilaiRespons,
    potongan_pelanggaran: potongan,
    kpi_akhir: Math.max(0, kpiAkhir),
    kategori: getKategori(Math.max(0, kpiAkhir)),
  };
}

interface Props {
  kpiData: any[]; driverData: any[];
  bulan: number; tahun: number;
  userRoleLevel: number; userAirportCode: string | null;
}

function StatCard({ label, value, color, sub }: any) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide mt-1 opacity-70">{label}</p>
      {sub && <p className="text-[11px] mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

export default function KPIDriverClient({ kpiData, driverData, bulan, tahun, userRoleLevel }: Props) {
  const [rows, setRows] = useState(kpiData);
  const [filterBulan, setFilterBulan] = useState(bulan);
  const [filterTahun, setFilterTahun] = useState(tahun);
  const [filterCabang, setFilterCabang] = useState("ALL");
  const [filterTipe, setFilterTipe] = useState("ALL");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, startSave] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const supabase = createClient();

  const cabangList = useMemo(() => [...new Set(driverData.map((d: any) => d.airports?.code).filter(Boolean))], [driverData]);

  const filtered = useMemo(() => rows.filter((r: any) => {
    const mc = filterCabang === "ALL" || r.driver?.airports?.code === filterCabang;
    const mt = filterTipe === "ALL" || r.driver?.tipe === filterTipe;
    return mc && mt;
  }), [rows, filterCabang, filterTipe]);

  const avgKPI = filtered.length ? (filtered.reduce((s: number, r: any) => s + (r.kpi_akhir ?? 0), 0) / filtered.length).toFixed(1) : "—";
  const outstanding = filtered.filter((r: any) => (r.kpi_akhir ?? 0) >= 100).length;
  const perluEvaluasi = filtered.filter((r: any) => (r.kpi_akhir ?? 0) < 70).length;

  async function loadPeriod(b: number, y: number) {
    const { data } = await (supabase as any)
      .from("kpi_driver_bulanan")
      .select(`id, bulan, tahun, total_hari_kerja, total_hadir, skor_absensi, nilai_absensi,
        total_panggilan, total_hadir_panggil, skor_compliance, nilai_compliance,
        target_pickup, realisasi_pickup, skor_pickup, nilai_pickup,
        target_menit_respons, rata_menit_respons, skor_respons, nilai_respons,
        jumlah_pelanggaran, potongan_pelanggaran, kpi_akhir, kategori, catatan,
        driver:driver_id(id, nama, kode_driver, tipe, airports(code, city))`)
      .eq("bulan", b).eq("tahun", y).order("kpi_akhir", { ascending: false });
    setRows(data ?? []);
  }

  function openNew() { setEditId(null); setForm(EMPTY); setShowModal(true); }
  function openEdit(row: any) {
    setEditId(row.id);
    setForm({
      driver_id: row.driver?.id ?? "",
      total_hari_kerja: row.total_hari_kerja, total_hadir: row.total_hadir, skor_absensi: row.skor_absensi,
      total_panggilan: row.total_panggilan, total_hadir_panggil: row.total_hadir_panggil, skor_compliance: row.skor_compliance,
      target_pickup: row.target_pickup, realisasi_pickup: row.realisasi_pickup, skor_pickup: row.skor_pickup,
      target_menit_respons: row.target_menit_respons, rata_menit_respons: row.rata_menit_respons, skor_respons: row.skor_respons,
      jumlah_pelanggaran: row.jumlah_pelanggaran, catatan: row.catatan ?? "",
    });
    setShowModal(true);
  }

  function handleSave() {
    startSave(async () => {
      if (!form.driver_id) { setToast({ msg: "Pilih driver terlebih dahulu", ok: false }); return; }
      const calc = calcKPI(form);
      const driver = driverData.find((d: any) => d.id === form.driver_id);
      const payload = {
        ...form, ...calc, bulan: filterBulan, tahun: filterTahun,
        airport_id: driver?.airports?.id ?? null,
      };
      let err: any;
      if (editId) {
        ({ error: err } = await (supabase as any).from("kpi_driver_bulanan").update(payload).eq("id", editId));
      } else {
        ({ error: err } = await (supabase as any).from("kpi_driver_bulanan").insert(payload));
      }
      if (err) { setToast({ msg: err.message, ok: false }); }
      else {
        setToast({ msg: "KPI driver disimpan", ok: true });
        setShowModal(false);
        loadPeriod(filterBulan, filterTahun);
        setTimeout(() => setToast(null), 3000);
      }
    });
  }

  const preview = calcKPI(form);
  const hasKPI = new Set(rows.map((r: any) => r.driver?.id));
  const availableDrivers = driverData.filter((d: any) => !hasKPI.has(d.id) || editId);

  const DIM = ({ label, skor, nilai, color }: any) => (
    <div className={`rounded-xl p-3 border ${color}`}>
      <p className="text-xs font-bold opacity-70 mb-1">{label}</p>
      <p className="text-xl font-black">{skor.toFixed(0)}<span className="text-xs font-normal">/100</span></p>
      <p className="text-xs opacity-60">→ {nilai.toFixed(1)} poin</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>KPI Driver</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Absensi 20% · Compliance 20% · Pickup 30% · Respons 20% · Pelanggaran -10% — {BULAN_NAMES[filterBulan]} {filterTahun}
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#FFD600] text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors shadow-md shadow-yellow-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Input KPI Driver
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Driver" value={driverData.length} color="bg-slate-50 border-slate-200 text-slate-800" sub="Driver aktif" />
        <StatCard label="Rata-rata KPI" value={avgKPI} color="bg-yellow-50 border-yellow-200 text-yellow-800" sub="Bulan ini" />
        <StatCard label="Outstanding" value={outstanding} color="bg-emerald-50 border-emerald-200 text-emerald-800" sub="≥ 100 poin" />
        <StatCard label="Perlu Evaluasi" value={perluEvaluasi} color="bg-red-50 border-red-200 text-red-800" sub="< 70 poin" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterCabang} onChange={e => setFilterCabang(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300">
          <option value="ALL">Semua Cabang</option>
          {cabangList.map((c: any) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterTipe} onChange={e => setFilterTipe(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
          <option value="ALL">Semua Tipe</option>
          <option value="INTERNAL">Internal</option>
          <option value="EXTERNAL">External</option>
        </select>
        <select value={filterBulan} onChange={e => { const b = +e.target.value; setFilterBulan(b); loadPeriod(b, filterTahun); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
          {BULAN_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
        </select>
        <input type="number" value={filterTahun} min={2024} max={2099}
          onChange={e => { const y = +e.target.value; setFilterTahun(y); if (e.target.value.length === 4) loadPeriod(filterBulan, y); }}
          className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300" />
        <span className="text-xs text-gray-400">{filtered.length} record</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 380px)", overflowY: "auto" }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200 z-10">
              <tr>
                {["#","Driver","Cabang","Tipe","Absensi","Compliance","Pickup","Respons","Pelanggaran","KPI","Kategori",""].map(h => (
                  <th key={h} className="px-3 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row: any, i: number) => {
                const kat = row.kategori ?? getKategori(row.kpi_akhir ?? 0);
                return (
                  <tr key={row.id} className="hover:bg-yellow-50/30 transition-colors">
                    <td className="px-3 py-3 text-sm font-bold text-gray-400">
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-black bg-[#FFD600] flex-shrink-0">
                          {row.driver?.nama?.[0]?.toUpperCase() ?? "D"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{row.driver?.nama ?? "—"}</p>
                          <p className="text-xs text-gray-400">{row.driver?.kode_driver ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                        ✈ {row.driver?.airports?.city ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${row.driver?.tipe === "INTERNAL" ? "bg-blue-50 text-blue-700 border-blue-100" : "bg-orange-50 text-orange-700 border-orange-100"}`}>
                        {row.driver?.tipe ?? "—"}
                      </span>
                    </td>
                    {[
                      { v: row.nilai_absensi, s: row.skor_absensi },
                      { v: row.nilai_compliance, s: row.skor_compliance },
                      { v: row.nilai_pickup, s: row.skor_pickup },
                      { v: row.nilai_respons, s: row.skor_respons },
                    ].map(({ v, s }, idx) => (
                      <td key={idx} className="px-3 py-3">
                        <p className="text-sm font-bold text-gray-800">{(v ?? 0).toFixed(1)}</p>
                        <p className="text-xs text-gray-400">{(s ?? 0).toFixed(0)}%</p>
                      </td>
                    ))}
                    <td className="px-3 py-3 text-sm font-bold text-red-500">
                      {row.jumlah_pelanggaran > 0 ? `-${(row.potongan_pelanggaran ?? 0).toFixed(1)}` : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-lg font-black" style={{ color: (row.kpi_akhir??0)>=100?"#22C55E":(row.kpi_akhir??0)>=80?"#F59E0B":"#EF4444" }}>
                        {(row.kpi_akhir ?? 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${KATEGORI_COLORS[kat] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {kat}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="px-5 py-16 text-center">
                  <p className="text-4xl mb-3">🏆</p>
                  <p className="text-gray-500 font-semibold">Belum ada data KPI driver</p>
                  <p className="text-gray-400 text-sm mt-1">Klik "Input KPI Driver" untuk mulai</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400">{filtered.length} record · {BULAN_NAMES[filterBulan]} {filterTahun}</p>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="font-black text-gray-900 text-lg">{editId ? "Edit" : "Input"} KPI Driver</h2>
                <p className="text-xs text-gray-400 mt-0.5">{BULAN_NAMES[filterBulan]} {filterTahun}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Driver selector */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Driver *</label>
                <select value={form.driver_id} disabled={!!editId}
                  onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-50">
                  <option value="">-- Pilih Driver --</option>
                  {(editId ? driverData : availableDrivers).map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nama} — {d.airports?.city ?? "—"} ({d.tipe}) {d.kode_driver}</option>
                  ))}
                </select>
              </div>

              {/* Dimensi 1: Absensi */}
              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4 space-y-3">
                <p className="font-bold text-yellow-800 text-sm">1 · Absensi — Bobot 20%</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Hari Kerja</label>
                    <input type="number" value={form.total_hari_kerja || ""}
                      onChange={e => setForm(f => ({ ...f, total_hari_kerja: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Hari Hadir</label>
                    <input type="number" value={form.total_hadir || ""}
                      onChange={e => setForm(f => ({ ...f, total_hadir: +e.target.value, skor_absensi: 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Skor: <strong>{preview.skor_absensi.toFixed(1)}%</strong> → <strong className="text-yellow-700">{preview.nilai_absensi.toFixed(1)} poin</strong></p>
              </div>

              {/* Dimensi 2: Compliance */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                <p className="font-bold text-blue-800 text-sm">2 · Queue Compliance — Bobot 20%</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Total Panggilan Antrian</label>
                    <input type="number" value={form.total_panggilan || ""}
                      onChange={e => setForm(f => ({ ...f, total_panggilan: +e.target.value, skor_compliance: 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Hadir Saat Dipanggil</label>
                    <input type="number" value={form.total_hadir_panggil || ""}
                      onChange={e => setForm(f => ({ ...f, total_hadir_panggil: +e.target.value, skor_compliance: 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Skor: <strong>{preview.skor_compliance.toFixed(1)}%</strong> → <strong className="text-blue-700">{preview.nilai_compliance.toFixed(1)} poin</strong></p>
              </div>

              {/* Dimensi 3: Pickup */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                <p className="font-bold text-emerald-800 text-sm">3 · Pickup Activity — Bobot 30%</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Target Pickup/Bulan</label>
                    <input type="number" value={form.target_pickup || ""}
                      onChange={e => setForm(f => ({ ...f, target_pickup: +e.target.value, skor_pickup: 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Realisasi Pickup</label>
                    <input type="number" value={form.realisasi_pickup || ""}
                      onChange={e => setForm(f => ({ ...f, realisasi_pickup: +e.target.value, skor_pickup: 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Skor: <strong>{preview.skor_pickup.toFixed(1)}%</strong> → <strong className="text-emerald-700">{preview.nilai_pickup.toFixed(1)} poin</strong></p>
              </div>

              {/* Dimensi 4: Respons */}
              <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 space-y-3">
                <p className="font-bold text-purple-800 text-sm">4 · Response Time — Bobot 20%</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Target Respons (menit)</label>
                    <input type="number" value={form.target_menit_respons || ""}
                      onChange={e => setForm(f => ({ ...f, target_menit_respons: +e.target.value, skor_respons: 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Rata-rata Aktual (menit)</label>
                    <input type="number" step="0.1" value={form.rata_menit_respons || ""}
                      onChange={e => setForm(f => ({ ...f, rata_menit_respons: +e.target.value, skor_respons: 0 }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300" />
                  </div>
                </div>
                <p className="text-xs text-gray-500">Skor: <strong>{preview.skor_respons.toFixed(1)}%</strong> → <strong className="text-purple-700">{preview.nilai_respons.toFixed(1)} poin</strong></p>
              </div>

              {/* Pelanggaran */}
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 space-y-3">
                <p className="font-bold text-red-800 text-sm">5 · Pelanggaran — Potongan maks -10 poin</p>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Jumlah Pelanggaran</label>
                  <input type="number" min="0" value={form.jumlah_pelanggaran || ""}
                    onChange={e => setForm(f => ({ ...f, jumlah_pelanggaran: +e.target.value }))}
                    className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                </div>
                <p className="text-xs text-gray-500">Potongan: <strong className="text-red-600">-{preview.potongan_pelanggaran.toFixed(1)} poin</strong></p>
              </div>

              {/* Preview */}
              <div className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">KPI AKHIR DRIVER</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {preview.nilai_absensi.toFixed(1)} + {preview.nilai_compliance.toFixed(1)} + {preview.nilai_pickup.toFixed(1)} + {preview.nilai_respons.toFixed(1)} - {preview.potongan_pelanggaran.toFixed(1)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-gray-900">{preview.kpi_akhir.toFixed(1)}</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${KATEGORI_COLORS[preview.kategori] ?? ""}`}>
                    {preview.kategori}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Catatan</label>
                <textarea value={form.catatan} rows={2}
                  onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300" />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#FFD600] text-black font-bold text-sm hover:bg-yellow-400 disabled:opacity-60 shadow-md shadow-yellow-200">
                  {saving ? "Menyimpan..." : "Simpan KPI"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
