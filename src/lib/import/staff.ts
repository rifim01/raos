import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import { findCol, isValidEmail, parseCurrency, resolveAirportCode, toTitleCase } from "./mapper";
import { importLog } from "./logger";
import { fetchSheetRows } from "./csv";
import type { ImportError, ImportResult, SheetRow } from "./types";

const STAFF_COL = {
  staff_code: ["ID Staff", "ID STAFF", "Kode Staff", "KODE", "staff_code", "Staff Code"],
  nama: ["Nama", "NAMA", "Nama Staff", "full_name"],
  email: ["Email", "EMAIL"],
  jabatan: ["Jabatan", "JABATAN", "Posisi"],
  department: ["Department", "Dept"],
  gaji_pokok: ["Gaji Staff", "Gaji Pokok", "salary_base"],
  deposit: ["Deposit", "DEPOSIT"],
  bpjs: ["BPJS", "Bpjs Nominal"],
  kuota: ["Kuota", "Kuota Nominal"],
};

function detectStaffColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(STAFF_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof STAFF_COL, string | null>;
}

export async function syncStaffAirport(supabase: SupabaseClient, airportCode: string): Promise<void> {
  const normalizedCode = airportCode.trim().toUpperCase();
  const rows = await fetchSheetRows(normalizedCode);
  const airportId = await resolveAirportId(supabase, normalizedCode);
  if (!airportId) throw new Error(`Airport ID tidak ditemukan untuk kode: ${normalizedCode}`);
  
  await importStaff(supabase, rows, airportId);
}

// TETAP EXPORT FUNGSI INI AGAR VERCEL BUILD AMAN
export async function importStaff(
  supabase: SupabaseClient,
  rows: SheetRow[],
  airportId: string
): Promise<ImportResult> {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const colMap = detectStaffColumns(headers);

  if (!colMap.staff_code || !colMap.nama) {
    return { success: false, imported: 0, skipped: rows.length, failed: 0, errors: [], headers };
  }

  const { data: existing } = await supabase.from("staff").select("staff_code").eq("airport_id", airportId).eq("is_active", true);
  const existingCodes = new Set(existing?.map(s => s.staff_code) || []);

  const processedMap = new Map<string, Record<string, any>>();
  for (const row of rows) {
    const code = row[colMap.staff_code!]?.trim();
    const nama = row[colMap.nama!]?.trim();
    if (!code || !nama) continue;

    processedMap.set(code, {
      airport_id: airportId,
      staff_code: code,
      nama: toTitleCase(nama),
      jabatan: colMap.jabatan ? row[colMap.jabatan]?.trim() || "Staff" : "Staff",
      gaji_pokok: colMap.gaji_pokok ? parseCurrency(row[colMap.gaji_pokok]) : 0,
      status: "ACTIVE",
      is_active: true,
    });
  }

  const finalRecords = Array.from(processedMap.values());
  if (finalRecords.length > 0) {
    await supabase.from("staff").upsert(finalRecords, { onConflict: "airport_id,staff_code" });
  }

  const sheetCodes = new Set(processedMap.keys());
  const toDeactivate = Array.from(existingCodes).filter(c => !sheetCodes.has(c));
  if (toDeactivate.length > 0) {
    await supabase.from("staff").update({ status: "INACTIVE", is_active: false }).eq("airport_id", airportId).in("staff_code", toDeactivate);
  }

  return { success: true, imported: finalRecords.length, skipped: 0, failed: 0, errors: [], headers };
}

// TETAP EXPORT UTK COMPATIBILITY KODE LAMA
export function groupStaffRowsByAirport(rows: SheetRow[]): Record<string, SheetRow[]> {
  const byAirport: Record<string, SheetRow[]> = {};
  for (const row of rows) {
    const code = (row["Bandara"] || row["Airport"] || "BTH001").toString().trim().toUpperCase();
    const resolved = resolveAirportCode(code) ?? code;
    if (!byAirport[resolved]) byAirport[resolved] = [];
    byAirport[resolved].push(row);
  }
  return byAirport;
}
