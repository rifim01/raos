import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { parseCSV, fetchSheetCsv } from "@/lib/import/csv";
import { resolveAirportId } from "@/lib/import/airports";
import { importStaff, groupStaffRowsByAirport } from "@/lib/import/staff";
import { importDrivers } from "@/lib/import/drivers";
import { importLog } from "@/lib/import/logger";
import type { ImportResult } from "@/lib/import/types";

function errorResponse(
  status: number,
  message: string,
  extra?: Record<string, unknown>
) {
  importLog("error", message, extra);
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

function mergeResults(results: ImportResult[]): ImportResult {
  return results.reduce(
    (acc, r) => ({
      success: acc.success && r.success,
      imported: acc.imported + r.imported,
      skipped: acc.skipped + r.skipped,
      failed: acc.failed + r.failed,
      errors: [...acc.errors, ...r.errors],
      headers: acc.headers ?? r.headers,
    }),
    { success: true, imported: 0, skipped: 0, failed: 0, errors: [] as ImportResult["errors"] }
  );
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      url?: string;
      airport_code?: string;
      data_type?: string;
      driver_type?: string;
    };

    try {
      body = await req.json();
    } catch {
      return errorResponse(400, "Request body harus JSON valid");
    }

    const { url, airport_code, data_type, driver_type = "INTERNAL" } = body;

    if (!url?.trim()) {
      return errorResponse(400, "URL Google Sheets wajib diisi");
    }
    if (!data_type || !["driver", "staff"].includes(data_type)) {
      return errorResponse(400, "data_type harus 'driver' atau 'staff'");
    }

    let csvText: string;
    try {
      const fetched = await fetchSheetCsv(url.trim());
      csvText = fetched.csv;
      importLog("info", "sheet fetched", { csvUrl: fetched.csvUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal fetch Google Sheets";
      return errorResponse(400, message);
    }

    const rows = parseCSV(csvText);
    if (!rows.length) {
      return errorResponse(400, "Sheet kosong atau format tidak dikenali");
    }

    const supabase = createServiceClient();
    const headers = Object.keys(rows[0]);

    if (data_type === "driver") {
      if (!airport_code?.trim()) {
        return errorResponse(400, "airport_code wajib untuk import driver");
      }

      const airportId = await resolveAirportId(supabase, airport_code);
      if (!airportId) {
        return errorResponse(400, `Airport tidak dikenal: ${airport_code}`);
      }

      const type = driver_type === "EXTERNAL" ? "EXTERNAL" : "INTERNAL";
      const result = await importDrivers(supabase, rows, airportId, type);

      if (!result.success) {
        const primaryError = result.errors[0]?.message ?? "Import driver gagal";
        return NextResponse.json(
          {
            ...result,
            success: false,
            error: primaryError,
            rows_fetched: rows.length,
            headers,
          },
          { status: result.imported > 0 ? 207 : 500 }
        );
      }

      return NextResponse.json({
        ...result,
        rows_fetched: rows.length,
        headers,
      });
    }

    // Staff import
    if (airport_code?.trim()) {
      const airportId = await resolveAirportId(supabase, airport_code);
      if (!airportId) {
        return errorResponse(400, `Airport tidak dikenal: ${airport_code}`);
      }

      const result = await importStaff(supabase, rows, airportId, { fixedAirport: true });

      if (!result.success) {
        const primaryError = result.errors[0]?.message ?? "Import staff gagal";
        return NextResponse.json(
          {
            ...result,
            success: false,
            error: primaryError,
            rows_fetched: rows.length,
            headers,
          },
          { status: result.imported > 0 ? 207 : 500 }
        );
      }

      return NextResponse.json({
        ...result,
        rows_fetched: rows.length,
        headers,
      });
    }

    // Multi-airport staff: group by airport column
    const byAirport = groupStaffRowsByAirport(rows);
    const results: ImportResult[] = [];

    for (const [code, codeRows] of Object.entries(byAirport)) {
      const airportId = await resolveAirportId(supabase, code);
      if (!airportId) {
        importLog("warn", "skip airport group — unknown code", { code, rows: codeRows.length });
        results.push({
          success: false,
          imported: 0,
          skipped: codeRows.length,
          failed: 0,
          errors: [{ message: `Airport tidak dikenal: ${code}` }],
        });
        continue;
      }

      const result = await importStaff(supabase, codeRows, airportId, { fixedAirport: true });
      results.push(result);
    }

    const merged = mergeResults(results);

    if (!merged.success && merged.imported === 0) {
      return NextResponse.json(
        {
          ...merged,
          success: false,
          error: merged.errors[0]?.message ?? "Import staff gagal untuk semua bandara",
          rows_fetched: rows.length,
          headers,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...merged,
      success: merged.imported > 0,
      rows_fetched: rows.length,
      headers,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    importLog("error", "from-sheets unhandled error", { message, stack: err instanceof Error ? err.stack : undefined });
    return errorResponse(500, message);
  }
}
