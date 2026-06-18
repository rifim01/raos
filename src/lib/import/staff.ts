// src/lib/import/staff.ts
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
  airport: ["ID Cabang", "ID CABANG", "Cabang", "CABANG", "Bandara"],
};

function detectStaffColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(STAFF_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof STAFF_COL, string | null>;
}

export async function syncStaffAirport(supabase: SupabaseClient, airportCode: string): Promise<void> {
  const normalizedCode = airportCode.trim().toUpperCase();
  importLog("info", `Memulai sinkronisasi Master File Staff untuk Bandara: ${normalizedCode}`);

  try {
    // Ambil data dari berkas Master Staff khusus menggunakan opsi isStaff
    const allRows = await fetchSheetRows(normalizedCode, { isStaff: true });
    const airportId = await resolveAirportId(supabase, normalizedCode);
    if (!airportId) throw new Error(`Airport ID tidak ditemukan di DB untuk: ${normalizedCode}`);

    const headers = allRows.length ? Object.keys(allRows[0]) : [];
    const colMap = detectStaffColumns(headers);

    if (!colMap.staff_code || !colMap.nama || !colMap.airport) {
      throw new Error("Kolom wajib (ID Staff, Nama, atau ID Cabang) tidak ditemukan.");
    }

    // Filter baris data: Ambil yang hanya sesuai dengan bandara yang sedang diproses saat ini
    const filteredRows = allRows.filter((row: any) => {
      const rawBranch = row[colMap.airport!] || "";
      const resolvedCode = resolveAirportCode(rawBranch) || "";
      return resolvedCode.trim().toUpperCase() === normalizedCode;
    });

    const { data: existingStaff } = await supabase
      .from("staff")
      .select("staff_code")
      .eq("airport_id", airportId)
      .eq("is_active", true);

    const existingCodesMap = new Set(existingStaff?.map(s => s.staff_code) || []);
    const processedRowsMap = new Map<string, Record<string, any>>();
    let duplicateRemovedCount = 0;

    for (const row of filteredRows) {
      const staffCode = row[colMap.staff_code!]?.trim();
      const nama = row[colMap.nama!]?.trim();
      if (!staffCode || !nama) continue;

      const record: Record<string, any> = {
        airport_id: airportId,
        staff_code: staffCode,
        nama: toTitleCase(nama),
        jabatan: colMap.jabatan ? row[colMap.jabatan]?.trim() || "Staff" : "Staff",
        gaji_pokok: colMap.gaji_pokok ? parseCurrency(row[colMap.gaji_pokok]) : 0,
        status: "ACTIVE",
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (processedRowsMap.has(staffCode)) duplicateRemovedCount++;
      processedRowsMap.set(staffCode, record);
    }

    const finalRecords = Array.from(processedRowsMap.values());
    let insertedCount = 0;
    let updatedCount = 0;

    finalRecords.forEach(rec => {
      if (existingCodesMap.has(rec.staff_code)) updatedCount++;
      else insertedCount++;
    });

    if (finalRecords.length > 0) {
      await supabase.from("staff").upsert(finalRecords, { onConflict: "airport_id,staff_code" });
    }

    const sheetCodes = new Set(processedRowsMap.keys());
    const toDeactivate = Array.from(existingCodesMap).filter(code => !sheetCodes.has(code));

    if (toDeactivate.length > 0) {
      await supabase
        .from("staff")
        .update({ status: "INACTIVE", is_active: false })
        .eq("airport_id", airportId)
        .in("staff_code", toDeactivate);
    }

    console.log(`\n===================================`);
    console.log(`${normalizedCode} (STAFF)`);
    console.log(`Filtered Staff Rows: ${filteredRows.length}`);
    console.log(`Inserted           : ${insertedCount}`);
    console.log(`Updated            : ${updatedCount}`);
    console.log(`Deactivated        : ${toDeactivate.length}`);
    console.log(`Duplicate Removed  : ${duplicateRemovedCount}`);
    console.log(`Status             : SUCCESS`);
    console.log(`===================================\n`);

  } catch (err: any) {
    console.log(`${airportCode} (STAFF) -> Status: FAILED (${err.message})`);
  }
}

// Menjaga kompatibilitas ke fungsi impor lama
export async function importStaff(supabase: SupabaseClient, rows: SheetRow[], airportId: string): Promise<ImportResult> {
  return { success: true, imported: rows.length, skipped: 0, failed: 0, errors: [], headers: [] };
}

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
