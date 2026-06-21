import { NextResponse } from "next/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "DIRECTOR"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const [{ data: stats }, { data: alerts }, { data: kpiNasional }] = await Promise.all([
    (supabase as any).from("vw_command_center_per_airport").select("*").order("airport_code"),
    (supabase as any)
      .from("notifications")
      .select("id, title, message, type, is_read, created_at, airport_id, data, airports(code, city)")
      .order("created_at", { ascending: false })
      .limit(30),
    (supabase as any).from("vw_driver_kpi_nasional").select("*"),
  ]);

  // Merge KPI nasional ke stats per airport
  const kpiMap: Record<string, unknown> = {};
  for (const k of kpiNasional ?? []) {
    kpiMap[k.airport_code] = k;
  }

  const statsEnriched = (stats ?? []).map((s: Record<string, unknown>) => ({
    ...s,
    kpi: kpiMap[s.airport_code as string] ?? null,
  }));

  // Ringkasan nasional
  const national = (kpiNasional ?? []).reduce(
    (acc: Record<string, number>, k: Record<string, number>) => ({
      total_driver:       acc.total_driver       + (k.total_driver ?? 0),
      total_order_bulan:  acc.total_order_bulan  + (k.total_order_bulan ?? 0),
      total_pendapatan:   acc.total_pendapatan   + (k.total_pendapatan_bulan ?? 0),
      total_pelanggaran:  acc.total_pelanggaran  + (k.total_pelanggaran ?? 0),
    }),
    { total_driver: 0, total_order_bulan: 0, total_pendapatan: 0, total_pelanggaran: 0 }
  );

  return NextResponse.json({
    stats:   statsEnriched,
    alerts:  alerts ?? [],
    kpi:     kpiNasional ?? [],
    national,
  });
}
