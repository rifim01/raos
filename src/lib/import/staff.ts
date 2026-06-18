// src/lib/import/staff.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import { findCol, isValidEmail, parseCurrency, toTitleCase } from "./mapper";
import { importLog } from "./logger";
import { fetchSheetRows } from "./csv";
import type { ImportError, SheetRow } from "./types";

const STAFF_COL = {
  staff_code: ["ID Staff", "ID STAFF", "Kode Staff", "KODE", "staff_code", "Staff Code", "staff_id"],
  nama: ["Nama", "NAMA", "Nama Staff", "NAMA STAFF", "full_name"],
  email: ["Email", "EMAIL"],
  jabatan: ["Jabatan", "JABATAN", "Posisi", "POSISI", "position"],
  department: ["Department", "DEPARTMENT", "Dept", "DEPT"],
  gaji_pokok: ["Gaji Staff", "Gaji Pokok", "GAJI POKOK", "salary_base"],
  deposit: ["Deposit", "DEPOSIT"],
  bpjs: ["BPJS", "Bpjs Nominal", "BPJS Nominal"],
  kuota: ["Kuota", "KUOTA", "Kuota Nominal"],
};

function detectStaffColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(STAFF_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof STAFF_COL, string | null>;
}

export async function syncStaffAirport(
  supabase: SupabaseClient,
  airportCode: string
): Promise<void> {
  const normalizedCode = airportCode.trim().toUpperCase();
  importLog("info", `Memulai sinkronisasi Staff untuk Bandara: ${normalizedCode}`);

  try {
    const rows = await fetchSheetRows(normalizedCode);
    const airportId = await resolveAirportId(supabase, normalizedCode);
    if (!airportId) throw new Error(`Airport ID tidak ditemukan untuk kode: ${normalizedCode}`);

    const headers = rows.length ? Object.keys(rows[0]) : [];
    const colMap = detectStaffColumns(headers);

    if (!colMap.staff_code || !colMap.nama) {
      throw new Error("Header wajib tidak ditemukan. Pastikan ada 'ID Staff' dan 'Nama'.");
    }

    // Ambil data aktif dari database
    const { data: existingStaff, error: fetchErr } = await supabase
      .from("staff")
      .select("staff_code, id")
      .eq("airport_id", airportId)
      .eq("is_active", true);

    if (fetchErr) throw fetchErr;
    const existingCodesMap = new Map(existingStaff?.map(s => [s.staff_code, s.id]) || []);

    const processedRowsMap = new Map<string, Record<string, any>>();
    let duplicateRemovedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const staffCode = row[colMap.staff_code!]?.trim();
      const nama = row[colMap.nama!]?.trim();

      if (!staffCode || !nama) {
        failedCount++;
        continue;
      }

      const record: Record<string, any> = {
        airport_id: airportId,
        staff_code: staffCode,
        nama: toTitleCase(nama),
        jabatan: colMap.jabatan ? row[colMap.jabatan]?.trim() || "Staff" : "Staff",
        gaji_pokok: colMap.gaji_pokok ? parseCurrency(row[colMap.gaji_pokok]) : 0,
        deposit: colMap.deposit ? parseCurrency(row[colMap.deposit]) : 0,
        bpjs_nominal: colMap.bpjs ? parseCurrency(row[colMap.bpjs]) : 0,
        kuota_nominal: colMap.kuota ? parseCurrency(row[colMap.kuota]) : 0,
        status: "ACTIVE",
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (colMap.department && row[colMap.department]?.trim()) {
        record.department = row[colMap.department].trim();
      }
      if (colMap.email) {
        const email = row[colMap.email]?.trim();
        if (email && isValidEmail(email)) record.email = email;
      }

      if (processedRowsMap.has(staffCode)) {
        duplicateRemovedCount++;
      }
      processedRowsMap.set(staffCode, record);
    }

    const finalSheetRecords = Array.from(processedRowsMap.values());
    let insertedCount = 0;
    let updatedCount = 0;

    finalSheetRecords.forEach(rec => {
      if (existingCodesMap.has(rec.staff_code)) {
        updatedCount++;
      } else {
        insertedCount++;
      }
    });

    if (finalSheetRecords.length > 0) {
      const { error: upsertErr } = await supabase
        .from("staff")
        .upsert(finalSheetRecords, { onConflict: "airport_id,staff_code" });
      if (upsertErr) throw upsertErr;
    }

    // Soft deactivation data yang hilang dari Sheet
    const sheetCodesSet = new Set(processedRowsMap.keys());
    const codesToDeactivate = Array.from(existingCodesMap.keys()).filter(code => !sheetCodesSet.has(code));

    if (codesToDeactivate.length > 0) {
      const { error: deactErr } = await supabase
        .from("staff")
        .update({ status: "INACTIVE", is_active: false, updated_at: new Date().toISOString() })
        .eq("airport_id", airportId)
        .in("staff_code", codesToDeactivate);
      
      if (deactErr) throw deactErr;
    }

    console.log(`\n===================================`);
    console.log(`${normalizedCode} (STAFF)`);
    console.log(`Sheet Staff        : ${rows.length}`);
    console.log(`Supabase Active    : ${existingStaff?.length || 0}`);
    console.log(`Inserted           : ${insertedCount}`);
    console.log(`Updated            : ${updatedCount}`);
    console.log(`Deactivated        : ${codesToDeactivate.length}`);
    console.log(`Duplicate Removed  : ${duplicateRemovedCount}`);
    console.log(`Failed             : ${failedCount}`);
    console.log(`Status             : SUCCESS`);
    console.log(`===================================\n`);

  } catch (err: any) {
    importLog("error", `Gagal sinkronisasi staff pada bandara ${airportCode}`, { error: err.message });
    console.log(`${normalizedCode} (STAFF) -> Status: FAILED (${err.message})`);
  }
}
