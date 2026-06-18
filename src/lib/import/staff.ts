// src/lib/import/staff.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import { findCol, isValidEmail, parseCurrency, resolveAirportCode, toTitleCase } from "./mapper";
import { importLog } from "./logger";
import { fetchSheetRows } from "./csv";
import type { ImportError, ImportResult, SheetRow } from "./types";

const STAFF_COL = {
  // Menambahkan Email sebagai fallback mutlak jika ID Staff tidak disediakan di Sheet
  staff_code: ["ID Staff", "ID STAFF", "Kode Staff", "KODE", "staff_code", "Staff Code", "Email", "EMAIL", "email"],
  nama: ["Nama", "NAMA", "Nama Staff", "full_name", "NAMA STAFF"],
  email: ["Email", "EMAIL", "email"],
  jabatan: ["Jabatan", "JABATAN", "Posisi", "POSISI"],
  department: ["Department", "DEPARTMENT", "Dept", "DEPT"],
  gaji_pokok: ["Gaji Staff", "GAJI STAFF", "Gaji Pokok", "GAJI POKOK", "salary_base"],
  deposit: ["Deposit", "DEPOSIT"],
  bpjs: ["BPJS", "Bpjs Nominal", "BPJS Nominal"],
  kuota: ["Kuota", "KUOTA", "Kuota Nominal"],
  airport: ["ID Cabang", "ID CABANG", "Cabang", "CABANG", "Bandara", "BANDARA"],
};

function detectStaffColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(STAFF_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof STAFF_COL, string | null>;
}

/**
 * Fungsi Otomatis Sinkronisasi Berbasis Kode Bandara
 */
export async function syncStaffAirport(supabase: SupabaseClient, airportCode: string): Promise<void> {
  const normalizedCode = airportCode.trim().toUpperCase();
  try {
    const allRows = await fetchSheetRows(normalizedCode, { isStaff: true });
    const airportId = await resolveAirportId(supabase, normalizedCode);
    if (!airportId) throw new Error(`Airport ID tidak ditemukan di database.`);

    const headers = allRows.length ? Object.keys(allRows[0]) : [];
    const colMap = detectStaffColumns(headers);
    
    if (!colMap.airport) throw new Error("Kolom identitas cabang tidak ditemukan di file Excel.");

    // Filter baris data agar hanya memproses staff milik cabang aktif saat ini
    const filteredRows = allRows.filter((row: any) => {
      const rawBranch = row[colMap.airport!] || "";
      const resolvedCode = resolveAirportCode(rawBranch) || "";
      return resolvedCode.trim().toUpperCase() === normalizedCode;
    });

    await importStaff(supabase, filteredRows, airportId, { fixedAirport: true });
  } catch (err: any) {
    console.error(`Gagal melakukan sinkronisasi otomatis staff: ${err.message}`);
  }
}

/**
 * Fungsi Impor Inti (Mendukung 4 Argumen Penuh untuk Mencegah Error Kompilasi Vercel)
 */
export async function importStaff(
  supabase: SupabaseClient,
  rows: SheetRow[],
  airportId: string,
  options?: { fixedAirport?: boolean }
): Promise<ImportResult> {
  const fixedAirport = options?.fixedAirport ?? true;
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const colMap = detectStaffColumns(headers);

  if (!colMap.staff_code || !colMap.nama) {
    return {
      success: false,
      imported: 0,
      skipped: rows.length,
      failed: 0,
      errors: [{ message: "Kolom wajib tidak ditemukan (ID Staff/Email & Nama)" }],
      headers,
    };
  }

  // Ambil data aktif dari database untuk mendeteksi penghapusan data
  const { data: existingStaff } = await supabase
    .from("staff")
    .select("staff_code")
    .eq("airport_id", airportId)
    .eq("is_active", true);

  const existingCodesMap = new Set(existingStaff?.map(s => s.staff_code) || []);
  const processedRowsMap = new Map<string, Record<string, any>>();
  let duplicateRemovedCount = 0;

  for (const row of rows) {
    const staffCode = row[colMap.staff_code!]?.trim();
    const nama = row[colMap.nama!]?.trim();
    if (!staffCode || !nama) continue;

    let targetAirportId = airportId;
    if (!fixedAirport && colMap.airport) {
      const rawAirport = row[colMap.airport];
      const code = resolveAirportCode(rawAirport);
      if (code) {
        const resolved = await resolveAirportId(supabase, code);
        if (resolved) targetAirportId = resolved;
      }
    }

    const record: Record<string, any> = {
      airport_id: targetAirportId,
      staff_code: staffCode,
      nama: toTitleCase(nama),
      jabatan: colMap.jabatan ? row[colMap.jabatan]?.trim() || "Staff" : "Staff",
      gaji_pokok: colMap.gaji_pokok ? parseCurrency(row[colMap.gaji_pokok]) : 0,
      status: "ACTIVE",
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (colMap.email) {
      const email = row[colMap.email]?.trim();
      if (email && isValidEmail(email)) record.email = email;
    }
    if (colMap.department && row[colMap.department]?.trim()) {
      record.department = row[colMap.department].trim();
    }

    if (processedRowsMap.has(staffCode)) {
      duplicateRemovedCount++;
    }
    processedRowsMap.set(staffCode, record);
  }

  const finalRecords = Array.from(processedRowsMap.values());
  
  if (finalRecords.length > 0) {
    const { error: upsertErr } = await supabase
      .from("staff")
      .upsert(finalRecords, { onConflict: "airport_id,staff_code" });
    if (upsertErr) throw upsertErr;
  }

  // Soft-deactivate data yang ada di database tapi sudah dihapus dari sheet filter cabang ini
  const sheetCodes = new Set(processedRowsMap.keys());
  const toDeactivate = Array.from(existingCodesMap).filter(code => !sheetCodes.has(code));

  if (toDeactivate.length > 0) {
    await supabase
      .from("staff")
      .update({ status: "INACTIVE", is_active: false })
      .eq("airport_id", airportId)
      .in("staff_code", toDeactivate);
  }

  return {
    success: true,
    imported: finalRecords.length,
    skipped: duplicateRemovedCount,
    failed: 0,
    errors: [],
    headers,
  };
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
