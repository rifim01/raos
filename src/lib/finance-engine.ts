"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Finance Summary per airport+bulan ───────────────────────────────────────
export async function getFinanceSummary(airportId: string, bulan: number, tahun: number) {
  const supabase = await createClient();

  const [
    { data: masuk },
    { data: keluar },
    { data: payrollTotal },
    { data: eksternal },
    { data: tagihanJatuhTempo },
  ] = await Promise.all([
    (supabase as any).from("finance_transactions").select("nominal")
      .eq("airport_id", airportId).eq("jenis", "PEMASUKAN")
      .gte("tanggal", `${tahun}-${String(bulan).padStart(2,"0")}-01`)
      .lt("tanggal", bulan === 12 ? `${tahun+1}-01-01` : `${tahun}-${String(bulan+1).padStart(2,"0")}-01`),
    (supabase as any).from("finance_transactions").select("nominal")
      .eq("airport_id", airportId).eq("jenis", "PENGELUARAN")
      .gte("tanggal", `${tahun}-${String(bulan).padStart(2,"0")}-01`)
      .lt("tanggal", bulan === 12 ? `${tahun+1}-01-01` : `${tahun}-${String(bulan+1).padStart(2,"0")}-01`),
    (supabase as any).from("payroll").select("gaji_bersih")
      .eq("airport_id", airportId).eq("periode_bulan", bulan).eq("periode_tahun", tahun)
      .in("status", ["APPROVED","PAID"]),
    (supabase as any).from("finance_external_income").select("nominal")
      .eq("airport_id", airportId)
      .gte("tanggal", `${tahun}-${String(bulan).padStart(2,"0")}-01`)
      .lt("tanggal", bulan === 12 ? `${tahun+1}-01-01` : `${tahun}-${String(bulan+1).padStart(2,"0")}-01`),
    (supabase as any).from("finance_bills").select("jumlah")
      .eq("airport_id", airportId).in("status", ["UNPAID","OVERDUE"])
      .lte("jatuh_tempo", new Date().toISOString().split("T")[0]),
  ]);

  const sum = (rows: Array<{ nominal?: number; jumlah?: number; gaji_bersih?: number }>, key: string) =>
    (rows ?? []).reduce((a, r) => a + Number((r as Record<string, number>)[key] ?? 0), 0);

  const pemasukan    = sum(masuk ?? [], "nominal");
  const pengeluaran  = sum(keluar ?? [], "nominal");
  const totalPayroll = sum(payrollTotal ?? [], "gaji_bersih");
  const ext          = sum(eksternal ?? [], "nominal");
  const tagihan      = sum(tagihanJatuhTempo ?? [], "jumlah");
  const profit       = pemasukan + ext - pengeluaran - totalPayroll;

  return { pemasukan, pengeluaran, totalPayroll, ext, tagihan, profit };
}

// ─── National summary across all airports ────────────────────────────────────
export async function getNationalFinanceSummary(bulan: number, tahun: number) {
  const supabase = await createClient();

  const [{ data: masuk }, { data: keluar }, { data: payrollTotal }, { data: ext }] = await Promise.all([
    (supabase as any).from("finance_transactions").select("airport_id, nominal")
      .eq("jenis", "PEMASUKAN")
      .gte("tanggal", `${tahun}-${String(bulan).padStart(2,"0")}-01`)
      .lt("tanggal", bulan === 12 ? `${tahun+1}-01-01` : `${tahun}-${String(bulan+1).padStart(2,"0")}-01`),
    (supabase as any).from("finance_transactions").select("airport_id, nominal")
      .eq("jenis", "PENGELUARAN")
      .gte("tanggal", `${tahun}-${String(bulan).padStart(2,"0")}-01`)
      .lt("tanggal", bulan === 12 ? `${tahun+1}-01-01` : `${tahun}-${String(bulan+1).padStart(2,"0")}-01`),
    (supabase as any).from("payroll").select("airport_id, gaji_bersih")
      .eq("periode_bulan", bulan).eq("periode_tahun", tahun).in("status", ["APPROVED","PAID"]),
    (supabase as any).from("finance_external_income").select("airport_id, nominal")
      .gte("tanggal", `${tahun}-${String(bulan).padStart(2,"0")}-01`)
      .lt("tanggal", bulan === 12 ? `${tahun+1}-01-01` : `${tahun}-${String(bulan+1).padStart(2,"0")}-01`),
  ]);

  const totalPemasukan  = (masuk ?? []).reduce((a: number, r: { nominal: number }) => a + Number(r.nominal), 0);
  const totalPengeluaran = (keluar ?? []).reduce((a: number, r: { nominal: number }) => a + Number(r.nominal), 0);
  const totalPayroll_   = (payrollTotal ?? []).reduce((a: number, r: { gaji_bersih: number }) => a + Number(r.gaji_bersih), 0);
  const totalExt        = (ext ?? []).reduce((a: number, r: { nominal: number }) => a + Number(r.nominal), 0);
  const totalProfit     = totalPemasukan + totalExt - totalPengeluaran - totalPayroll_;

  return { totalPemasukan, totalPengeluaran, totalPayroll: totalPayroll_, totalExt, totalProfit };
}

// ─── Add transaction ──────────────────────────────────────────────────────────
export async function addTransaction(
  airportId: string,
  jenis: "PEMASUKAN" | "PENGELUARAN",
  kategori: string,
  nominal: number,
  keterangan: string,
  tanggal: string,
  createdBy: string
) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("finance_transactions")
    .insert({ airport_id: airportId, jenis, kategori, nominal, keterangan, tanggal, created_by: createdBy })
    .select()
    .single();
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Mark bill as paid ────────────────────────────────────────────────────────
export async function markBillPaid(billId: string) {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("finance_bills")
    .update({ status: "PAID", paid_at: new Date().toISOString() })
    .eq("id", billId);
  if (error) return { error: error.message };
  return { error: null };
}
