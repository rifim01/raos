import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { importStaff } from "@/lib/import/staff";
import { importDrivers } from "@/lib/import/drivers";
import { fetchSheetCsv, parseCSV } from "@/lib/import/csv";
import { resolveAirportId } from "@/lib/import/airports";

const STAFF_SHEET_ID = "1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw";
const STAFF_GID      = "1974631595";

const DRIVER_INT_JOBS = [
  { code: "BTH001", gid: "198439898" },
  { code: "DJB001", gid: "180760202" },
  { code: "BPN001", gid: "717116103" },
  { code: "MDC001", gid: "1905281204" },
  { code: "PKU001", gid: "466122581" },
  // UPG001 Makassar dikecualikan — status PLANNED
];

const DRIVER_EXT_JOBS = [
  { code: "BTH001", gid: "1698812948" },
  { code: "DJB001", gid: "674113852"  },
];

const DRIVER_INT_SHEET = "1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc";
const DRIVER_EXT_SHEET = "1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc";

function sheetCsvUrl(sheetId: string, gid: string) {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

async function fetchRows(sheetId: string, gid: string, airportCode?: string, driverType?: "INTERNAL"|"EXTERNAL") {
  const fetched = await fetchSheetCsv(
    sheetCsvUrl(sheetId, gid),
    { airportCode, driverType, isStaff: sheetId === STAFF_SHEET_ID }
  );
  return { rows: parseCSV(fetched.csv), url: sheetCsvUrl(sheetId, gid) };
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient();

  // Create sync_log entry
  const { data: logRow, error: logErr } = await (supabase as any)
    .from("sync_logs")
    .insert({ triggered_by: "manual", status: "running" })
    .select()
    .single();

  if (logErr) {
    return NextResponse.json({ success: false, error: logErr.message }, { status: 500 });
  }

  const logId = logRow.id;
  const details: any[] = [];
  let totalImported = 0, totalSkipped = 0, totalFailed = 0;

  try {
    // ── Staff sync ──────────────────────────────────────────────────────────
    try {
      const { rows } = await fetchRows(STAFF_SHEET_ID, STAFF_GID);
      // Group by airport from ID CABANG column
      const byAirport: Record<string, any[]> = {};
      for (const row of rows) {
        const cab = (row["ID CABANG"] ?? row["ID Cabang"] ?? "").trim().toLowerCase();
        const codeMap: Record<string, string> = {
          "id rifim airport batam":      "BTH001",
          "id rifim airport jambi":      "DJB001",
          "id rifim airport pekanbaru":  "PKU001",
          "id rifim airport balikpapan": "BPN001",
          "id rifim airport manado":     "MDC001",
        };
        const airportCode = codeMap[cab];
        if (!airportCode) continue;
        if (!byAirport[airportCode]) byAirport[airportCode] = [];
        byAirport[airportCode].push(row);
      }

      for (const [code, codeRows] of Object.entries(byAirport)) {
        const airportId = await resolveAirportId(supabase, code);
        if (!airportId) continue;
        const result = await importStaff(supabase, codeRows, airportId, { fixedAirport: true });
        // Tag with source
        await (supabase as any).from("staff")
          .update({ source_sheet_url: sheetCsvUrl(STAFF_SHEET_ID, STAFF_GID), source_gid: STAFF_GID })
          .eq("airport_id", airportId);

        details.push({ type: "staff", airport: code, imported: result.imported, skipped: result.skipped, failed: result.failed });
        totalImported += result.imported;
        totalSkipped  += result.skipped;
        totalFailed   += result.failed;
      }
    } catch (e: any) {
      details.push({ type: "staff", error: e.message });
      totalFailed++;
    }

    // ── Driver Internal sync ─────────────────────────────────────────────────
    for (const job of DRIVER_INT_JOBS) {
      try {
        const { rows, url } = await fetchRows(DRIVER_INT_SHEET, job.gid, job.code, "INTERNAL");
        const airportId = await resolveAirportId(supabase, job.code);
        if (!airportId) { details.push({ type: "driver_internal", airport: job.code, error: "airport not found" }); continue; }
        const result = await importDrivers(supabase, rows, airportId, "INTERNAL");
        await (supabase as any).from("drivers")
          .update({ source_sheet_url: url, source_gid: job.gid })
          .eq("airport_id", airportId).eq("driver_type", "INTERNAL");

        details.push({ type: "driver_internal", airport: job.code, imported: result.imported, skipped: result.skipped, failed: result.failed });
        totalImported += result.imported;
        totalSkipped  += result.skipped;
        totalFailed   += result.failed;
      } catch (e: any) {
        details.push({ type: "driver_internal", airport: job.code, error: e.message });
        totalFailed++;
      }
    }

    // ── Driver External sync ─────────────────────────────────────────────────
    for (const job of DRIVER_EXT_JOBS) {
      try {
        const { rows, url } = await fetchRows(DRIVER_EXT_SHEET, job.gid, job.code, "EXTERNAL");
        const airportId = await resolveAirportId(supabase, job.code);
        if (!airportId) { details.push({ type: "driver_external", airport: job.code, error: "airport not found" }); continue; }
        const result = await importDrivers(supabase, rows, airportId, "EXTERNAL");
        await (supabase as any).from("drivers")
          .update({ source_sheet_url: url, source_gid: job.gid })
          .eq("airport_id", airportId).eq("driver_type", "EXTERNAL");

        details.push({ type: "driver_external", airport: job.code, imported: result.imported, skipped: result.skipped, failed: result.failed });
        totalImported += result.imported;
        totalSkipped  += result.skipped;
        totalFailed   += result.failed;
      } catch (e: any) {
        details.push({ type: "driver_external", airport: job.code, error: e.message });
        totalFailed++;
      }
    }

    const status = totalFailed === 0 ? "success" : totalImported > 0 ? "partial" : "failed";

    await (supabase as any).from("sync_logs").update({
      status, finished_at: new Date().toISOString(),
      total_processed: totalImported + totalSkipped + totalFailed,
      total_imported: totalImported, total_skipped: totalSkipped, total_failed: totalFailed,
      details,
    }).eq("id", logId);

    return NextResponse.json({ success: true, log_id: logId, status, total_imported: totalImported, total_skipped: totalSkipped, total_failed: totalFailed, details });

  } catch (err: any) {
    await (supabase as any).from("sync_logs").update({
      status: "failed", finished_at: new Date().toISOString(),
      error_message: err.message, details,
    }).eq("id", logId);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
