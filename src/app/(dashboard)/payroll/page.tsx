"use client";

import { useState, useEffect, useCallback } from "react";

const MONTHS = [
  "Januari","Februari","Maret","April","Mei","Juni",
  "Juli","Agustus","September","Oktober","November","Desember"
];

const AIRPORTS = [
  { code: "BTH001", label: "Batam" },
  { code: "DJB001", label: "Jambi" },
  { code: "UPG001", label: "Makassar" },
  { code: "BPN001", label: "Balikpapan" },
  { code: "MDC001", label: "Manado" },
  { code: "PKU001", label: "Pekanbaru" },
];

const IDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

type PayrollRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  position: string;
  department: string;
  salary_base: number;
  overtime_hours: number;
  overtime_pay: number;
  bonus: number;
  incentive: number;
  deductions: number;
  kasbon_deduction: number;
  absence_deduction: number;
  total_gross: number;
  total_net: number;
  status: "DRAFT" | "APPROVED" | "PAID";
};

type KasbonRow = {
  id: string;
  staff_id: string;
  staff_name: string;
  position: string;
  amount: number;
  remaining: number;
  monthly_installment: number;
  purpose: string;
  date: string;
  status: string;
};

type Tab = "payroll" | "kasbon";

export default function PayrollPage() {
  const now = new Date();
  const [tab, setTab] = useState<Tab>("payroll");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [airport, setAirport] = useState("BTH001");
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PayrollRow>>({});
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [kasbonList, setKasbonList] = useState<KasbonRow[]>([]);
  const [kasbonLoading, setKasbonLoading] = useState(false);
  const [showKasbonForm, setShowKasbonForm] = useState(false);
  const [kasbonForm, setKasbonForm] = useState({ staff_id: "", amount: "", monthly_installment: "", purpose: "", date: "" });
  const [staffList, setStaffList] = useState<{ id: string; full_name: string; position: string }[]>([]);

  const fetchPayroll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/payroll?month=${month}&year=${year}&airport=${airport}`);
      const data = await res.json();
      setRows(data.rows ?? []);
    } catch { setRows([]); }
    setLoading(false);
  }, [month, year, airport]);

  const fetchKasbon = useCallback(async () => {
    setKasbonLoading(true);
    try {
      const res = await fetch(`/api/payroll/kasbon?airport=${airport}`);
      const data = await res.json();
      setKasbonList(data.rows ?? []);
    } catch { setKasbonList([]); }
    setKasbonLoading(false);
  }, [airport]);

  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch(`/api/payroll/staff-list?airport=${airport}`);
      const data = await res.json();
      setStaffList(data.staff ?? []);
    } catch { setStaffList([]); }
  }, [airport]);

  useEffect(() => { fetchPayroll(); }, [fetchPayroll]);
  useEffect(() => {
    if (tab === "kasbon") { fetchKasbon(); fetchStaff(); }
  }, [tab, fetchKasbon, fetchStaff]);

  async function handleGenerate() {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/payroll/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, airport_code: airport }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: "ok", text: `✅ Berhasil generate ${data.generated} data payroll` });
        fetchPayroll();
      } else {
        setMsg({ type: "err", text: `❌ ${data.error}` });
      }
    } catch { setMsg({ type: "err", text: "❌ Gagal terhubung ke server" }); }
    setGenerating(false);
  }

  async function handleSaveEdit(id: string) {
    setSaving(id);
    try {
      const res = await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editValues),
      });
      const data = await res.json();
      if (data.success) { setEditRow(null); setEditValues({}); fetchPayroll(); }
      else setMsg({ type: "err", text: `❌ ${data.error}` });
    } catch { setMsg({ type: "err", text: "❌ Gagal menyimpan" }); }
    setSaving(null);
  }

  async function handleStatusChange(id: string, status: "APPROVED" | "PAID") {
    setSaving(id);
    try {
      await fetch(`/api/payroll/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      fetchPayroll();
    } catch { /* ignore */ }
    setSaving(null);
  }

  async function handleBulkStatus(status: "APPROVED" | "PAID") {
    setLoading(true);
    const targets = rows.filter(r => status === "APPROVED" ? r.status === "DRAFT" : r.status === "APPROVED");
    await Promise.all(targets.map(r =>
      fetch(`/api/payroll/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    ));
    fetchPayroll();
  }

  async function handleAddKasbon() {
    try {
      const res = await fetch("/api/payroll/kasbon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...kasbonForm, airport_code: airport }),
      });
      const data = await res.json();
      if (data.success) {
        setShowKasbonForm(false);
        setKasbonForm({ staff_id: "", amount: "", monthly_installment: "", purpose: "", date: "" });
        fetchKasbon();
      } else {
        setMsg({ type: "err", text: `❌ ${data.error}` });
      }
    } catch { setMsg({ type: "err", text: "❌ Gagal menyimpan kasbon" }); }
  }

  const totals = rows.reduce((acc, r) => ({
    gross: acc.gross + (r.total_gross || 0),
    net: acc.net + (r.total_net || 0),
    kasbon: acc.kasbon + (r.kasbon_deduction || 0),
  }), { gross: 0, net: 0, kasbon: 0 });

  const draftCount = rows.filter(r => r.status === "DRAFT").length;
  const approvedCount = rows.filter(r => r.status === "APPROVED").length;
  const paidCount = rows.filter(r => r.status === "PAID").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Manajemen Payroll</h1>
          <p className="text-gray-500 text-sm mt-0.5">Kelola gaji, lembur, bonus & kasbon staff</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ k: "payroll", label: "💰 Payroll" }, { k: "kasbon", label: "🏦 Kasbon" }].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k as Tab); setMsg(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.k ? "bg-white text-[#1565C0] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "payroll" && (
        <>
          {/* Filters + Actions */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Periode</label>
              <div className="flex gap-2">
                <select value={month} onChange={e => setMonth(+e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select value={year} onChange={e => setYear(+e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bandara</label>
              <select value={airport} onChange={e => setAirport(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.label} ({a.code})</option>)}
              </select>
            </div>
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={handleGenerate} disabled={generating}
                className="px-4 py-2 rounded-xl bg-[#1565C0] text-white text-sm font-bold disabled:opacity-50 hover:bg-[#0d47a1] flex items-center gap-2">
                {generating
                  ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Generating...</>
                  : "⚡ Generate Payroll"}
              </button>
              {draftCount > 0 && (
                <button onClick={() => handleBulkStatus("APPROVED")}
                  className="px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600">
                  ✓ Approve Semua ({draftCount})
                </button>
              )}
              {approvedCount > 0 && (
                <button onClick={() => handleBulkStatus("PAID")}
                  className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700">
                  💳 Bayar Semua ({approvedCount})
                </button>
              )}
            </div>
          </div>

          {msg && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.type === "ok" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {msg.text}
            </div>
          )}

          {/* Summary */}
          {rows.length > 0 && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { label: "Total Staff", value: rows.length.toString(), sub: `${draftCount} draft · ${approvedCount} approved · ${paidCount} paid`, color: "blue" },
                { label: "Total Gaji Bruto", value: IDR(totals.gross), sub: "Sebelum potongan", color: "purple" },
                { label: "Total Kasbon", value: IDR(totals.kasbon), sub: "Cicilan bulan ini", color: "red" },
                { label: "Total Gaji Bersih", value: IDR(totals.net), sub: "Yang dibayarkan", color: "green" },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-200 p-4">
                  <p className="text-xs font-semibold text-gray-500">{c.label}</p>
                  <p className={`text-lg font-black mt-1 ${c.color === "blue" ? "text-[#1565C0]" : c.color === "green" ? "text-green-600" : c.color === "red" ? "text-red-500" : "text-purple-600"}`}>{c.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Memuat data payroll...</div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl">💰</div>
                <div className="text-center">
                  <p className="font-semibold text-gray-700">Belum ada data payroll</p>
                  <p className="text-sm text-gray-400 mt-1">Klik "Generate Payroll" untuk membuat payroll {MONTHS[month - 1]} {year}</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["#", "Nama Staff", "Jabatan", "Gaji Pokok", "Lembur", "Bonus", "Kasbon", "Potongan Lain", "Gaji Bersih", "Status", "Aksi"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {rows.map((row, idx) => {
                      const isEditing = editRow === row.id;
                      const ev = editValues;
                      return (
                        <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-gray-800">{row.staff_name}</p>
                            <p className="text-xs text-gray-400">{row.department}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{row.position}</td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">{IDR(row.salary_base)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <div className="space-y-1">
                                <input type="number" placeholder="Jam" value={ev.overtime_hours ?? row.overtime_hours}
                                  onChange={e => setEditValues(v => ({ ...v, overtime_hours: +e.target.value }))}
                                  className="w-16 px-2 py-1 rounded-lg border border-gray-200 text-xs" />
                                <input type="number" placeholder="Bayar" value={ev.overtime_pay ?? row.overtime_pay}
                                  onChange={e => setEditValues(v => ({ ...v, overtime_pay: +e.target.value }))}
                                  className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs" />
                              </div>
                            ) : (
                              <div>
                                <p className="text-xs text-gray-400">{row.overtime_hours} jam</p>
                                <p className="font-medium">{IDR(row.overtime_pay)}</p>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input type="number" value={ev.bonus ?? row.bonus}
                                onChange={e => setEditValues(v => ({ ...v, bonus: +e.target.value }))}
                                className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs" />
                            ) : <span className="font-medium">{IDR(row.bonus)}</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-red-500 font-medium">{IDR(row.kasbon_deduction)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {isEditing ? (
                              <input type="number" value={ev.deductions ?? row.deductions}
                                onChange={e => setEditValues(v => ({ ...v, deductions: +e.target.value }))}
                                className="w-24 px-2 py-1 rounded-lg border border-gray-200 text-xs" />
                            ) : <span className="font-medium">{IDR(row.deductions)}</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-bold text-green-600">{IDR(row.total_net)}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              row.status === "PAID" ? "bg-green-100 text-green-700" :
                              row.status === "APPROVED" ? "bg-amber-100 text-amber-700" :
                              "bg-gray-100 text-gray-600"
                            }`}>{row.status}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              {isEditing ? (
                                <>
                                  <button onClick={() => handleSaveEdit(row.id)} disabled={saving === row.id}
                                    className="px-2.5 py-1 bg-[#1565C0] text-white text-xs rounded-lg font-semibold disabled:opacity-50">
                                    {saving === row.id ? "..." : "Simpan"}
                                  </button>
                                  <button onClick={() => { setEditRow(null); setEditValues({}); }}
                                    className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg font-semibold">Batal</button>
                                </>
                              ) : (
                                <>
                                  {row.status === "DRAFT" && (
                                    <button onClick={() => { setEditRow(row.id); setEditValues({}); }}
                                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500" title="Edit">
                                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                      </svg>
                                    </button>
                                  )}
                                  {row.status === "DRAFT" && (
                                    <button onClick={() => handleStatusChange(row.id, "APPROVED")} disabled={saving === row.id}
                                      className="px-2 py-1 bg-amber-50 text-amber-600 text-xs rounded-lg font-semibold hover:bg-amber-100">
                                      ✓
                                    </button>
                                  )}
                                  {row.status === "APPROVED" && (
                                    <button onClick={() => handleStatusChange(row.id, "PAID")} disabled={saving === row.id}
                                      className="px-2 py-1 bg-green-50 text-green-600 text-xs rounded-lg font-semibold hover:bg-green-100">
                                      💳
                                    </button>
                                  )}
                                  <a href={`/api/payroll/${row.id}/slip`} target="_blank"
                                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 inline-flex" title="Slip Gaji">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                    </svg>
                                  </a>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-700">
                        TOTAL ({rows.length} staff)
                      </td>
                      <td colSpan={2} className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-sm font-bold text-red-500">{IDR(totals.kasbon)}</td>
                      <td className="px-4 py-3"></td>
                      <td className="px-4 py-3 text-sm font-bold text-green-600">{IDR(totals.net)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === "kasbon" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Bandara</label>
              <select value={airport} onChange={e => setAirport(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
              </select>
            </div>
            <div className="ml-auto">
              <button onClick={() => setShowKasbonForm(!showKasbonForm)}
                className="px-4 py-2 rounded-xl bg-[#1565C0] text-white text-sm font-bold hover:bg-[#0d47a1]">
                + Tambah Kasbon
              </button>
            </div>
          </div>

          {msg && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${msg.type === "ok" ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {msg.text}
            </div>
          )}

          {showKasbonForm && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-bold text-gray-800 mb-4">Form Kasbon Baru</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Staff</label>
                  <select value={kasbonForm.staff_id} onChange={e => setKasbonForm({ ...kasbonForm, staff_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                    <option value="">Pilih staff...</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.position}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal</label>
                  <input type="date" value={kasbonForm.date} onChange={e => setKasbonForm({ ...kasbonForm, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Jumlah Kasbon (Rp)</label>
                  <input type="number" value={kasbonForm.amount} onChange={e => setKasbonForm({ ...kasbonForm, amount: e.target.value })}
                    placeholder="5000000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Cicilan per Bulan (Rp)</label>
                  <input type="number" value={kasbonForm.monthly_installment} onChange={e => setKasbonForm({ ...kasbonForm, monthly_installment: e.target.value })}
                    placeholder="500000"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Keperluan</label>
                  <input type="text" value={kasbonForm.purpose} onChange={e => setKasbonForm({ ...kasbonForm, purpose: e.target.value })}
                    placeholder="Keperluan kasbon..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleAddKasbon} className="px-5 py-2 bg-[#1565C0] text-white rounded-xl text-sm font-bold hover:bg-[#0d47a1]">Simpan</button>
                <button onClick={() => setShowKasbonForm(false)} className="px-5 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200">Batal</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Kasbon Aktif", value: kasbonList.filter(k => k.status === "ACTIVE").length.toString(), color: "blue" },
              { label: "Total Sisa", value: IDR(kasbonList.reduce((a, r) => a + r.remaining, 0)), color: "red" },
              { label: "Cicilan/Bulan", value: IDR(kasbonList.filter(k => k.status === "ACTIVE").reduce((a, r) => a + r.monthly_installment, 0)), color: "amber" },
            ].map(c => (
              <div key={c.label} className="bg-white rounded-2xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-semibold">{c.label}</p>
                <p className={`text-xl font-black mt-1 ${c.color === "blue" ? "text-[#1565C0]" : c.color === "red" ? "text-red-500" : "text-amber-600"}`}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {kasbonLoading ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Memuat...</div>
            ) : kasbonList.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-gray-400 text-sm">Belum ada data kasbon</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      {["Nama Staff", "Jabatan", "Tanggal", "Total Kasbon", "Sisa", "Cicilan/Bln", "Keperluan", "Status"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {kasbonList.map(row => (
                      <tr key={row.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-800">{row.staff_name}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{row.position}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(row.date).toLocaleDateString("id-ID")}</td>
                        <td className="px-4 py-3 font-medium">{IDR(row.amount)}</td>
                        <td className="px-4 py-3 font-bold text-red-500">{IDR(row.remaining)}</td>
                        <td className="px-4 py-3 text-amber-600 font-medium">{IDR(row.monthly_installment)}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{row.purpose}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            row.status === "ACTIVE" ? "bg-green-100 text-green-700" :
                            row.status === "PAID_OFF" ? "bg-gray-100 text-gray-500" : "bg-amber-100 text-amber-700"
                          }`}>
                            {row.status === "PAID_OFF" ? "Lunas" : row.status === "ACTIVE" ? "Aktif" : row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
