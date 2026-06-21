/**
 * Payroll Auto-Run — /api/payroll/auto-run
 *
 * Dipanggil oleh Vercel Cron setiap tanggal 25 jam 01:00 WIB (18:00 UTC).
 * Juga bisa dipanggil manual dengan X-Sync-Key header.
 *
 * Flow:
 *   1. Ambil semua airport
 *   2. Untuk setiap airport → engineCalculatePayrollBatch(airportId, bulan, tahun)
 *   3. Log ringkasan hasil
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { engineCalculatePayrollBatch } from "@/lib/payroll-engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 menit — payroll batch bisa lambat

export async function POST(req: NextRequest) {
  // Auth: Vercel Cron pakai Authorization header, manual pakai X-Sync-Key
  const cronSecret  = req.headers.get("authorization");
  const syncKey     = req.headers.get("x-sync-key");
  const isCron      = cronSecret === `Bearer ${process.env.CRON_SECRET}`;
  const isManual    = syncKey === process.env.ATTENDANCE_SYNC_KEY;

  if (!isCron && !isManual) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const now  = new Date();

  // Default: bulan & tahun dari request body, atau bulan berjalan
  const bulan = body.bulan ?? now.getMonth() + 1; // 1-12
  const tahun = body.tahun ?? now.getFullYear();

  const supabase = createServiceClient();
  const { data: airports, error } = await supabase
    .from("airports")
    .select("id, code, city")
    .order("code");

  if (error || !airports?.length) {
    return NextResponse.json({ error: "Gagal ambil data airport", detail: error?.message }, { status: 500 });
  }

  const results: {
    airport: string;
    success: boolean;
    processed?: number;
    error?: string;
  }[] = [];

  for (const airport of airports) {
    try {
      const result = await engineCalculatePayrollBatch(airport.id, bulan, tahun);
      results.push({
        airport: `${airport.code} — ${airport.city}`,
        success: true,
        processed: result?.processed ?? 0,
      });
    } catch (e: unknown) {
      results.push({
        airport: `${airport.code} — ${airport.city}`,
        success: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const totalProcessed = results.reduce((s, r) => s + (r.processed ?? 0), 0);
  const failed         = results.filter((r) => !r.success);

  return NextResponse.json({
    success: true,
    period:  { bulan, tahun },
    total:   totalProcessed,
    airports: results,
    ...(failed.length ? { warnings: `${failed.length} airport gagal` } : {}),
  });
}

// Allow GET for Vercel Cron (cron jobs send GET by default unless configured)
export async function GET(req: NextRequest) {
  return POST(req);
}
