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

export async function POST(req: NextRequest) {
  try {
    const { month, year, airport_code } = await req.json() as {
      month: number; year: number; airport_code: string;
    };

    const airportId = AIRPORT_IDS[airport_code?.toUpperCase()];
    if (!airportId) return NextResponse.json({ error: `Airport tidak dikenal: ${airport_code}` }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any;

    // Fetch active staff
    const { data: staffList, error: staffErr } = await supabase
      .from("staff")
      .select("id, full_name, salary_base")
      .eq("airport_id", airportId)
      .eq("status", "ACTIVE");

    if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 500 });
    const staff = (staffList ?? []) as Array<{ id: string; full_name: string; salary_base: number }>;
    if (!staff.length) return NextResponse.json({ error: "Tidak ada staff aktif di bandara ini" }, { status: 400 });

    // Fetch active kasbon for installment deductions
    const staffIds = staff.map(s => s.id);
    const { data: kasbonList } = await supabase
      .from("kasbon")
      .select("staff_id, monthly_installment")
      .in("staff_id", staffIds)
      .eq("status", "ACTIVE");

    const kasbonMap = new Map<string, number>();
    ((kasbonList ?? []) as Array<{ staff_id: string; monthly_installment: number }>).forEach(k => {
      kasbonMap.set(k.staff_id, (kasbonMap.get(k.staff_id) ?? 0) + Number(k.monthly_installment));
    });

    // Build payroll records
    const payrollRows = staff.map(s => {
      const salaryBase = Number(s.salary_base ?? 0);
      const kasbonDeduction = kasbonMap.get(s.id) ?? 0;
      return {
        staff_id: s.id,
        airport_id: airportId,
        period_month: month,
        period_year: year,
        salary_base: salaryBase,
        overtime_hours: 0,
        overtime_pay: 0,
        bonus: 0,
        incentive: 0,
        deductions: 0,
        kasbon_deduction: kasbonDeduction,
        absence_deduction: 0,
        total_gross: salaryBase,
        total_net: salaryBase - kasbonDeduction,
        status: "DRAFT",
      };
    });

    // Upsert — skip existing records (ignoreDuplicates)
    const { data: inserted, error: insertErr } = await supabase
      .from("payroll")
      .upsert(payrollRows, {
        onConflict: "staff_id,period_month,period_year",
        ignoreDuplicates: true,
      })
      .select("id");

    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    return NextResponse.json({ success: true, generated: (inserted as unknown[])?.length ?? payrollRows.length });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
