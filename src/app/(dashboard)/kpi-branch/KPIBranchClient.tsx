"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const BULAN_LABEL = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

function kategoriColor(k: string) {
  if (k === "OUTSTANDING")    return "bg-purple-100 text-purple-700 border-purple-200";
  if (k === "SANGAT BAIK")    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (k === "BAIK")           return "bg-blue-100 text-blue-700 border-blue-200";
  if (k === "CUKUP")          return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (k === "PERLU PEMBINAAN")return "bg-orange-100 text-orange-700 border-orange-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getKategori(v: number) {
  if (v >= 110) return "OUTSTANDING";
  if (v >= 100) return "SANGAT BAIK";
  if (v >= 90)  return "BAIK";
  if (v >= 80)  return "CUKUP";
  if (v >= 70)  return "PERLU PEMBINAAN";
  return "EVALUASI KHUSUS";
}

interface KPIBranch {
  id: string; bulan: number; tahun: number;
  total_driver: number; driver_aktif: number; persen_driver_aktif: number; nilai_driver: number;
  total_saldo: number; target_saldo: number; persen_saldo: number; nilai_saldo: number;
  total_pickup: number; target_pickup: number; persen_pickup: number; nilai_pickup: number;
  skor_ketepatan: number; nilai_ketepatan: number;
  jumlah_komplain: number; nilai_komplain: number;
  kpi_akhir: number; kategori: string; catatan: string | null;
  airport: { id: string; code: string; city: string } | null;
}

interface Airport { id: string; code: string; city: string; }

interface InputForm {
  airport_id: string;
  total_driver: number; driver_aktif: number;
  total_saldo: number; target_saldo: number;
  total_pickup: number; target_pickup: number;
  skor_ketepatan: number;
  jumlah_komplain: number;
  catatan: string;
}

const defaultForm = (): InputForm => ({
  airport_id: "", total_driver: 0, driver_aktif: 0,
  total_saldo: 0, target_saldo: 0, total_pickup: 0, target_pickup: 0,
  skor_ketepatan: 100, jumlah_komplain: 0, catatan: "",
});

function calcKPI(f: InputForm) {
  const persenDriver = f.total_driver > 0 ? (f.driver_aktif / f.total_driver) * 100 : 0;
  const nilaiDriver = persenDriver * 0.20;

  const persenSaldo = f.target_saldo > 0 ? (f.total_saldo / f.target_saldo) * 100 : 0;
  const nilaiSaldo = Math.min(persenSaldo, 120) * 0.35;

  const persenPickup = f.target_pickup > 0 ? (f.total_pickup / f.target_pickup) * 100 : 0;
  const nilaiPickup = Math.min(persenPickup, 110) * 0.25;

  const nilaiKetepatan = f.skor_ketepatan * 0.15;

  const potonganKomplain = Math.min(f.jumlah_komplain * 2, 10);
  const nilaiKomplain = 100 * 0.05 - potonganKomplain;

  const bonus = persenSaldo >= 120 ? 20 : persenSaldo >= 115 ? 15 : persenSaldo >= 110 ? 10 : persenSaldo >= 105 ? 5 : 0;
  const kpiAkhir = Math.max(0, nilaiDriver + nilaiSaldo + nilaiPickup + nilaiKetepatan + nilaiKomplain + bonus);

  return { persenDriver, nilaiDriver, persenSaldo, nilaiSaldo, persenPickup, nilaiPickup, nilaiKetepatan, potonganKomplain, kpi_akhir: kpiAkhir, kategori: getKategori(kpiAkhir) };
}

