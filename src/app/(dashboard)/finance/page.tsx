import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();
  const now = new Date();
  const bulan = now.getMonth() + 1;
  const tahun = now.getFullYear();
  const today = now.toISOString().split("T")[0];
  const monthStart = `${tahun}-${String(bulan).padStart(2, "0")}-01`;
  const monthEnd = bulan === 12
    ? `${tahun + 1}-01-01`
    : `${tahun}-${String(bulan + 1).padStart(2, "0")}-01`;

  const isDirector = hasMinRole(user, "DIRECTOR");

  let airportFilter: string[] = [];
  if (isDirector) {
    const { data: airports } = await (supabase as any)
      .from("airports").select("id").in("code", ["DJB001","PKU001","BTH001","BPN001","MDC001","UPG001"]);
    airportFilter = (airports ?? []).map((a: { id: string }) => a.id);
  } else if (user.airport_id) {
    airportFilter = [user.airport_id];
  }

  const applyFilter = (q: any) =>
    airportFilter.length === 1 ? q.eq("airport_id", airportFilter[0])
    : airportFilter.length > 1 ? q.in("airport_id", airportFilter)
    : q;

  const [
    { data: masukData },
    { data: keluarData },
    { data: payrollData },
    { data: extData },
    { data: bills },
    { data: recentTx },
  ] = await Promise.all([
    applyFilter((supabase as any).from("finance_transactions").select("nominal").eq("jenis","PEMASUKAN").gte("tanggal", monthStart).lt("tanggal", monthEnd)),
    applyFilter((supabase as any).from("finance_transactions").select("nominal").eq("jenis","PENGELUARAN").gte("tanggal", monthStart).lt("tanggal", monthEnd)),
    applyFilter((supabase as any).from("payroll").select("gaji_bersih").eq("periode_bulan", bulan).eq("periode_tahun", tahun).in("status",["APPROVED","PAID"])),
    applyFilter((supabase as any).from("finance_external_income").select("nominal").gte("tanggal", monthStart).lt("tanggal", monthEnd)),
    applyFilter((supabase as any).from("finance_bills").select("id,vendor,invoice_number,jumlah,jatuh_tempo,status,airports(code,city)").in("status",["UNPAID","OVERDUE"]).order("jatuh_tempo").limit(10)),
    applyFilter((supabase as any).from("finance_transactions").select("id,jenis,kategori,nominal,keterangan,tanggal,airports(code,city)").order("created_at",{ascending:false}).limit(10)),
  ]);

  const sum = (rows: any[], key: string) => (rows ?? []).reduce((a: number, r: any) => a + Number(r[key] ?? 0), 0);

  const pemasukan   = sum(masukData, "nominal");
  const pengeluaran = sum(keluarData, "nominal");
  const payroll     = sum(payrollData, "gaji_bersih");
  const ext         = sum(extData, "nominal");
  const profit      = pemasukan + ext - pengeluaran - payroll;

  const overdueBills  = (bills ?? []).filter((b: any) => b.jatuh_tempo < today);
  const monthName = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const STATUS_BILL: Record<string, string> = {
    UNPAID:   "bg-yellow-100 text-yellow-700",
    OVERDUE:  "bg-red-100 text-red-700",
    PAID:     "bg-green-100 text-green-700",
    DISPUTED: "bg-gray-100 text-gray-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Finance</h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            {isDirector ? "Nasional" : user.airport_code} · {monthName}
          </p>
        </div>
        <Link href="/payroll" className="px-4 py-2 rounded-xl bg-[#1565C0] text-white text-sm font-bold hover:bg-[#1976D2] transition-colors">
          Payroll
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {[
          { label: "Pendapatan",     value: pemasukan,   color: "text-green-700",  bg: "bg-green-50",  icon: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" },
          { label: "Pengeluaran",    value: pengeluaran, color: "text-red-700",    bg: "bg-red-50",    icon: "M20 12H4M4 12l6-6M4 12l6 6" },
          { label: "Total Payroll",  value: payroll,     color: "text-blue-700",   bg: "bg-blue-50",   icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" },
          { label: "Pendapatan Ext", value: ext,         color: "text-purple-700", bg: "bg-purple-50", icon: "M13 10V3L4 14h7v7l9-11h-7z" },
          { label: profit >= 0 ? "Profit" : "Rugi", value: Math.abs(profit), color: profit >= 0 ? "text-green-700" : "text-red-700", bg: profit >= 0 ? "bg-green-50" : "bg-red-50", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${s.color}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-500">{s.label}</p>
            </div>
            <p className={`text-lg font-black ${s.color} leading-tight`}>{formatCurrency(s.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bills */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-800">Tagihan Jatuh Tempo</h3>
              <p className="text-xs text-gray-400 mt-0.5">{(bills ?? []).length} tagihan aktif</p>
            </div>
            {overdueBills.length > 0 && (
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-100 text-red-700">
                {overdueBills.length} OVERDUE
              </span>
            )}
          </div>
          {(bills ?? []).length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Tidak ada tagihan jatuh tempo</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(bills ?? []).slice(0, 8).map((b: any) => (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{b.vendor}</p>
                    <p className="text-xs text-gray-400">{b.invoice_number} · {b.airports?.city ?? "—"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-gray-800">{formatCurrency(Number(b.jumlah))}</p>
                    <p className={`text-xs mt-0.5 ${b.jatuh_tempo < today ? "text-red-500" : "text-gray-400"}`}>
                      {new Date(b.jatuh_tempo).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_BILL[b.status]}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent transactions */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Transaksi Terbaru</h3>
            <p className="text-xs text-gray-400 mt-0.5">10 transaksi terakhir</p>
          </div>
          {(recentTx ?? []).length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Belum ada transaksi</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {(recentTx ?? []).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${t.jenis === "PEMASUKAN" ? "bg-green-50" : "bg-red-50"}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`w-4 h-4 ${t.jenis === "PEMASUKAN" ? "text-green-600" : "text-red-600"}`}>
                      {t.jenis === "PEMASUKAN"
                        ? <path d="M12 20V4M12 4l-4 4M12 4l4 4" />
                        : <path d="M12 4v16M12 20l-4-4M12 20l4-4" />}
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.keterangan || t.kategori}</p>
                    <p className="text-xs text-gray-400">{t.kategori} · {t.airports?.city ?? "—"}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-bold ${t.jenis === "PEMASUKAN" ? "text-green-700" : "text-red-700"}`}>
                      {t.jenis === "PEMASUKAN" ? "+" : "-"}{formatCurrency(Number(t.nominal))}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(t.tanggal).toLocaleDateString("id-ID",{day:"numeric",month:"short"})}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
