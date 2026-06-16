import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function SlipGajiPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: p } = await (supabase as any)
    .from("payroll")
    .select("*, staff(nama, jabatan, staff_code, email, photo_url, airports(code, city, name))")
    .eq("id", id)
    .single();

  if (!p) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Slip tidak ditemukan</p>
      </div>
    );
  }

  const staff = p.staff as any;
  const airport = staff?.airports as any;
  const bulanNama = new Date(p.periode_tahun, p.periode_bulan - 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const RIFIM_QR = `RIFIM-SLIP-${p.id.slice(0, 8).toUpperCase()}`;

  const pendapatanItems = [
    { label: "Gaji Pokok",     value: Number(p.gaji_pokok) },
    { label: "Tunjangan BPJS", value: Number(p.bpjs) },
    { label: "Tunjangan Kuota",value: Number(p.kuota) },
    { label: "Bonus",          value: Number(p.bonus) },
    { label: "Lembur",         value: Number(p.lembur) },
  ].filter((i) => i.value > 0);

  const potonganItems = [
    { label: "Denda Keterlambatan", value: Number(p.denda_telat) },
    { label: "Potongan Alpha",      value: Number(p.potongan_alpha) },
    { label: "Kasbon",              value: Number(p.kasbon) },
    { label: "Deposit",             value: Number(p.deposit) },
  ].filter((i) => i.value > 0);

  const STATUS_LABEL: Record<string, string> = {
    DRAFT: "Draft", REVIEW: "Review", APPROVED: "Disetujui", PAID: "Dibayar",
  };

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          @page { margin: 1.5cm; size: A4 portrait; }
        }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f1f5f9; }
      `}</style>

      {/* Print button */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => typeof window !== "undefined" && window.print()}
          className="px-4 py-2 bg-[#1565C0] text-white text-sm font-bold rounded-xl shadow-lg hover:bg-[#1976D2] transition-colors"
        >
          Cetak / Simpan PDF
        </button>
        <button
          onClick={() => typeof window !== "undefined" && window.history.back()}
          className="px-4 py-2 bg-white border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl shadow hover:bg-gray-50"
        >
          Kembali
        </button>
      </div>

      <div className="min-h-screen py-8 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

          {/* Header */}
          <div className="bg-gradient-to-r from-[#0D47A1] to-[#1565C0] px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-black text-xl tracking-wider">RIFIM</p>
                <p className="text-white/70 text-xs font-medium tracking-widest uppercase">Airport Operating System</p>
                <p className="text-white/60 text-xs mt-1">PT RIFIM INTERNATIONAL GEMILANG</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-sm text-white/80">SLIP GAJI</p>
                <p className="font-black text-lg">{bulanNama}</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${
                  p.status === "PAID" ? "bg-green-400/30 text-green-100" :
                  p.status === "APPROVED" ? "bg-blue-300/30 text-blue-100" :
                  "bg-white/20 text-white/70"
                }`}>{STATUS_LABEL[p.status] ?? p.status}</span>
              </div>
            </div>
          </div>

          {/* Staff info */}
          <div className="px-8 py-5 border-b border-gray-100 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1565C0]/10 flex items-center justify-center text-[#1565C0] font-black text-2xl flex-shrink-0">
              {(staff?.nama ?? "S")[0].toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-black text-xl text-gray-800">{staff?.nama ?? "—"}</p>
              <p className="text-gray-500 text-sm">{staff?.jabatan}</p>
              <p className="text-gray-400 text-xs mt-0.5">{staff?.staff_code} · {airport?.city} ({airport?.code})</p>
            </div>
            {p.paid_at && (
              <div className="text-right text-xs text-gray-400">
                <p>Dibayar</p>
                <p className="font-semibold">{new Date(p.paid_at).toLocaleDateString("id-ID")}</p>
              </div>
            )}
          </div>

          {/* Attendance summary */}
          <div className="px-8 py-4 border-b border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Ringkasan Kehadiran</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Hari Hadir",    value: p.total_hadir,     color: "text-green-700",  bg: "bg-green-50" },
                { label: "Terlambat",     value: p.total_terlambat, color: "text-orange-600", bg: "bg-orange-50" },
                { label: "Hari Alpha",    value: p.total_alpha,     color: "text-red-600",    bg: "bg-red-50" },
                { label: "Jam Lembur",    value: `${Number(p.jam_lembur).toFixed(1)}j`, color: "text-purple-700", bg: "bg-purple-50" },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pendapatan + Potongan */}
          <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-gray-100">
            <div>
              <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-3">Pendapatan</p>
              <div className="space-y-2">
                {pendapatanItems.map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-semibold text-gray-800">{formatCurrency(item.value)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-bold border-t border-green-100 pt-2 mt-1">
                  <span className="text-green-700">Total Pendapatan</span>
                  <span className="text-green-700">{formatCurrency(Number(p.total_pendapatan))}</span>
                </div>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-3">Potongan</p>
              {potonganItems.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Tidak ada potongan</p>
              ) : (
                <div className="space-y-2">
                  {potonganItems.map((item) => (
                    <div key={item.label} className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-semibold text-red-600">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-sm font-bold border-t border-red-100 pt-2 mt-1">
                    <span className="text-red-600">Total Potongan</span>
                    <span className="text-red-600">{formatCurrency(Number(p.total_potongan))}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gaji Bersih */}
          <div className="px-8 py-5 bg-gradient-to-r from-[#E3F2FD] to-[#EDE7F6]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-[#1565C0]">GAJI BERSIH</p>
                <p className="text-3xl font-black text-[#0D47A1] mt-0.5">{formatCurrency(Number(p.gaji_bersih))}</p>
              </div>
              {/* Simple text-based QR placeholder */}
              <div className="text-right">
                <div className="w-16 h-16 bg-white rounded-xl border-2 border-[#1565C0]/20 flex items-center justify-center">
                  <p className="text-[7px] font-mono text-gray-400 text-center leading-tight break-all px-1">{RIFIM_QR}</p>
                </div>
                <p className="text-[9px] text-gray-400 mt-1">Verifikasi</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <p>Ref: {p.id.slice(0, 8).toUpperCase()}</p>
            <p>Dicetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p>PT RIFIM INTERNATIONAL GEMILANG</p>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `
        document.querySelectorAll('.no-print button').forEach(btn => {
          if (btn.textContent.includes('Cetak')) {
            btn.addEventListener('click', () => window.print());
          } else {
            btn.addEventListener('click', () => window.history.back());
          }
        });
      `}} />
    </>
  );
}
