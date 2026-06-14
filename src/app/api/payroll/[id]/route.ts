import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any;

    // Recalculate totals if numeric fields change
    if (
      body.overtime_pay !== undefined || body.bonus !== undefined ||
      body.incentive !== undefined || body.deductions !== undefined ||
      body.kasbon_deduction !== undefined || body.absence_deduction !== undefined
    ) {
      const { data: current } = await supabase
        .from("payroll")
        .select("salary_base, overtime_pay, bonus, incentive, deductions, kasbon_deduction, absence_deduction")
        .eq("id", id)
        .single();

      if (current) {
        const c = current as Record<string, unknown>;
        const salaryBase = Number(c.salary_base ?? 0);
        const overtimePay = Number(body.overtime_pay ?? c.overtime_pay ?? 0);
        const bonus = Number(body.bonus ?? c.bonus ?? 0);
        const incentive = Number(body.incentive ?? c.incentive ?? 0);
        const deductions = Number(body.deductions ?? c.deductions ?? 0);
        const kasbonDeduction = Number(body.kasbon_deduction ?? c.kasbon_deduction ?? 0);
        const absenceDeduction = Number(body.absence_deduction ?? c.absence_deduction ?? 0);

        body.total_gross = salaryBase + overtimePay + bonus + incentive;
        body.total_net = (body.total_gross as number) - deductions - kasbonDeduction - absenceDeduction;
      }
    }

    if (body.status === "PAID") body.paid_at = new Date().toISOString();
    body.updated_at = new Date().toISOString();

    const { error } = await supabase.from("payroll").update(body).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