export default function KPIBranchClient({ kpiData, airports, bulan, tahun, userRoleLevel }: {
  kpiData: KPIBranch[]; airports: Airport[]; bulan: number; tahun: number; userRoleLevel: number;
}) {
  const [rows, setRows] = useState<KPIBranch[]>(kpiData);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<InputForm>(defaultForm());
  const [saving, startSave] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const supabase = createClient();

  function openModal(row?: KPIBranch) {
    if (row) {
      setForm({
        airport_id: row.airport?.id ?? "",
        total_driver: row.total_driver, driver_aktif: row.driver_aktif,
        total_saldo: row.total_saldo, target_saldo: row.target_saldo,
        total_pickup: row.total_pickup, target_pickup: row.target_pickup,
        skor_ketepatan: row.skor_ketepatan,
        jumlah_komplain: row.jumlah_komplain,
        catatan: row.catatan ?? "",
      });
      setEditId(row.id);
    } else {
      setForm(defaultForm());
      setEditId(null);
    }
    setModal(true);
  }

  function handleSave() {
    startSave(async () => {
      if (!form.airport_id) { setToast({ msg: "Pilih bandara!", ok: false }); return; }
      const calc = calcKPI(form);
      const payload = {
        airport_id: form.airport_id,
        bulan, tahun,
        total_driver: form.total_driver, driver_aktif: form.driver_aktif,
        persen_driver_aktif: calc.persenDriver, nilai_driver: calc.nilaiDriver,
        total_saldo: form.total_saldo, target_saldo: form.target_saldo,
        persen_saldo: calc.persenSaldo, nilai_saldo: calc.nilaiSaldo,
        total_pickup: form.total_pickup, target_pickup: form.target_pickup,
        persen_pickup: calc.persenPickup, nilai_pickup: calc.nilaiPickup,
        skor_ketepatan: form.skor_ketepatan, nilai_ketepatan: calc.nilaiKetepatan,
        jumlah_komplain: form.jumlah_komplain, nilai_komplain: calc.potonganKomplain,
        kpi_akhir: calc.kpi_akhir, kategori: calc.kategori,
        catatan: form.catatan || null,
      };

      let error: any;
      if (editId) {
        ({ error } = await (supabase as any).from("kpi_branch_bulanan").update(payload).eq("id", editId));
      } else {
        ({ error } = await (supabase as any).from("kpi_branch_bulanan").upsert({ ...payload }, { onConflict: "airport_id,bulan,tahun" }));
      }

      if (error) { setToast({ msg: error.message, ok: false }); return; }
      setToast({ msg: "KPI Cabang berhasil disimpan!", ok: true });
      setModal(false);
      setTimeout(() => setToast(null), 4000);

      const { data: fresh } = await (supabase as any).from("kpi_branch_bulanan")
        .select(`id, bulan, tahun, total_driver, driver_aktif, persen_driver_aktif, nilai_driver, total_saldo, target_saldo, persen_saldo, nilai_saldo, total_pickup, target_pickup, persen_pickup, nilai_pickup, skor_ketepatan, nilai_ketepatan, jumlah_komplain, nilai_komplain, kpi_akhir, kategori, catatan, airport:airport_id(id, code, city)`)
        .eq("bulan", bulan).eq("tahun", tahun).order("kpi_akhir", { ascending: false });
      if (fresh) setRows(fresh);
    });
  }

  const preview = calcKPI(form);
  const avgKPI = rows.length > 0 ? rows.reduce((s, r) => s + (r.kpi_akhir ?? 0), 0) / rows.length : 0;
  const topBranch = rows[0];

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>KPI Cabang</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Performa bulanan per bandara — {BULAN_LABEL[bulan]} {tahun}
          </p>
        </div>
        <button onClick={() => openModal()}
          className="px-4 py-2.5 rounded-xl bg-[#FFD600] text-black font-bold text-sm hover:bg-yellow-400 shadow-md shadow-yellow-200">
          + Input KPI Cabang
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-3xl font-black text-blue-700">{rows.length}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mt-1">Cabang Dinilai</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-3xl font-black text-emerald-700">{avgKPI.toFixed(1)}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-500 mt-1">Avg KPI Nasional</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <p className="text-xl font-black text-purple-700 truncate">{topBranch?.airport?.city ?? "—"}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-purple-500 mt-1">Cabang Terbaik</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-3xl font-black text-amber-700">{topBranch?.kpi_akhir?.toFixed(1) ?? "—"}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-500 mt-1">Nilai Tertinggi</p>
        </div>
      </div>

      {/* Ranking Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Ranking KPI Cabang — {BULAN_LABEL[bulan]} {tahun}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-center w-12">#</th>
                <th className="px-4 py-3 text-left">Bandara</th>
                <th className="px-4 py-3 text-right">Driver Aktif</th>
                <th className="px-4 py-3 text-right">Saldo %</th>
                <th className="px-4 py-3 text-right">Pickup %</th>
                <th className="px-4 py-3 text-right">KPI Akhir</th>
                <th className="px-4 py-3 text-center">Kategori</th>
                <th className="px-4 py-3 text-center w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((row, i) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4 text-center">
                    {i < 3 ? (
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-sm font-black ${i === 0 ? "bg-yellow-400 text-black" : i === 1 ? "bg-gray-300 text-gray-700" : "bg-amber-700/20 text-amber-700"}`}>
                        {i + 1}
                      </span>
                    ) : (
                      <span className="text-gray-400 font-bold">{i + 1}</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-bold text-gray-800">{row.airport?.city ?? "—"}</div>
                    <div className="text-xs text-gray-400">{row.airport?.code}</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="font-semibold text-gray-700">{row.driver_aktif}/{row.total_driver}</span>
                    <div className="text-xs text-gray-400">{(row.persen_driver_aktif ?? 0).toFixed(0)}%</div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`font-semibold ${(row.persen_saldo ?? 0) >= 100 ? "text-emerald-600" : "text-orange-500"}`}>
                      {(row.persen_saldo ?? 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className={`font-semibold ${(row.persen_pickup ?? 0) >= 100 ? "text-emerald-600" : "text-orange-500"}`}>
                      {(row.persen_pickup ?? 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-xl font-black text-gray-900">{(row.kpi_akhir ?? 0).toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${kategoriColor(row.kategori)}`}>
                      {row.kategori}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <button onClick={() => openModal(row)} className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-semibold">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <p className="text-4xl mb-3">🏢</p>
                    <p className="font-semibold">Belum ada KPI cabang untuk {BULAN_LABEL[bulan]} {tahun}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Modal Input ─── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">{editId ? "Edit" : "Input"} KPI Cabang</h2>
                <p className="text-xs text-gray-400 mt-0.5">{BULAN_LABEL[bulan]} {tahun}</p>
              </div>
              <button onClick={() => setModal(false)} className="w-8 h-8 rounded-xl bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center text-lg font-bold">×</button>
            </div>
            <div className="px-7 py-6 space-y-5">
              {/* Bandara */}
              <div>
                <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Bandara</label>
                <select value={form.airport_id} onChange={e => setForm(f => ({ ...f, airport_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300">
                  <option value="">-- Pilih Bandara --</option>
                  {airports.map(a => <option key={a.id} value={a.id}>✈ {a.city} ({a.code})</option>)}
                </select>
              </div>

              {/* Driver */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Total Driver</label>
                  <input type="number" min={0} value={form.total_driver} onChange={e => setForm(f => ({ ...f, total_driver: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Driver Aktif</label>
                  <input type="number" min={0} value={form.driver_aktif} onChange={e => setForm(f => ({ ...f, driver_aktif: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
              </div>

              {/* Saldo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Realisasi Saldo (Rp)</label>
                  <input type="number" min={0} value={form.total_saldo} onChange={e => setForm(f => ({ ...f, total_saldo: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Target Saldo (Rp)</label>
                  <input type="number" min={0} value={form.target_saldo} onChange={e => setForm(f => ({ ...f, target_saldo: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
              </div>

              {/* Pickup */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Total Pickup</label>
                  <input type="number" min={0} value={form.total_pickup} onChange={e => setForm(f => ({ ...f, total_pickup: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Target Pickup</label>
                  <input type="number" min={0} value={form.target_pickup} onChange={e => setForm(f => ({ ...f, target_pickup: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
              </div>

              {/* Ketepatan & Komplain */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Skor Ketepatan (0–100)</label>
                  <input type="number" min={0} max={100} value={form.skor_ketepatan} onChange={e => setForm(f => ({ ...f, skor_ketepatan: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">Jumlah Komplain</label>
                  <input type="number" min={0} value={form.jumlah_komplain} onChange={e => setForm(f => ({ ...f, jumlah_komplain: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                </div>
              </div>

              {/* KPI Preview */}
              <div className="rounded-2xl bg-gray-50 border border-gray-200 p-5 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{preview.kpi_akhir.toFixed(1)}</p>
                  <p className="text-xs text-gray-400 mt-1">KPI Akhir</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-600">{preview.persenSaldo.toFixed(1)}%</p>
                  <p className="text-xs text-gray-400 mt-1">Pencapaian Saldo</p>
                </div>
                <div className="text-center">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border ${kategoriColor(preview.kategori)}`}>
                    {preview.kategori}
                  </span>
                  <p className="text-xs text-gray-400 mt-1">Kategori</p>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Catatan (opsional)</label>
                <textarea rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300 resize-none" />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50">
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
