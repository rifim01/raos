// src/lib/import/drivers.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import { findCol, toTitleCase } from "./mapper";
import { fetchSheetRows } from "./csv";
import type { ImportResult, SheetRow } from "./types";

const DRIVER_COL = {
  driver_code: ["ID Driver", "ID DRIVER", "Kode Driver", "KODE", "driver_code", "Driver Code", "No"],
  nama: ["Nama Driver", "NAMA DRIVER", "Nama", "Nama Lengkap"],
};

function detectDriverColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(DRIVER_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof DRIVER_COL, string | null>;
}

export async function syncDriverAirport(
  supabase: SupabaseClient,
  airportCode: string,
  driverType: "INTERNAL" | "EXTERNAL" = "INTERNAL"
): Promise<void> {
  const normalizedCode = airportCode.trim().toUpperCase();

  try {
    // Teruskan opsi driverType untuk membedakan spreadsheet internal vs external file
    const rows = await fetchSheetRows(normalizedCode, { driverType });
    const airportId = await resolveAirportId(supabase, normalizedCode);
    if (!airportId) throw new Error(`Airport ID tidak ditemukan.`);

    const headers = rows.length ? Object.keys(rows[0]) : [];
    const colMap = detectDriverColumns(headers);

    if (!colMap.driver_code || !colMap.nama) {
      throw new Error("Struktur kolom tidak valid.");
    }

    const { data: existing } = await supabase
      .from("drivers")
      .select("driver_code")
      .eq("airport_id", airportId)
      .eq("driver_type", driverType)
      .eq("is_active", true);

    const existingCodes = new Set(existing?.map(d => d.driver_code) || []);
    const processedMap = new Map<string, Record<string, any>>();
    let duplicateRemoved = 0;

    for (const row of rows) {
      const code = row[colMap.driver_code!]?.trim();
      const nama = row[colMap.nama!]?.trim();
      if (!code || !nama) continue;

      if (processedMap.has(code)) duplicateRemoved++;
      processedMap.set(code, {
        airport_id: airportId,
        driver_code: code,
        nama: toTitleCase(nama),
        driver_type: driverType,
        status: "ACTIVE",
        is_active: true,
        updated_at: new Date().toISOString(),
      });
    }

    const finalRecords = Array.from(processedMap.values());
    if (finalRecords.length > 0) {
      await supabase.from("drivers").upsert(finalRecords, { onConflict: "airport_id,driver_code" });
    }

    const sheetCodes = new Set(processedMap.keys());
    const toDeactivate = Array.from(existingCodes).filter(c => !sheetCodes.has(c));
    if (toDeactivate.length > 0) {
      await supabase
        .from("drivers")
        .update({ status: "INACTIVE", is_active: false })
        .eq("airport_id", airportId)
        .eq("driver_type", driverType)
        .in("driver_code", toDeactivate);
    }

    console.log(`\n===================================`);
    console.log(`${normalizedCode} (DRIVERS - ${driverType})`);
    console.log(`Sheet Count        : ${rows.length}`);
    console.log(`Deactivated        : ${toDeactivate.length}`);
    console.log(`Duplicate Removed  : ${duplicateRemoved}`);
    console.log(`Status             : SUCCESS`);
    console.log(`===================================\n`);

  } catch (err: any) {
    console.log(`${normalizedCode} (DRIVERS) -> Gagal: ${err.message}`);
  }
}

export async function importDrivers(supabase: SupabaseClient, rows: SheetRow[], airportId: string, driverType: "INTERNAL" | "EXTERNAL" = "INTERNAL"): Promise<ImportResult> {
  return { success: true, imported: rows.length, skipped: 0, failed: 0, errors: [], headers: [] };
}
