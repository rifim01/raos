"use client";

import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const BULAN = ["","Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const PRIMARY = "#FFD600";
const NAVY    = "#0F172A";

const KATEGORI_STYLE: Record<string, string> = {
  "Outstanding":      "bg-purple-100 text-purple-700 border-purple-200",
  "Sangat Baik":      "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Baik":             "bg-blue-100 text-blue-700 border-blue-200",
  "Cukup":            "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Perlu Pembinaan":  "bg-orange-100 text-orange-700 border-orange-200",
  "Evaluasi Khusus":  "bg-red-100 text-red-700 border-red-200",
};

function kategoriOf(kpi: number) {
  if (kpi >= 110) return "Outstanding";
  if (kpi >= 100) return "Sangat Baik";
  if (kpi >= 90)  return "Baik";
  if (kpi >= 80)  return "Cukup";
  if (kpi >= 70)  return "Perlu Pembinaan";
  return "Evaluasi Khusus";
}

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Airport { id: string; code: string; name: string; city: string; }
interface StaffRow { id: string; staff_code: string; nama: string; jabatan: string; airport_id: string; is_active: boolean; }
interface KPIRecord {
  id: string; staff_id: string; airport_id: string; bulan: number; tahun: number;
  target_saldo: number; realisasi_saldo: number; persen_saldo: number; nilai_kpi_saldo: number;
  driver_aktif_cabang: number; staff_aktif_cabang: number; driver_dibina: number;
  target_pembinaan: number; persen_pembinaan: number; nilai_kpi_pembinaan: number;
  skor_absensi: number; skor_pelayanan: number; skor_kerapian: number;
  nilai_performa: number; nilai_kpi_performa: number;
  bonus_poin: number; kpi_akhir: number; kategori: string; catatan: string;
}
interface Me { id: string; role_id: number; airport_id: string; full_name: string; }

interface InputForm {
  staff_id: string;
  target_saldo: number;
  realisasi_saldo: number;
  driver_dibina: number;
  skor_pelayanan: number;
  skor_kerapian: number;
  catatan: string;
}

const EMPTY_FORM: InputForm = {
  staff_id: "", target_saldo: 0, realisasi_saldo: 0,
  driver_dibina: 0, skor_pelayanan: 0, skor_kerapian: 0, catatan: "",
};

/* ─── Preview KPI (client-side, trigger handles server-side truth) ───────── */
function previewKPI(form: InputForm, driverAktif: number, staffAktif: number, skAbsensi: number) {
  const ps   = form.target_saldo > 0 ? (form.realisasi_saldo / form.target_saldo) * 100 : 0;
  const ns   = ps * 0.5;
  const tp   = staffAktif > 0 ? driverAktif / staffAktif : 0;
  const pp   = tp > 0 ? (form.driver_dibina / tp) * 100 : 0;
  const np   = pp * 0.3;
  const perf = (skAbsensi * 0.4) + (form.skor_pelayanan * 0.4) + (form.skor_kerapian * 0.2);
  const nkp  = perf * 0.2;
  const bon  = Math.min(Math.max(ps - 100, 0), 20);
  const akhir = ns + np + nkp + bon;
  return { ps, ns, tp, pp, np, perf, nkp, bon, akhir, kat: kategoriOf(akhir) };
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */
function Card({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-4 ${accent ? "border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50" : "border-gray-100 bg-white"}`}>
      <p className={`text-2xl font-black ${accent ? "text-gray-900" : "text-gray-800"}`}>{value}</p>
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</p>}
    </div>
  );
}

function KatBadge({ kat }: { kat: string }) {
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${KATEGORI_STYLE[kat] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {kat}
    </span>
  );
}

function ScoreBar({ value, max = 100, color = PRIMARY }: { value: number; max?: number; color?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden w-full">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN CLIENT
══════════════════════════════════════════════════════════════════════════ */
interface Props {
  airports: Airport[];
  staffList: StaffRow[];
  driverRows: { airport_id: string }[];
  kpiRecords: KPIRecord[];
  me: Me;
  isDirector: boolean;
  isCoordinator: boolean;
  isStaff: boolean;
  currentBulan: number;
  currentTahun: number;
}

export default function KPIStaffClient({
  airports, staffList, driverRows, kpiRecords,
  me, isDirector, isCoordinator, isStaff,
  currentBulan, currentTahun,
}: Props) {
  const supabase = createClient();
  const canInput = isDirector || isCoordinator;

  /* ── State ─────────────────────────────────────── */
  const [records, setRecords] = useState<KPIRecord[]>(kpiRecords);
  const [filterBulan,  setFilterBulan]  = useState(currentBulan);
  const [filterTahun,  setFilterTahun]  = useState(currentTahun);
  const [filterCabang, setFilterCabang] = useState<string>("ALL");
  const [activeTab,    setActiveTab]    = useState<"nasional"|"cabang"|"perlu">("nasional");
  const [showModal,    setShowModal]    = useState(false);
  const [editId,       setEditId]       = useState<string|null>(null);
  const [form,         setForm]         = useState<InputForm>(EMPTY_FORM);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean }|null>(null);
  const [saving,       startSave]       = useTransition();

  /* ── Lookup maps ───────────────────────────────── */
  const airportByCode = useMemo(() => Object.fromEntries(airports.map(a => [a.code, a])), [airports]);
  const airportById   = useMemo(() => Object.fromEntries(airports.map(a => [a.id,   a])), [airports]);
  const staffById     = useMemo(() => Object.fromEntries(staffList.map(s => [s.id,  s])), [staffList]);

  const driverCountByAirport = useMemo(() => {
    const m: Record<string, number> = {};
    driverRows.forEach(d => { m[d.airport_id] = (m[d.airport_id] ?? 0) + 1; });
    return m;
  }, [driverRows]);

  const staffCountByAirport = useMemo(() => {
    const m: Record<string, number> = {};
    staffList.forEach(s => { m[s.airport_id] = (m[s.airport_id] ?? 0) + 1; });
    return m;
  }, [staffList]);

  /* ── Supabase Realtime ─────────────────────────── */
  useEffect(() => {
    const ch = (supabase as any)
      .channel("kpi_staff_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "kpi_staff_bulanan" }, () => {
        loadPeriod(filterBulan, filterTahun);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterBulan, filterTahun]);

  /* ── Load period ───────────────────────────────── */
  const loadPeriod = useCallback(async (b: number, y: number) => {
    const q = (supabase as any)
      .from("kpi_staff_bulanan")
      .select(`id,staff_id,airport_id,bulan,tahun,
        target_saldo,realisasi_saldo,persen_saldo,nilai_kpi_saldo,
        driver_aktif_cabang,staff_aktif_cabang,driver_dibina,
        target_pembinaan,persen_pembinaan,nilai_kpi_pembinaan,
        skor_absensi,skor_pelayanan,skor_kerapian,
        nilai_performa,nilai_kpi_performa,
        bonus_poin,kpi_akhir,kategori,catatan,input_by,created_at,updated_at`)
      .eq("bulan", b).eq("tahun", y)
      .order("kpi_akhir", { ascending: false });
    const { data } = await q;
    setRecords(data ?? []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Filtered records ──────────────────────────── */
  const filtered = useMemo(() => {
    return records.filter(r => {
      if (filterCabang !== "ALL" && airportById[r.airport_id]?.code !== filterCabang) return false;
      return true;
    });
  }, [records, filterCabang, airportById]);

  /* ── Stats ─────────────────────────────────────── */
  const stats = useMemo(() => {
    const cur = filtered.filter(r => r.bulan === filterBulan && r.tahun === filterTahun);
    const avgKPI  = cur.length ? cur.reduce((s, r) => s + (r.kpi_akhir||0), 0) / cur.length : 0;
    const totalSaldo = cur.reduce((s, r) => s + (r.realisasi_saldo||0), 0);
    const totalDriver = Object.values(driverCountByAirport).reduce((a, b) => a + b, 0);
    const top = cur[0];
    // Cabang terbaik = airport dengan avg KPI tertinggi
    const byAirport: Record<string, number[]> = {};
    cur.forEach(r => { (byAirport[r.airport_id] ??= []).push(r.kpi_akhir||0); });
    let bestAirport = "";
    let bestAvg = 0;
    Object.entries(byAirport).forEach(([aid, vals]) => {
      const avg = vals.reduce((a,b)=>a+b,0)/vals.length;
      if (avg > bestAvg) { bestAvg = avg; bestAirport = aid; }
    });
    return { avgKPI, totalSaldo, totalDriver, top, bestAirport, bestAvg };
  }, [filtered, filterBulan, filterTahun, driverCountByAirport]);

  /* ── Modal helpers ─────────────────────────────── */
  function openNew() {
    setEditId(null);
    const defaultAirport = !isDirector ? me.airport_id : "";
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  }

  function openEdit(r: KPIRecord) {
    setEditId(r.id);
    setForm({
      staff_id:       r.staff_id,
      target_saldo:   r.target_saldo,
      realisasi_saldo: r.realisasi_saldo,
      driver_dibina:  r.driver_dibina,
      skor_pelayanan: r.skor_pelayanan,
      skor_kerapian:  r.skor_kerapian,
      catatan:        r.catatan ?? "",
    });
    setShowModal(true);
  }

  /* ── Save ──────────────────────────────────────── */
  function handleSave() {
    startSave(async () => {
      if (!form.staff_id) { setToast({ msg: "Pilih staff terlebih dahulu", ok: false }); return; }
      // Only send user-input fields — trigger auto-computes everything else
      const payload = {
        staff_id:        form.staff_id,
        bulan:           filterBulan,
        tahun:           filterTahun,
        target_saldo:    form.target_saldo,
        realisasi_saldo: form.realisasi_saldo,
        driver_dibina:   form.driver_dibina,
        skor_pelayanan:  form.skor_pelayanan,
        skor_kerapian:   form.skor_kerapian,
        catatan:         form.catatan,
        input_by:        me.id,
      };
      let err: any;
      if (editId) {
        ({ error: err } = await (supabase as any).from("kpi_staff_bulanan").update(payload).eq("id", editId));
      } else {
        ({ error: err } = await (supabase as any).from("kpi_staff_bulanan")
          .upsert(payload, { onConflict: "staff_id,bulan,tahun" }));
      }
      if (err) { setToast({ msg: err.message, ok: false }); }
      else {
        setToast({ msg: "KPI berhasil disimpan", ok: true });
        setShowModal(false);
        loadPeriod(filterBulan, filterTahun);
        setTimeout(() => setToast(null), 3000);
      }
    });
  }

  /* ── Export CSV ─────────────────────────────────── */
  function exportCSV() {
    const cur = filtered.filter(r => r.bulan === filterBulan && r.tahun === filterTahun);
    const header = ["No","Staff","Kode","Cabang","Target Saldo","Realisasi","% Saldo","KPI Saldo","Driver Dibina","KPI Pembinaan","Absensi","Pelayanan","Kerapian","KPI Performa","Bonus","KPI Akhir","Kategori"];
    const rows = cur.map((r, i) => {
      const st = staffById[r.staff_id];
      const ap = airportById[r.airport_id];
      return [i+1, st?.nama??"-", st?.staff_code??"-", ap?.city??"-",
        r.target_saldo, r.realisasi_saldo, r.persen_saldo?.toFixed(1),
        r.nilai_kpi_saldo?.toFixed(1), r.driver_dibina,
        r.nilai_kpi_pembinaan?.toFixed(1), r.skor_absensi?.toFixed(1),
        r.skor_pelayanan?.toFixed(1), r.skor_kerapian?.toFixed(1),
        r.nilai_kpi_performa?.toFixed(1), r.bonus_poin?.toFixed(1),
        r.kpi_akhir?.toFixed(1), r.kategori].join(",");
    });
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `KPI-Staff-${BULAN[filterBulan]}-${filterTahun}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  /* ── Modal selected staff info ─────────────────── */
  const selStaff = staffById[form.staff_id];
  const selAirportId = selStaff?.airport_id ?? (isCoordinator ? me.airport_id : "");
  const selDriverAktif = driverCountByAirport[selAirportId] ?? 0;
  const selStaffAktif  = staffCountByAirport[selAirportId]  ?? 1;
  const selAirport     = airportById[selAirportId];

  // Existing record to get auto-computed absensi
  const existingRec = records.find(r => r.staff_id === form.staff_id && r.bulan === filterBulan && r.tahun === filterTahun);
  const autoAbsensi = existingRec?.skor_absensi ?? 0;

  const prev = previewKPI(form, selDriverAktif, selStaffAktif, autoAbsensi);

  // Staff available for new input (not yet entered this period)
  const existingIds = new Set(records
    .filter(r => r.bulan === filterBulan && r.tahun === filterTahun)
    .map(r => r.staff_id));
  const availableStaff = editId
    ? staffList
    : staffList.filter(s => !existingIds.has(s.id));

  // Per-cabang grouping for tab
  const byCabang = useMemo(() => {
    const cur = filtered.filter(r => r.bulan === filterBulan && r.tahun === filterTahun);
    const m: Record<string, KPIRecord[]> = {};
    cur.forEach(r => {
      const code = airportById[r.airport_id]?.code ?? "?";
      (m[code] ??= []).push(r);
    });
    return m;
  }, [filtered, filterBulan, filterTahun, airportById]);

  const curPeriod = filtered.filter(r => r.bulan === filterBulan && r.tahun === filterTahun);
  const perluPembinaan = curPeriod.filter(r => (r.kpi_akhir ?? 0) < 70);

  /* ──────────────────────────────────────────────────────────────── RENDER */
  return (
    <div className="space-y-5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl
          ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: NAVY }}>KPI Staff Bandara</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            PT Rifim International Gemilang · {BULAN[filterBulan]} {filterTahun}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            Export CSV
          </button>
          {canInput && (
            <button onClick={openNew}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm text-black shadow-md shadow-yellow-100 hover:bg-yellow-400 transition-colors"
              style={{ background: PRIMARY }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Input KPI
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {isDirector && (
          <select value={filterCabang} onChange={e => setFilterCabang(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-300">
            <option value="ALL">Semua Cabang</option>
            {airports.map(a => <option key={a.id} value={a.code}>{a.city} ({a.code})</option>)}
          </select>
        )}
        <select value={filterBulan}
          onChange={e => { const b = +e.target.value; setFilterBulan(b); loadPeriod(b, filterTahun); }}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-300">
          {BULAN.slice(1).map((n, i) => <option key={i+1} value={i+1}>{n}</option>)}
        </select>
        <input type="number" value={filterTahun} min={2024} max={2099}
          onChange={e => { const y = +e.target.value; setFilterTahun(y); if (String(y).length===4) loadPeriod(filterBulan, y); }}
          className="w-24 text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-300" />
      </div>

      {/* ─── 6 Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card label="Total Staff" value={staffList.length} sub="Seluruh cabang aktif" />
        <Card label="Rata-rata KPI" value={stats.avgKPI.toFixed(1)} sub={`${curPeriod.length} record`} accent />
        <Card label="Total Saldo"
          value={`Rp ${(stats.totalSaldo/1e6).toFixed(1)}jt`}
          sub="Realisasi bulan ini" />
        <Card label="Driver Aktif" value={stats.totalDriver.toLocaleString("id-ID")} sub="Nasional, semua cabang" />
        <Card
          label="Top Performer"
          value={stats.top ? (staffById[stats.top.staff_id]?.nama?.split(" ")[0] ?? "—") : "—"}
          sub={stats.top ? `${stats.top.kpi_akhir?.toFixed(1)} poin` : "Belum ada data"}
        />
        <Card
          label="Cabang Terbaik"
          value={stats.bestAirport ? (airportById[stats.bestAirport]?.city ?? "—") : "—"}
          sub={stats.bestAvg > 0 ? `Avg ${stats.bestAvg.toFixed(1)} poin` : "Belum ada data"}
        />
      </div>

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["nasional","cabang","perlu"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab===tab ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}>
            {tab==="nasional" ? "Ranking Nasional" : tab==="cabang" ? "Per Cabang" : `Perlu Evaluasi${perluPembinaan.length>0?` (${perluPembinaan.length})`:""}` }
          </button>
        ))}
      </div>

      {/* ─── Tab: Ranking Nasional ───────────────────────────────────────── */}
      {activeTab === "nasional" && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: NAVY }}>
                  {["#","Staff","Cabang","Saldo 50%","Pembinaan 30%","Performa 20%","Bonus","KPI Akhir","Kategori",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide text-white/70 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {curPeriod.map((r, i) => {
                  const st = staffById[r.staff_id];
                  const ap = airportById[r.airport_id];
                  const kat = r.kategori ?? kategoriOf(r.kpi_akhir ?? 0);
                  return (
                    <tr key={r.id} className="hover:bg-yellow-50/30 transition-colors">
                      <td className="px-4 py-3 font-black text-gray-300">
                        {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-xs text-black"
                            style={{ background: PRIMARY }}>
                            {st?.nama?.[0]?.toUpperCase() ?? "S"}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 whitespace-nowrap">{st?.nama ?? "—"}</p>
                            <p className="text-xs text-gray-400">{st?.staff_code} · {st?.jabatan}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-bold px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                          ✈ {ap?.city ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{(r.nilai_kpi_saldo??0).toFixed(1)}</p>
                        <p className="text-[11px] text-gray-400">{(r.persen_saldo??0).toFixed(0)}% saldo</p>
                        <ScoreBar value={r.persen_saldo??0} max={120} />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{(r.nilai_kpi_pembinaan??0).toFixed(1)}</p>
                        <p className="text-[11px] text-gray-400">{r.driver_dibina} driver</p>
                        <ScoreBar value={r.persen_pembinaan??0} color="#3B82F6" />
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-800">{(r.nilai_kpi_performa??0).toFixed(1)}</p>
                        <p className="text-[11px] text-gray-400">Abs {r.skor_absensi?.toFixed(0)}% / Pel {r.skor_pelayanan?.toFixed(0)}</p>
                        <ScoreBar value={r.nilai_performa??0} color="#10B981" />
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600">
                        {(r.bonus_poin??0) > 0 ? `+${r.bonus_poin?.toFixed(1)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xl font-black" style={{
                          color: (r.kpi_akhir??0) >= 100 ? "#22C55E" : (r.kpi_akhir??0) >= 80 ? "#F59E0B" : "#EF4444"
                        }}>
                          {(r.kpi_akhir??0).toFixed(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3"><KatBadge kat={kat} /></td>
                      <td className="px-4 py-3">
                        {canInput && (
                          <button onClick={() => openEdit(r)} className="p-1.5 text-gray-300 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {curPeriod.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center">
                      <p className="text-3xl mb-2">📊</p>
                      <p className="font-semibold text-gray-400">Belum ada data KPI untuk {BULAN[filterBulan]} {filterTahun}</p>
                      {canInput && <p className="text-sm text-gray-300 mt-1">Klik "Input KPI" untuk mulai</p>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400 font-medium">
            {curPeriod.length} record · {BULAN[filterBulan]} {filterTahun} · Skor absensi otomatis dari database kehadiran
          </div>
        </div>
      )}

      {/* ─── Tab: Per Cabang ────────────────────────────────────────────── */}
      {activeTab === "cabang" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {airports.map(ap => {
            const recs = byCabang[ap.code] ?? [];
            const avg = recs.length ? recs.reduce((s,r)=>s+(r.kpi_akhir??0),0)/recs.length : 0;
            return (
              <div key={ap.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50"
                  style={{ borderTop: `3px solid ${PRIMARY}` }}>
                  <div>
                    <p className="font-black text-gray-900">{ap.city}</p>
                    <p className="text-xs text-gray-400">{ap.code} · {staffCountByAirport[ap.id]??0} staff · {driverCountByAirport[ap.id]??0} driver</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black" style={{ color: avg >= 90 ? "#22C55E" : avg >= 70 ? "#F59E0B" : "#EF4444" }}>
                      {recs.length ? avg.toFixed(1) : "—"}
                    </p>
                    <p className="text-xs text-gray-400">avg KPI</p>
                  </div>
                </div>
                {recs.length === 0 ? (
                  <div className="px-5 py-8 text-center text-sm text-gray-300">Belum ada input KPI</div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {recs.map(r => {
                      const st = staffById[r.staff_id];
                      return (
                        <div key={r.id} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="font-semibold text-sm text-gray-800">{st?.nama ?? "—"}</p>
                            <p className="text-xs text-gray-400">{st?.jabatan}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <KatBadge kat={r.kategori ?? kategoriOf(r.kpi_akhir??0)} />
                            <span className="font-black text-gray-900 w-12 text-right">{(r.kpi_akhir??0).toFixed(1)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Tab: Perlu Evaluasi ─────────────────────────────────────────── */}
      {activeTab === "perlu" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {perluPembinaan.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="font-semibold text-gray-500">Tidak ada staff dengan KPI &lt; 70 bulan ini</p>
            </div>
          ) : (
            <>
              <div className="px-5 py-4 border-b border-gray-50 bg-red-50">
                <p className="font-bold text-red-800 text-sm">
                  {perluPembinaan.length} staff dengan KPI &lt; 70 — perlu tindak lanjut koordinator
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {perluPembinaan.map(r => {
                  const st = staffById[r.staff_id];
                  const ap = airportById[r.airport_id];
                  return (
                    <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center font-black text-red-600">
                        {st?.nama?.[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{st?.nama ?? "—"}</p>
                        <p className="text-xs text-gray-400">{ap?.city} · {st?.jabatan}</p>
                        <div className="flex gap-3 mt-1 text-xs text-gray-500">
                          <span>Saldo: {(r.persen_saldo??0).toFixed(0)}%</span>
                          <span>Pembinaan: {(r.persen_pembinaan??0).toFixed(0)}%</span>
                          <span>Absensi: {(r.skor_absensi??0).toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-red-600">{(r.kpi_akhir??0).toFixed(1)}</p>
                        <KatBadge kat={r.kategori ?? "Evaluasi Khusus"} />
                      </div>
                      {canInput && (
                        <button onClick={() => openEdit(r)} className="p-2 text-gray-300 hover:text-yellow-600 rounded-xl hover:bg-yellow-50">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* ══ MODAL INPUT ══════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 sticky top-0 bg-white rounded-t-2xl border-b border-gray-100 z-10"
              style={{ borderTop: `3px solid ${PRIMARY}` }}>
              <div>
                <h2 className="font-black text-gray-900">{editId ? "Edit KPI Staff" : "Input KPI Staff"}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{BULAN[filterBulan]} {filterTahun}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Staff selector */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Staff</label>
                <select value={form.staff_id} disabled={!!editId}
                  onChange={e => setForm(f => ({ ...f, staff_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:bg-gray-50">
                  <option value="">-- Pilih Staff --</option>
                  {(editId ? staffList : availableStaff).map(s => {
                    const ap = airportById[s.airport_id];
                    return <option key={s.id} value={s.id}>{s.nama} — {ap?.city ?? "?"} ({s.staff_code})</option>;
                  })}
                </select>
                {selAirport && (
                  <div className="mt-2 flex gap-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                    <span>Cabang: <strong>{selAirport.city}</strong></span>
                    <span>Driver aktif: <strong>{selDriverAktif}</strong> (dari DB)</span>
                    <span>Staff aktif: <strong>{selStaffAktif}</strong> (dari DB)</span>
                  </div>
                )}
              </div>

              {/* Modul 1 */}
              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 space-y-3">
                <p className="text-sm font-bold text-yellow-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg text-black text-xs font-black flex items-center justify-center" style={{ background: PRIMARY }}>1</span>
                  Target Saldo — 50%
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Target Saldo (Rp)</label>
                    <input type="number" value={form.target_saldo || ""} placeholder="3000000"
                      onChange={e => setForm(f => ({ ...f, target_saldo: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Realisasi Saldo (Rp)</label>
                    <input type="number" value={form.realisasi_saldo || ""} placeholder="3600000"
                      onChange={e => setForm(f => ({ ...f, realisasi_saldo: +e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">Persentase: <strong>{prev.ps.toFixed(1)}%</strong></span>
                  <span className="text-gray-500">Nilai: <strong className="text-yellow-700">{prev.ns.toFixed(1)} poin</strong></span>
                  {prev.bon > 0 && <span className="text-emerald-600 font-bold">+{prev.bon.toFixed(1)} bonus</span>}
                </div>
              </div>

              {/* Modul 2 */}
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
                <p className="text-sm font-bold text-blue-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
                  Pembinaan Driver — 30%
                </p>
                <div className="bg-blue-100/50 rounded-xl px-3 py-2 text-xs text-blue-700 space-y-0.5">
                  <p>Driver aktif cabang: <strong>{selDriverAktif}</strong> · Staff aktif: <strong>{selStaffAktif}</strong> (otomatis dari database)</p>
                  <p>Target pembinaan per staff: <strong>{prev.tp.toFixed(0)} driver</strong></p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-semibold mb-1 block">Driver Dibina oleh Staff ini</label>
                  <input type="number" value={form.driver_dibina || ""} placeholder="180"
                    onChange={e => setForm(f => ({ ...f, driver_dibina: +e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">Persentase: <strong>{prev.pp.toFixed(1)}%</strong></span>
                  <span className="text-gray-500">Nilai: <strong className="text-blue-700">{prev.np.toFixed(1)} poin</strong></span>
                </div>
              </div>

              {/* Modul 3 */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                <p className="text-sm font-bold text-emerald-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-emerald-600 text-white text-xs font-black flex items-center justify-center">3</span>
                  Performa Staff — 20%
                </p>
                {/* Absensi: read-only auto */}
                <div className="bg-emerald-100/50 rounded-xl px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-800">A. Absensi (40%) — OTOMATIS</p>
                    <p className="text-[11px] text-emerald-600 mt-0.5">Dari data kehadiran & jadwal kerja</p>
                  </div>
                  <span className="text-lg font-black text-emerald-700">
                    {autoAbsensi > 0 ? `${autoAbsensi.toFixed(1)}` : "—"}
                    <span className="text-xs font-normal text-emerald-500 ml-0.5">/100</span>
                  </span>
                </div>
                {/* Manual inputs */}
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">B. Pelayanan Penumpang (40%) — 0–100</label>
                    <div className="flex items-center gap-3">
                      <input type="number" min="0" max="100" value={form.skor_pelayanan || ""}
                        placeholder="Keramahan, responsif, pickup point"
                        onChange={e => setForm(f => ({ ...f, skor_pelayanan: Math.min(100, Math.max(0, +e.target.value)) }))}
                        className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <ScoreBar value={form.skor_pelayanan} color="#10B981" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">C. Kerapian & Kebersihan (20%) — 0–100</label>
                    <div className="flex items-center gap-3">
                      <input type="number" min="0" max="100" value={form.skor_kerapian || ""}
                        placeholder="Seragam, ID card, kebersihan"
                        onChange={e => setForm(f => ({ ...f, skor_kerapian: Math.min(100, Math.max(0, +e.target.value)) }))}
                        className="w-24 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                      <ScoreBar value={form.skor_kerapian} color="#10B981" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 text-sm">
                  <span className="text-gray-500">Nilai: <strong className="text-emerald-700">{prev.nkp.toFixed(1)} poin</strong></span>
                </div>
              </div>

              {/* KPI Preview */}
              <div className="rounded-2xl border-2 border-yellow-300 p-4 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, #FFFBE6, #FFF3C0)" }}>
                <div>
                  <p className="text-xs font-black text-yellow-700 uppercase tracking-widest">KPI Akhir</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {prev.ns.toFixed(1)} + {prev.np.toFixed(1)} + {prev.nkp.toFixed(1)} + {prev.bon.toFixed(1)} bonus
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-black" style={{ color: NAVY }}>{prev.akhir.toFixed(1)}</p>
                  <KatBadge kat={prev.kat} />
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">Catatan (opsional)</label>
                <textarea value={form.catatan} rows={2}
                  onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
                  placeholder="Catatan tambahan untuk staff ini..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-yellow-300" />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                  Batal
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-black hover:bg-yellow-400 disabled:opacity-60 shadow-md"
                  style={{ background: PRIMARY }}>
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
