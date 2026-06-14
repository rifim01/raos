import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const IDR = (v: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(v);

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("payroll")
      .select(`
        *,
        staff:staff_id (full_name, nik, position, department, shift),
        airport:airport_id (name, code)
      `)
      .eq("id", id)
      .single();

    if (error || !data) return NextResponse.json({ error: "Data tidak ditemukan" }, { status: 404 });

    const row = data as Record<string, unknown>;
    const staff = row.staff as Record<string, string> | null;
    const airport = row.airport as Record<string, string> | null;
    const salaryBase = Number(row.salary_base ?? 0);
    const overtimePay = Number(row.overtime_pay ?? 0);
    const bonus = Number(row.bonus ?? 0);
    const incentive = Number(row.incentive ?? 0);
    const totalGross = Number(row.total_gross ?? 0);
    const kasbon = Number(row.kasbon_deduction ?? 0);
    const deductions = Number(row.deductions ?? 0);
    const absenceDeduction = Number(row.absence_deduction ?? 0);
    const totalNet = Number(row.total_net ?? 0);
    const month = Number(row.period_month ?? 1);
    const year = Number(row.period_year ?? new Date().getFullYear());

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Slip Gaji — ${staff?.full_name ?? "-"}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f8fafc; color: #1e293b; font-size: 13px; }
  .page { max-width: 600px; margin: 32px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #1565C0, #0d47a1); padding: 24px 28px; color: white; }
  .header h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .header p { font-size: 12px; opacity: 0.75; margin-top: 2px; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 3px 12px; font-size: 11px; font-weight: 600; margin-top: 8px; }
  .body { padding: 24px 28px; }
  .section { margin-bottom: 20px; }
  .section-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #64748b; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f1f5f9; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .info-item label { font-size: 10px; color: #94a3b8; display: block; margin-bottom: 2px; }
  .info-item span { font-size: 13px; font-weight: 600; color: #1e293b; }
  .row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f8fafc; }
  .row:last-child { border-bottom: none; }
  .row .label { color: #475569; }
  .row .amount { font-weight: 600; }
  .row.deduction .amount { color: #ef4444; }
  .total-row { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; background: #f0f9ff; border-radius: 12px; margin-top: 16px; }
  .total-row .label { font-weight: 700; font-size: 14px; color: #1e293b; }
  .total-row .amount { font-weight: 900; font-size: 18px; color: #1565C0; }
  .footer { padding: 16px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; }
  .footer p { font-size: 10px; color: #94a3b8; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; }
  .status-PAID { background: #dcfce7; color: #15803d; }
  .status-APPROVED { background: #fef3c7; color: #92400e; }
  .status-DRAFT { background: #f1f5f9; color: #475569; }
  @media print { body { background: white; } .page { box-shadow: none; margin: 0; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>✈ RIFIM Airport Operating System</h1>
    <p>${airport?.name ?? "RIFIM Airport"} · ${airport?.code ?? ""}</p>
    <div class="badge">SLIP GAJI ${MONTHS[month - 1].toUpperCase()} ${year}</div>
  </div>
  <div class="body">
    <div class="section">
      <div class="section-title">Data Karyawan</div>
      <div class="info-grid">
        <div class="info-item"><label>Nama</label><span>${staff?.full_name ?? "-"}</span></div>
        <div class="info-item"><label>NIK</label><span>${staff?.nik ?? "-"}</span></div>
        <div class="info-item"><label>Jabatan</label><span>${staff?.position ?? "-"}</span></div>
        <div class="info-item"><label>Departemen</label><span>${staff?.department ?? "-"}</span></div>
        <div class="info-item"><label>Shift</label><span>${staff?.shift ?? "-"}</span></div>
        <div class="info-item"><label>Status</label><span class="status-badge status-${String(row.status)}">${row.status}</span></div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">Pendapatan</div>
      <div class="row"><span class="label">Gaji Pokok</span><span class="amount">${IDR(salaryBase)}</span></div>
      ${overtimePay > 0 ? `<div class="row"><span class="label">Lembur (${Number(row.overtime_hours ?? 0)} jam)</span><span class="amount">${IDR(overtimePay)}</span></div>` : ""}
      ${bonus > 0 ? `<div class="row"><span class="label">Bonus</span><span class="amount">${IDR(bonus)}</span></div>` : ""}
      ${incentive > 0 ? `<div class="row"><span class="label">Insentif</span><span class="amount">${IDR(incentive)}</span></div>` : ""}
      <div class="row" style="font-weight:700"><span class="label">Total Bruto</span><span class="amount">${IDR(totalGross)}</span></div>
    </div>

    <div class="section">
      <div class="section-title">Potongan</div>
      ${kasbon > 0 ? `<div class="row deduction"><span class="label">Cicilan Kasbon</span><span class="amount">- ${IDR(kasbon)}</span></div>` : ""}
      ${deductions > 0 ? `<div class="row deduction"><span class="label">Potongan Lainnya</span><span class="amount">- ${IDR(deductions)}</span></div>` : ""}
      ${absenceDeduction > 0 ? `<div class="row deduction"><span class="label">Potongan Ketidakhadiran</span><span class="amount">- ${IDR(absenceDeduction)}</span></div>` : ""}
      ${(kasbon + deductions + absenceDeduction) === 0 ? `<div class="row"><span class="label" style="color:#94a3b8">Tidak ada potongan</span><span class="amount">-</span></div>` : ""}
    </div>

    <div class="total-row">
      <span class="label">GAJI BERSIH DITERIMA</span>
      <span class="amount">${IDR(totalNet)}</span>
    </div>
  </div>
  <div class="footer">
    <p>Dicetak oleh RAOS — RIFIM Airport Operating System</p>
    <p style="margin-top:4px">Dokumen ini dibuat secara otomatis dan sah tanpa tanda tangan</p>
    <button onclick="window.print()" style="margin-top:12px;padding:8px 20px;background:#1565C0;color:white;border:none;border-radius:8px;cursor:pointer;font-size:12px;font-weight:600">🖨 Cetak Slip</button>
  </div>
</div>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
