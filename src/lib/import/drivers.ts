import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import { findCol, resolveAirportCode, sanitizePhone, toTitleCase } from "./mapper";
import { importLog } from "./logger";
import { fetchSheetRows } from "./csv";
import type { ImportError, ImportResult, SheetRow } from "./types";

const DRIVER_COL = {
  driver_code: ["ID Driver", "ID DRIVER", "Kode Driver", "KODE", "driver_code", "Driver Code", "driver_id", "No"],
  nama: ["Nama Driver", "NAMA DRIVER", "Nama", "NAMA", "Nama Lengkap"],
  airport: ["Cabang", "CABANG", "Bandara", "Airport"],
  nomor_hp: ["Nomor HP", "HP", "No HP", "Phone"],
  nik: ["NIK", "Nik", "No KTP"],
};

function detectDriverColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(DRIVER_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof DRIVER_COL, string | null>;
}

// FUNGSI UTAMA: Digunakan oleh sistem sinkronisasi otomatis terbaru
export async function syncDriverAirport(
  supabase: SupabaseClient,
  airportCode: string,
  driverType: "INTERNAL" | "EXTERNAL" = "INTERNAL"
): Promise<void> {
  const normalizedCode = airportCode.trim().toUpperCase();
  const rows = await fetchSheetRows(normalizedCode);
  const airportId = await resolveAirportId(supabase, normalizedCode);
  if (!airportId) throw new Error(`Airport ID tidak ditemukan untuk kode: ${normalizedCode}`);
  
  await importDrivers(supabase, rows, airportId, driverType);
}

// FUNGSI LAMA (DIPERTAHANKAN): Menghindari Error Broken-Export pada Vercel Build
export async function importDrivers(
  supabase: SupabaseClient,
  rows: SheetRow[],
  airportId: string,
  driverType: "INTERNAL" | "EXTERNAL" = "INTERNAL"
): Promise<ImportResult> {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const colMap = detectDriverColumns(headers);

  if (!colMap.driver_code || !colMap.nama) {
    return { success: false, imported: 0, skipped: rows.length, failed: 0, errors: [{ message: "Kolom wajib hilang" }], headers };
  }

  // Ambil Driver Aktif di database saat ini
  const { data: existing } = await supabase.from("drivers").select("driver_code").eq("airport_id", airportId).eq("is_active", true);
  const existingCodes = new Set(existing?.map(d => d.driver_code) || []);

  const processedMap = new Map<string, Record<string, any>>();
  let duplicateRemoved = 0;

  for (const row of rows) {
    const code = row[colMap.driver_code!]?.trim();
    const nama = row[colMap.nama!]?.trim();
    if (!code || !nama) continue;

    const record = {
      airport_id: airportId,
      driver_code: code,
      nama: toTitleCase(nama),
      driver_type: driverType,
      status: "ACTIVE",
      is_active: true,
    };
    if (processedMap.has(code)) duplicateRemoved++;
    processedMap.set(code, record);
  }

  const finalRecords = Array.from(processedMap.values());
  if (finalRecords.length > 0) {
    await supabase.from("drivers").upsert(finalRecords, { onConflict: "airport_id,driver_code" });
  }

  // Soft-deactivate data yang hilang dari Google Sheet
  const sheetCodes = new Set(processedMap.keys());
  const toDeactivate = Array.from(existingCodes).filter(c => !sheetCodes.has(c));
  if (toDeactivate.length > 0) {
    await supabase.from("drivers").update({ status: "INACTIVE", is_active: false }).eq("airport_id", airportId).in("driver_code", toDeactivate);
  }

  return { success: true, imported: finalRecords.length, skipped: duplicateRemoved, failed: 0, errors: [], headers };
}
