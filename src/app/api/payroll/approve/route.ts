import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { engineAdvanceStatus, engineRejectPayroll } from "@/lib/payroll-engine";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "AIRPORT_COORDINATOR"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { payrollId, action, notes } = await req.json();
  if (!payrollId || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (action === "reject") {
    const r = await engineRejectPayroll(payrollId, notes ?? "");
    if (r.error) return NextResponse.json({ error: r.error }, { status: 422 });
    return NextResponse.json({ ok: true });
  }

  const statusMap: Record<string, "REVIEW" | "APPROVED" | "PAID"> = {
    submit:  "REVIEW",
    approve: "APPROVED",
    pay:     "PAID",
  };
  const target = statusMap[action];
  if (!target) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  // Only DIRECTOR+ can approve
  if (action === "approve" && !hasMinRole(user, "DIRECTOR"))
    return NextResponse.json({ error: "Only Director can approve payroll" }, { status: 403 });

  const r = await engineAdvanceStatus(payrollId, target, authUser.id);
  if (r.error) return NextResponse.json({ error: r.error }, { status: 422 });
  return NextResponse.json({ ok: true });
}
