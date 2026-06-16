"use server";

import { createClient } from "@/lib/supabase/server";

// ─── Calculate payroll for one staff+period ───────────────────────────────────
export async function engineCalculatePayroll(staffId: string, bulan: number, tahun: number) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc("calculate_payroll", {
    p_staff_id: staffId,
    p_bulan:    bulan,
    p_tahun:    tahun,
  });
  if (error) return { error: error.message, payrollId: null };
  return { payrollId: data as string, error: null };
}

// ─── Calculate payroll for ALL active staff in an airport ────────────────────
export async function engineCalculatePayrollBatch(airportId: string, bulan: number, tahun: number) {
  const supabase = await createClient();

  const { data: staffList, error: staffErr } = await (supabase as any)
    .from("staff")
    .select("id")
    .eq("airport_id", airportId)
    .eq("status", "ACTIVE");

  if (staffErr) return { error: staffErr.message, results: [] };

  const results: Array<{ staffId: string; payrollId: string | null; error: string | null }> = [];

  for (const s of staffList ?? []) {
    const r = await engineCalculatePayroll(s.id, bulan, tahun);
    results.push({ staffId: s.id, payrollId: r.payrollId, error: r.error });
  }

  return { error: null, results };
}

// ─── Advance payroll status ──────────────────────────────────────────────────
// DRAFT → REVIEW → APPROVED → PAID
export async function engineAdvanceStatus(
  payrollId: string,
  targetStatus: "REVIEW" | "APPROVED" | "PAID",
  approverAuthId: string
) {
  const supabase = await createClient();

  const update: Record<string, unknown> = {
    status:     targetStatus,
    updated_at: new Date().toISOString(),
  };
  if (targetStatus === "APPROVED") update.approved_by = approverAuthId;
  if (targetStatus === "PAID")     update.paid_at = new Date().toISOString();

  const { error } = await (supabase as any)
    .from("payroll")
    .update(update)
    .eq("id", payrollId);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Reject payroll (back to DRAFT) ──────────────────────────────────────────
export async function engineRejectPayroll(payrollId: string, notes: string) {
  const supabase = await createClient();
  const { error } = await (supabase as any)
    .from("payroll")
    .update({ status: "DRAFT", notes, updated_at: new Date().toISOString() })
    .eq("id", payrollId);
  if (error) return { error: error.message };
  return { error: null };
}

// ─── Update bonus on a DRAFT payroll ─────────────────────────────────────────
export async function engineUpdateBonus(payrollId: string, bonus: number) {
  const supabase = await createClient();
  const { data: p } = await (supabase as any)
    .from("payroll")
    .select("gaji_pokok,bpjs,kuota,lembur,denda_telat,potongan_alpha,kasbon,deposit")
    .eq("id", payrollId)
    .eq("status", "DRAFT")
    .single();

  if (!p) return { error: "Payroll tidak ditemukan atau bukan DRAFT" };

  const pendapatan = Number(p.gaji_pokok) + Number(p.bpjs) + Number(p.kuota) + Number(p.lembur) + bonus;
  const potongan   = Number(p.denda_telat) + Number(p.potongan_alpha) + Number(p.kasbon) + Number(p.deposit);
  const bersih     = pendapatan - potongan;

  const { error } = await (supabase as any)
    .from("payroll")
    .update({
      bonus,
      total_pendapatan: pendapatan,
      total_potongan:   potongan,
      gaji_bersih:      bersih,
      updated_at:       new Date().toISOString(),
    })
    .eq("id", payrollId);

  if (error) return { error: error.message };
  return { error: null };
}

// ─── Get payroll slip data ────────────────────────────────────────────────────
export async function engineGetSlipData(payrollId: string) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("payroll")
    .select(`
      *,
      staff(nama, jabatan, staff_code, email, photo_url, airports(code, city))
    `)
    .eq("id", payrollId)
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Submit kasbon request ────────────────────────────────────────────────────
export async function submitKasbon(
  staffId: string,
  airportId: string,
  jumlah: number,
  cicilanPerBulan: number,
  tujuan: string
) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("kasbon")
    .insert({
      staff_id:         staffId,
      airport_id:       airportId,
      jumlah,
      sisa:             jumlah,
      cicilan_per_bulan: cicilanPerBulan,
      tujuan,
      status:           "ACTIVE",
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Submit overtime request ──────────────────────────────────────────────────
export async function submitOvertime(
  staffId: string,
  airportId: string,
  tanggal: string,
  jamMulai: string,
  jamSelesai: string,
  tarifPerJam: number,
  keterangan: string
) {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("overtime")
    .insert({
      staff_id:      staffId,
      airport_id:    airportId,
      tanggal,
      jam_mulai:     jamMulai,
      jam_selesai:   jamSelesai,
      tarif_per_jam: tarifPerJam,
      keterangan,
      status:        "PENDING",
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}
