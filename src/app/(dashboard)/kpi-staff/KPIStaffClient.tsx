"use client";

import { useState, useMemo, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─── Types ─────────────────────────────────────────────────── */
interface KPIRow {
  id: string;
  bulan: number; tahun: number;
  target_saldo: number; realisasi_saldo: number; persen_saldo: number; nilai_kpi_saldo: number;
  driver_aktif_cabang: number; staff_aktif_cabang: number; driver_dibina: number;
  target_pembinaan: number; persen_pembinaan: number; nilai_kpi_pembinaan: number;
  skor_absensi: number; skor_pelayanan: number; skor_kerapian: number;
  nilai_performa: number; nilai_kpi_performa: number;
  bonus_poin: number; kpi_akhir: number; kategori: string; catatan: string;
  staff: { id: string; nama: string; staff_code: string; jabatan: string; airports: { code: string; city: string } | null } | null;
}

interface StaffRow {
  id: string; nama: string; staff_code: string; jabatan: string;
  airports: { code: string; city: string } | null;
}

interface Props {
  kpiData: KPIRow[];
  staffData: StaffRow[];
  bulan: number; tahun: number;
  userRoleLevel: number;
  userAirportCode: string | null;
}

/* ─── Helpers ────────────────────────────────────────────────── */
const BULAN_NAMES = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const KATEGORI_COLORS: Record<string, string> = {
  "OUTSTANDING":     "bg-purple-100 text-purple-700 border-purple-200",
  "SANGAT BAIK":     "bg-emerald-100 text-emerald-700 border-emerald-200",
  "BAIK":            "bg-blue-100 text-blue-700 border-blue-200",
  "CUKUP":           "bg-yellow-100 text-yellow-800 border-yellow-200",
  "PERLU PEMBINAAN": "bg-orange-100 text-orange-700 border-orange-200",
  "EVALUASI KHUSUS": "bg-red-100 text-red-700 border-red-200",
};

function getKategori(kpi: number): string {
  if (kpi >= 110) return "OUTSTANDING";
  if (kpi >= 100) return "SANGAT BAIK";
  if (kpi >= 90)  return "BAIK";
  if (kpi >= 80)  return "CUKUP";
  if (kpi >= 70)  return "PERLU PEMBINAAN";
  return "EVALUASI KHUSUS";
}

function calcKPI(form: InputForm) {
  const persenSaldo = form.target_saldo > 0 ? (form.realisasi_saldo / form.target_saldo) * 100 : 0;
  const nilaiSaldo  = persenSaldo * 0.5;

  const targetPembinaan = form.staff_aktif_cabang > 0 ? form.driver_aktif_cabang / form.staff_aktif_cabang : 0;
  const persenPembinaan = targetPembinaan > 0 ? (form.driver_dibina / targetPembinaan) * 100 : 0;
  const nilaiPembinaan  = persenPembinaan * 0.3;

  const nilaiPerforma = form.skor_absensi * 0.4 + form.skor_pelayanan * 0.4 + form.skor_kerapian * 0.2;
  const nilaiKpiPerforma = nilaiPerforma * 0.2;

  const bonus = persenSaldo >= 120 ? 20 : persenSaldo >= 115 ? 15 : persenSaldo >= 110 ? 10 : persenSaldo >= 105 ? 5 : 0;
  const kpiAkhir = nilaiSaldo + nilaiPembinaan + nilaiKpiPerforma + bonus;

  return {
    persen_saldo: persenSaldo, nilai_kpi_saldo: nilaiSaldo,
    target_pembinaan: targetPembinaan, persen_pembinaan: persenPembinaan, nilai_kpi_pembinaan: nilaiPembinaan,
    nilai_performa: nilaiPerforma, nilai_kpi_performa: nilaiKpiPerforma,
    bonus_poin: bonus, kpi_akhir: kpiAkhir, kategori: getKategori(kpiAkhir),
  };
}

interface InputForm {
  staff_id: string;
  target_saldo: number; realisasi_saldo: number;
  driver_aktif_cabang: number; staff_aktif_cabang: number; driver_dibina: number;
  skor_absensi: number; skor_pelayanan: number; skor_kerapian: number;
  catatan: string;
}

const EMPTY_FORM: InputForm = {
  staff_id: "", target_saldo: 0, realisasi_saldo: 0,
  driver_aktif_cabang: 0, staff_aktif_cabang: 1, driver_dibina: 0,
  skor_absensi: 0, skor_pelayanan: 0, skor_kerapian: 0, catatan: "",
};

/* ─── Stat Card ──────────────────────────────────────────────── */
function StatCard({ label, value, color, sub }: { label: string; value: string | number; color: string; sub?: string }) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide mt-1 opacity-70">{label}</p>
      {sub && <p className="text-[11px] mt-0.5 opacity-60">{sub}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════ */
export default function KPIStaffClient({ kpiData, staffData, bulan, tahun, userRoleLevel, userAirportCode }: Props) {
  const [rows, setRows] = useState<KPIRow[]>(kpiData);
  const [filterCabang, setFilterCabang] = useState("ALL");
  const [filterBulan, setFilterBulan] = useState(bulan);
  const [filterTahun, setFilterTahun] = useState(tahun);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<InputForm>(EMPTY_FORM);
  const [saving, startSave] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const supabase = createClient();

  /* ─── Computed stats ─────────────────────────────── */
  const filtered = useMemo(() => {
    return rows.filter(r => filterCabang === "ALL" || r.staff?.airports?.code === filterCabang);
  }, [rows, filterCabang]);

  const avgKPI = filtered.length ? (filtered.reduce((s, r) => s + (r.kpi_akhir ?? 0), 0) / filtered.length).toFixed(1) : "—";
  const outstanding = filtered.filter(r => (r.kpi_akhir ?? 0) >= 110).length;
  const perluPembinaan = filtered.filter(r => (r.kpi_akhir ?? 0) < 70).length;
  const totalStaff = staffData.length;

  const cabangList = useMemo(() => {
    const s = new Set(staffData.map(s => s.airports?.code).filter(Boolean));
    return [...s] as string[];
  }, [staffData]);

  const cityOf = (code: string) => staffData.find(s => s.airports?.code === code)?.airports?.city ?? code;

  /* ─── Load data for selected period ─────────────── */
  async function loadPeriod(b: number, y: number) {
    const { data } = await (supabase as any)
      .from("kpi_staff_bulanan")
      .select(`id, bulan, tahun, target_saldo, realisasi_saldo, persen_saldo, nilai_kpi_saldo,
        driver_aktif_cabang, staff_aktif_cabang, driver_dibina, target_pembinaan, persen_pembinaan, nilai_kpi_pembinaan,
        skor_absensi, skor_pelayanan, skor_kerapian, nilai_performa, nilai_kpi_performa,
        bonus_poin, kpi_akhir, kategori, catatan,
        staff:staff_id(id, nama, staff_code, jabatan, airports(code, city))`)
      .eq("bulan", b).eq("tahun", y).order("kpi_akhir", { ascending: false });
    setRows(data ?? []);
  }

  /* ─── Open modal ─────────────────────────────────── */
  function openNew() {
    setEditId(null);
    setForm({ ...EMPTY_FORM, staff_aktif_cabang: 1 });
    setShowModal(true);
  }

  function openEdit(row: KPIRow) {
    setEditId(row.id);
    setForm({
      staff_id: row.staff?.id ?? "",
      target_saldo: row.target_saldo, realisasi_saldo: row.realisasi_saldo,
      driver_aktif_cabang: row.driver_aktif_cabang, staff_aktif_cabang: row.staff_aktif_cabang,
      driver_dibina: row.driver_dibina,
      skor_absensi: row.skor_absensi, skor_pelayanan: row.skor_pelayanan, skor_kerapian: row.skor_kerapian,
      catatan: row.catatan ?? "",
    });
    setShowModal(true);
  }

  /* ─── Save ───────────────────────────────────────── */
  function handleSave() {
    startSave(async () => {
      if (!form.staff_id) { setToast({ msg: "Pilih staff terlebih dahulu", ok: false }); return; }
      const calc = calcKPI(form);
      const payload = { ...form, ...calc, bulan: filterBulan, tahun: filterTahun };

      let err: any;
      if (editId) {
        ({ error: err } = await (supabase as any).from("kpi_staff_bulanan").update(payload).eq("id", editId));
      } else {
        ({ error: err } = await (supabase as any).from("kpi_staff_bulanan").insert(payload));
      }

      if (err) {
        setToast({ msg: err.message, ok: false });
      } else {
        setToast({ msg: "KPI berhasil disimpan", ok: true });
        setShowModal(false);
        loadPeriod(filterBulan, filterTahun);
        setTimeout(() => setToast(null), 3000);
      }
    });
  }

  const preview = calcKPI(form);
  const staffHasKPI = new Set(rows.map(r => r.staff?.id));
  const availableStaff = staffData.filter(s => !staffHasKPI.has(s.id) || editId);

  /* ─── Render ─────────────────────────────────────── */
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
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>KPI Staff</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Sistem penilaian kinerja staff bandara — {BULAN_NAMES[filterBulan]} {filterTahun}
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 bg-[#FFD600] text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-yellow-400 transition-colors shadow-md shadow-yellow-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Input KPI
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Staff" value={totalStaff} color="bg-slate-50 border-slate-200 text-slate-800" sub="Seluruh bandara" />
        <StatCard label="Rata-rata KPI" value={avgKPI} color="bg-yellow-50 border-yellow-200 text-yellow-800" sub="Bulan ini" />
        <StatCard label="Outstanding" value={outstanding} color="bg-purple-50 border-purple-200 text-purple-800" sub="≥ 110 poin" />
        <StatCard label="Perlu Evaluasi" value={perluPembinaan} color="bg-red-50 border-red-200 text-red-800" sub="< 70 poin" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={filterCabang} onChange={e => setFilterCabang(e.target.value)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-300">
          <option value="ALL">Semua Cabang</option>
          {cabangList.map(c => <option key={c} value={c}>{cityOf(c)} ({c})</option>)}
        </select>
        <select value={filterBulan} onChange={e => { const b = +e.target.value; setFilterBulan(b); loadPeriod(b, filterTahun); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none">
          {BULAN_NAMES.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
        </select>
        <input type="number" value={filterTahun} min={2024} max={2099}
          onChange={e => { const y = +e.target.value; setFilterTahun(y); if (e.target.value.length === 4) loadPeriod(filterBulan, y); }}
          className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-300" />
        <span className="text-xs text-gray-400 font-medium ml-1">{filtered.length} dari {rows.length} record</span>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-yellow-500">
            <path d="M6 9H4.5a2.5 2.5 0 010-5H6M18 9h1.5a2.5 2.5 0 000-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0012 0V2z"/>
          </svg>
          <span className="font-bold text-gray-800 text-sm">Ranking KPI Staff Nasional</span>
        </div>
        <div className="overflow-x-auto" style={{ maxHeight: "calc(100vh - 400px)", overflowY: "auto" }}>
          <table className="w-full">
            <thead className="sticky top-0 bg-gray-50 z-10">
              <tr className="border-b border-gray-200">
                {["#", "Staff", "Cabang", "Saldo (50%)", "Pembinaan (30%)", "Performa (20%)", "Bonus", "KPI Akhir", "Kategori", "Aksi"].map(h => (
                  <th key={h} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((row, i) => {
                const kat = row.kategori ?? getKategori(row.kpi_akhir ?? 0);
                return (
                  <tr key={row.id} className="hover:bg-yellow-50/40 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-gray-400">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-bold text-xs text-black bg-[#FFD600]">
                          {row.staff?.nama?.[0]?.toUpperCase() ?? "S"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 whitespace-nowrap">{row.staff?.nama ?? "—"}</p>
                          <p className="text-xs text-gray-400">{row.staff?.staff_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                        ✈ {row.staff?.airports?.city ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-800">{(row.nilai_kpi_saldo ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-gray-400">{(row.persen_saldo ?? 0).toFixed(0)}%</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-800">{(row.nilai_kpi_pembinaan ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-gray-400">{row.driver_dibina} driver</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold text-gray-800">{(row.nilai_kpi_performa ?? 0).toFixed(1)}</p>
                      <p className="text-xs text-gray-400">Performa {(row.nilai_performa ?? 0).toFixed(0)}%</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-emerald-600">
                      {row.bonus_poin > 0 ? `+${row.bonus_poin}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-lg font-black" style={{ color: (row.kpi_akhir ?? 0) >= 100 ? "#22C55E" : (row.kpi_akhir ?? 0) >= 80 ? "#F59E0B" : "#EF4444" }}>
                        {(row.kpi_akhir ?? 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${KATEGORI_COLORS[kat] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                        {kat}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openEdit(row)} className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
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
                <tr>
                  <td colSpan={10} className="px-5 py-16 text-center">
                    <p className="text-4xl mb-3">📊</p>
                    <p className="text-gray-500 font-semibold">Belum ada data KPI untuk periode ini</p>
                    <p className="text-gray-400 text-sm mt-1">Klik "Input KPI" untuk menambahkan penilaian</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-xs text-gray-400 font-medium">
            {filtered.length} record · {BULAN_NAMES[filterBulan]} {filterTahun}
          </p>
        </div>
      </div>

      {/* ═══ INPUT MODAL ═══════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="font-black text-gray-900 text-lg">{editId ? "Edit KPI Staff" : "Input KPI Staff"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{BULAN_NAMES[filterBulan]} {filterTahun}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Staff selector */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Staff</label>
                <select value={form.staff_id} disabled={!!editId}
                  onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-50 disabled:text-gray-500">
                  <option value="">-- Pilih Staff --</option>
                  {(editId ? staffData : availableStaff).map(s => (
                    <option key={s.id} value={s.id}>{s.nama} — {s.airports?.city ?? "—"} ({s.staff_code})</option>
                  ))}
                </select>
              </div>

              {/* Modul 1: Saldo */}
              <div className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4 space-y-3">
                <p className="font-bold text-yellow-800 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-[#FFD600] text-black text-xs font-black flex items-center justify-center">1</span>
                  Target Saldo — Bobot 50%
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Target Saldo (Rp)</label>
                    <input type="number" value={form.target_saldo || ""}
                      onChange={e => setForm(f => ({ ...f, target_saldo: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" placeholder="3000000" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Realisasi Saldo (Rp)</label>
                    <input type="number" value={form.realisasi_saldo || ""}
                      onChange={e => setForm(f => ({ ...f, realisasi_saldo: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" placeholder="3600000" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Persentase: <strong>{preview.persen_saldo.toFixed(1)}%</strong></span>
                  <span className="text-gray-500">Nilai: <strong className="text-yellow-700">{preview.nilai_kpi_saldo.toFixed(1)} poin</strong></span>
                  {preview.bonus_poin > 0 && <span className="text-emerald-600 font-bold">+{preview.bonus_poin} BONUS</span>}
                </div>
              </div>

              {/* Modul 2: Pembinaan Driver */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                <p className="font-bold text-blue-800 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
                  Pembinaan Driver — Bobot 30%
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Driver Aktif Cabang</label>
                    <input type="number" value={form.driver_aktif_cabang || ""}
                      onChange={e => setForm(f => ({ ...f, driver_aktif_cabang: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="1400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Jumlah Staff Aktif</label>
                    <input type="number" min="1" value={form.staff_aktif_cabang || ""}
                      onChange={e => setForm(f => ({ ...f, staff_aktif_cabang: Math.max(1, +e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="7" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">Driver Dibina</label>
                    <input type="number" value={form.driver_dibina || ""}
                      onChange={e => setForm(f => ({ ...f, driver_dibina: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" placeholder="180" />
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Target: <strong>{preview.target_pembinaan.toFixed(0)} driver/staff</strong></span>
                  <span className="text-gray-500">Persentase: <strong>{preview.persen_pembinaan.toFixed(1)}%</strong></span>
                  <span className="text-gray-500">Nilai: <strong className="text-blue-700">{preview.nilai_kpi_pembinaan.toFixed(1)} poin</strong></span>
                </div>
              </div>

              {/* Modul 3: Performa */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                <p className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">3</span>
                  Performa Staff — Bobot 20%
                </p>
                <div className="space-y-2">
                  {[
                    { key: "skor_absensi", label: "Absensi (40%)", placeholder: "Kehadiran, ketepatan waktu, tidak mangkir" },
                    { key: "skor_pelayanan", label: "Pelayanan Penumpang (40%)", placeholder: "Keramahan, responsif, pickup point" },
                    { key: "skor_kerapian", label: "Kerapian & Kebersihan (20%)", placeholder: "Seragam, ID card, kebersihan area" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="flex items-center gap-3">
                      <label className="text-xs font-semibold text-gray-600 w-44 flex-shrink-0">{label}</label>
                      <input type="number" min="0" max="100"
                        value={(form as any)[key] || ""}
                        onChange={e => setForm(f => ({ ...f, [key]: Math.min(100, Math.max(0, +e.target.value)) }))}
                        className="w-20 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <span className="text-xs text-gray-400 flex-1 truncate">{placeholder}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">Performa: <strong>{preview.nilai_performa.toFixed(1)}/100</strong></span>
                  <span className="text-gray-500">Nilai: <strong className="text-emerald-700">{preview.nilai_kpi_performa.toFixed(1)} poin</strong></span>
                </div>
              </div>

              {/* KPI Preview */}
              <div className="rounded-2xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-amber-50 p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-yellow-700 uppercase tracking-wide">KPI AKHIR</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {preview.nilai_kpi_saldo.toFixed(1)} + {preview.nilai_kpi_pembinaan.toFixed(1)} + {preview.nilai_kpi_performa.toFixed(1)} + {preview.bonus_poin} bonus
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black text-gray-900">{preview.kpi_akhir.toFixed(1)}</p>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${KATEGORI_COLORS[preview.kategori] ?? ""}`}>
                    {preview.kategori}
                  </span>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Catatan (opsional)</label>
                <textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  rows={2} placeholder="Tambahkan catatan untuk staff ini..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300" />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-[#FFD600] text-black font-bold text-sm hover:bg-yellow-400 transition-colors disabled:opacity-60 shadow-md shadow-yellow-200">
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
