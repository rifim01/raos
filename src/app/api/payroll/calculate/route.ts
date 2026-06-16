import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { engineCalculatePayroll, engineCalculatePayrollBatch } from "@/lib/payroll-engine";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "AIRPORT_COORDINATOR"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { staffId, airportId, bulan, tahun } = body;

  if (!bulan || !tahun) return NextResponse.json({ error: "Missing bulan/tahun" }, { status: 400 });

  if (staffId) {
    const r = await engineCalculatePayroll(staffId, bulan, tahun);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 422 });
    return NextResponse.json({ payrollId: r.payrollId });
  }

  if (airportId) {
    const r = await engineCalculatePayrollBatch(airportId, bulan, tahun);
    if (r.error) return NextResponse.json({ error: r.error }, { status: 422 });
    return NextResponse.json({ results: r.results });
  }

  return NextResponse.json({ error: "Missing staffId or airportId" }, { status: 400 });
}
