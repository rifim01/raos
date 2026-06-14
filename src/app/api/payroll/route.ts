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
    const { data, error } = await supabase
      .from("payroll")
      .select(`
        id, staff_id, airport_id, period_month, period_year,
        salary_base, overtime_hours, overtime_pay, bonus, incentive,
        deductions, kasbon_deduction, absence_deduction,
        total_gross, total_net, status, paid_at,
        staff:staff_id (full_name, position, department)
      `)
      .eq("airport_id", airportId)
      .eq("period_month", month)
      .eq("period_year", year)
      .order("created_at");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data ?? []).map((r: unknown) => {
      const row = r as Record<string, unknown>;
      const staff = row.staff as Record<string, string> | null;
      return {
        id: row.id,
        staff_id: row.staff_id,
        staff_name: staff?.full_name ?? "-",
        position: staff?.position ?? "-",
        department: staff?.department ?? "-",
        salary_base: Number(row.salary_base ?? 0),
        overtime_hours: Number(row.overtime_hours ?? 0),
        overtime_pay: Number(row.overtime_pay ?? 0),
        bonus: Number(row.bonus ?? 0),
        incentive: Number(row.incentive ?? 0),
        deductions: Number(row.deductions ?? 0),
        kasbon_deduction: Number(row.kasbon_deduction ?? 0),
        absence_deduction: Number(row.absence_deduction ?? 0),
        total_gross: Number(row.total_gross ?? 0),
        total_net: Number(row.total_net ?? 0),
        status: row.status,
        paid_at: row.paid_at,
      };
    });

    return NextResponse.json({ rows });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
