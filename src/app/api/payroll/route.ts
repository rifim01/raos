import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AIRPORT_IDS: Record<string, string> = {
  "BPN001": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "BTH001": "1325804e-8dd5-458e-a782-80a231a09303",
  "DJB001": "2669bd67-290d-4aa1-805f-540951592b2a",
  "MDC001": "0587c176-e85f-4c7b-a2be-0e255e158612",
  "PKU001": "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  "UPG001": "3528d0a3-ba4d-43d7-a91e-40786efaae48",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const month = parseInt(searchParams.get("month") ?? "1");
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const airportCode = searchParams.get("airport") ?? "BTH001";
    const airportId = AIRPORT_IDS[airportCode];
    if (!airportId) return NextResponse.json({ rows: [] });

    const supabase = await createClient();

    // payroll tidak punya kolom airport_id langsung — harus filter via staff_id
    const { data: staffRows, error: staffError } = await supabase
      .from("staff")
      .select("id")
      .eq("airport_id", airportId);

    if (staffError) return NextResponse.json({ error: staffError.message }, { status: 500 });

    const staffIds = (staffRows ?? []).map((s) => s.id);
    if (staffIds.length === 0) return NextResponse.json({ rows: [] });

    const { data, error } = await supabase
      .from("payroll")
      .select(`
        id, staff_id, periode, periode_bulan, periode_tahun,
        gaji_pokok, bpjs, kuota, bonus, lembur, jam_lembur,
        kasbon, denda_telat, potongan_alpha, deposit,
        total_pendapatan, total_potongan, gaji_bersih,
        total_hadir, total_terlambat, total_alpha,
        status, approved_by, paid_at, notes,
        staff:staff_id (nama, jabatan, department)
      `)
      .in("staff_id", staffIds)
      .eq("periode_bulan", month)
      .eq("periode_tahun", year)
      .order("created_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []).map((row) => {
      const staff = row.staff as { nama: string; jabatan: string; department: string | null } | null;
      return {
        id: row.id,
        staff_id: row.staff_id,
        staff_name: staff?.nama ?? "-",
        position: staff?.jabatan ?? "-",
        department: staff?.department ?? "-",
        salary_base: Number(row.gaji_pokok ?? 0),
        overtime_hours: Number(row.jam_lembur ?? 0),
        overtime_pay: Number(row.lembur ?? 0),
        bonus: Number(row.bonus ?? 0),
        incentive: Number(row.kuota ?? 0),
        deductions: Number(row.denda_telat ?? 0),
        kasbon_deduction: Number(row.kasbon ?? 0),
        absence_deduction: Number(row.potongan_alpha ?? 0),
        total_gross: Number(row.total_pendapatan ?? 0),
        total_net: Number(row.gaji_bersih ?? 0),
        status: row.status,
        paid_at: row.paid_at,
      };
    });

    return NextResponse.json({ rows });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
