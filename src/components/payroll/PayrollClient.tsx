"use client";

import { useState, useTransition } from "react";
import { formatCurrency } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  DRAFT:    "bg-gray-100 text-gray-600",
  REVIEW:   "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  PAID:     "bg-green-100 text-green-700",
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT:    "Draft",
  REVIEW:   "Review",
  APPROVED: "Disetujui",
  PAID:     "Dibayar",
};

type PayrollRow = {
  id: string;
  status: string;
  periode: string;
  gaji_pokok: number;
  bpjs: number;
  kuota: number;
  bonus: number;
  lembur: number;
  denda_telat: number;
  potongan_alpha: number;
  kasbon: number;
  deposit: number;
  total_pendapatan: number;
  total_potongan: number;
  gaji_bersih: number;
  total_hadir: number;
  total_terlambat: number;
  total_alpha: number;
  jam_lembur: number;
  staff: { nama: string; jabatan: string; staff_code: string } | null;
};

interface Props {
  payrolls: PayrollRow[];
  airportId: string;
  bulan: number;
  tahun: number;
  userRoleLevel: number;
}

export default function PayrollClient({ payrolls, airportId, bulan, tahun, userRoleLevel }: Props) {
  const [list, setList] = useState<PayrollRow[]>(payrolls);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const reloadPayrolls = async () => {
    const res = await fetch(`/api/payroll/list?airportId=${airportId}&bulan=${bulan}&tahun=${tahun}`);
    if (res.ok) { const data = await res.json(); setList(data); }
  };

  const calculateAll = () => {
    startTransition(async () => {
      const res = await fetch("/api/payroll/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ airportId, bulan, tahun }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? "Error", false); return; }
      showToast(`Berhasil menghitung ${json.results?.length ?? 0} payroll`, true);
      await reloadPayrolls();
    });
  };

  const doAction = (payrollId: string, action: string) => {
    startTransition(async () => {
      const res = await fetch("/api/payroll/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payrollId, action }),
      });
      const json = await res.json();
      if (!res.ok) { showToast(json.error ?? "Error", false); return; }
      showToast("Berhasil", true);
      await reloadPayrolls();
    });
  };

  const detail = list.find((p) => p.id === detailId);

  const totalGajiBersih = list.reduce((a, p) => a + Number(p.gaji_bersih ?? 0), 0);
  const draftCount    = list.filter((p) => p.status === "DRAFT").length;
  const reviewCount   = list.filter((p) => p.status === "REVIEW").length;
  const approvedCount = list.filter((p) => p.status === "APPROVED").length;
  const paidCount     = list.filter((p) => p.status === "PAID").length;

  return (
    <div className="space-y-4">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Gaji Bersih", value: formatCurrency(totalGajiBersih), color: "text-blue-700", bg: "bg-blue-50", wide: true },
          { label: "Draft",    value: draftCount,    color: "text-gray-700",  bg: "bg-gray-50" },
          { label: "Review",   value: reviewCount,   color: "text-yellow-700", bg: "bg-yellow-50" },
          { label: "Approved", value: approvedCount, color: "text-blue-700",  bg: "bg-blue-50" },
          { label: "Paid",     value: paidCount,     color: "text-green-700", bg: "bg-green-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center ${"wide" in s && s.wide ? "col-span-2 md:col-span-1" : ""}`}>
            <p className={`text-base font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <p className="text-sm text-gray-600 flex-1">{list.length} staff · {new Date(tahun, bulan - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</p>
        {userRoleLevel >= 3 && (
          <button
            onClick={calculateAll}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-[#1565C0] text-white text-sm font-bold hover:bg-[#1976D2] disabled:opacity-40 transition-colors"
          >
            {isPending ? "Menghitung..." : "Hitung Semua"}
          </button>
        )}
        {userRoleLevel >= 4 && reviewCount > 0 && (
          <button
            onClick={() => list.filter(p => p.status === "REVIEW").forEach(p => doAction(p.id, "approve"))}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            Approve Semua Review ({reviewCount})
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-100 bg-gray-50/50">
                {["Staff", "Hadir/Telat/Alpha", "Pendapatan", "Potongan", "Gaji Bersih", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-gray-500 font-semibold">Belum ada data payroll</p>
                    <p className="text-gray-400 text-sm mt-1">Klik "Hitung Semua" untuk generate payroll bulan ini</p>
                  </td>
                </tr>
              ) : list.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-800 text-sm">{p.staff?.nama ?? "—"}</p>
                    <p className="text-xs text-gray-400">{p.staff?.jabatan} · {p.staff?.staff_code}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 text-xs">
                      <span className="text-green-700 font-semibold">{p.total_hadir}H</span>
                      <span className="text-orange-600 font-semibold">{p.total_terlambat}T</span>
                      <span className="text-red-600 font-semibold">{p.total_alpha}A</span>
                    </div>
                    {p.jam_lembur > 0 && <p className="text-xs text-purple-600">{Number(p.jam_lembur).toFixed(1)} jam lembur</p>}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-700">{formatCurrency(Number(p.total_pendapatan))}</td>
                  <td className="px-4 py-3 text-sm font-medium text-red-600">{formatCurrency(Number(p.total_potongan))}</td>
                  <td className="px-4 py-3">
                    <p className="font-black text-gray-800">{formatCurrency(Number(p.gaji_bersih))}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[p.status] ?? "bg-gray-100 text-gray-500"}`}>
                      {STATUS_LABEL[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5 flex-wrap">
                      <button onClick={() => setDetailId(p.id)} className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium">
                        Detail
                      </button>
                      <a href={`/payroll/${p.id}/slip`} target="_blank" className="text-xs px-2.5 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 font-medium">
                        Slip
                      </a>
                      {p.status === "DRAFT" && userRoleLevel >= 3 && (
                        <button onClick={() => doAction(p.id, "submit")} disabled={isPending} className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-500 text-white font-medium hover:bg-yellow-600 disabled:opacity-40">
                          Submit
                        </button>
                      )}
                      {p.status === "REVIEW" && userRoleLevel >= 4 && (
                        <button onClick={() => doAction(p.id, "approve")} disabled={isPending} className="text-xs px-2.5 py-1.5 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-40">
                          Approve
                        </button>
                      )}
                      {p.status === "APPROVED" && userRoleLevel >= 4 && (
                        <button onClick={() => doAction(p.id, "pay")} disabled={isPending} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-40">
                          Bayar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-800">{detail.staff?.nama}</p>
                <p className="text-xs text-gray-400">{detail.periode}</p>
              </div>
              <button onClick={() => setDetailId(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Attendance */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Kehadiran</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Hadir",     value: detail.total_hadir,     color: "text-green-700",  bg: "bg-green-50" },
                    { label: "Terlambat", value: detail.total_terlambat, color: "text-orange-600", bg: "bg-orange-50" },
                    { label: "Alpha",     value: detail.total_alpha,     color: "text-red-600",    bg: "bg-red-50" },
                  ].map((s) => (
                    <div key={s.label} className={`${s.bg} rounded-xl py-2`}>
                      <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                      <p className="text-[10px] text-gray-500">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Pendapatan */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Pendapatan</p>
                <div className="space-y-1.5">
                  {[
                    ["Gaji Pokok",  detail.gaji_pokok],
                    ["BPJS",        detail.bpjs],
                    ["Kuota",       detail.kuota],
                    ["Bonus",       detail.bonus],
                    ["Lembur",      detail.lembur],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between text-sm">
                      <span className="text-gray-600">{l}</span>
                      <span className="font-semibold text-gray-800">{formatCurrency(Number(v))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1.5">
                    <span className="text-gray-700">Total Pendapatan</span>
                    <span className="text-green-700">{formatCurrency(Number(detail.total_pendapatan))}</span>
                  </div>
                </div>
              </div>
              {/* Potongan */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Potongan</p>
                <div className="space-y-1.5">
                  {[
                    ["Denda Telat",     detail.denda_telat],
                    ["Potongan Alpha",  detail.potongan_alpha],
                    ["Kasbon",          detail.kasbon],
                    ["Deposit",         detail.deposit],
                  ].map(([l, v]) => (
                    <div key={String(l)} className="flex justify-between text-sm">
                      <span className="text-gray-600">{l}</span>
                      <span className="font-semibold text-red-600">{formatCurrency(Number(v))}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t border-gray-100 pt-1.5 mt-1.5">
                    <span className="text-gray-700">Total Potongan</span>
                    <span className="text-red-700">{formatCurrency(Number(detail.total_potongan))}</span>
                  </div>
                </div>
              </div>
              {/* Gaji Bersih */}
              <div className="bg-blue-50 rounded-xl p-4 flex justify-between items-center">
                <p className="font-bold text-blue-800">GAJI BERSIH</p>
                <p className="font-black text-xl text-blue-700">{formatCurrency(Number(detail.gaji_bersih))}</p>
              </div>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <a href={`/payroll/${detail.id}/slip`} target="_blank"
                className="flex-1 py-2.5 rounded-xl border border-blue-200 text-blue-700 text-sm font-bold text-center hover:bg-blue-50">
                Cetak Slip
              </a>
              <button onClick={() => setDetailId(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
