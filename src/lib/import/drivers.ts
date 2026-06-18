// src/lib/import/drivers.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import { findCol, resolveAirportCode, sanitizePhone, toTitleCase } from "./mapper";
import { importLog } from "./logger";
import { fetchSheetRows } from "./csv";
import type { ImportError, ImportResult, SheetRow } from "./types";

const DRIVER_COL = {
  driver_code: ["ID Driver", "ID DRIVER", "Kode Driver", "KODE", "driver_code", "Driver Code", "driver_id", "No", "Nomor"],
  nama: ["Nama Driver", "NAMA DRIVER", "Nama", "NAMA", "Nama Lengkap", "Full Name"],
  airport: ["Cabang", "CABANG", "ID Cabang", "Bandara", "BANDARA", "Airport"],
  nomor_hp: ["Nomor HP", "HP", "No HP", "Telepon", "Phone", "phone"],
  nik: ["NIK", "Nik", "No KTP", "KTP"],
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
  importLog("info", `Memulai sinkronisasi Driver untuk Bandara: ${normalizedCode}`);

  try {
    // Langkah 1: Ambil data dari Google Sheet & Resolusi ID Bandara Database
    const rows = await fetchSheetRows(normalizedCode);
    const airportId = await resolveAirportId(supabase, normalizedCode);
    if (!airportId) throw new Error(`Airport ID tidak ditemukan di database untuk kode: ${normalizedCode}`);

    const headers = rows.length ? Object.keys(rows[0]) : [];
    const colMap = detectDriverColumns(headers);

    if (!colMap.driver_code || !colMap.nama) {
      throw new Error("Struktur kolom Google Sheet tidak valid. Kolom 'ID Driver' dan 'Nama' wajib ada.");
    }

    // Langkah 2: Ambil seluruh data driver aktif saat ini dari Supabase
    const { data: existingDrivers, error: fetchErr } = await supabase
      .from("drivers")
      .select("driver_code, id, is_active")
      .eq("airport_id", airportId)
      .eq("is_active", true);

    if (fetchErr) throw fetchErr;
    const existingCodesMap = new Map(existingDrivers?.map(d => [d.driver_code, d.id]) || []);

    // Langkah 3 & 4: Parsing Data & Proses Proteksi Duplikasi Otomatis dari Google Sheet
    const processedRowsMap = new Map<string, Record<string, any>>();
    let duplicateRemovedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const driverCode = row[colMap.driver_code!]?.trim();
      const nama = row[colMap.nama!]?.trim();

      if (!driverCode || !nama) {
        failedCount++;
        continue;
      }

      const record: Record<string, any> = {
        airport_id: airportId,
        driver_code: driverCode,
        nama: toTitleCase(nama),
        driver_type: driverType,
        status: "ACTIVE",
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (colMap.nomor_hp && row[colMap.nomor_hp]?.trim()) {
        record.nomor_hp = sanitizePhone(row[colMap.nomor_hp]);
      }
      if (colMap.nik && row[colMap.nik]?.trim()) {
        record.nik = row[colMap.nik].trim();
      }

      if (processedRowsMap.has(driverCode)) {
        duplicateRemovedCount++;
      }
      // Overwrite dengan baris terbaru untuk mempertahankan data terakhir jika ada duplikasi di sheet
      processedRowsMap.set(driverCode, record);
    }

    const finalSheetRecords = Array.from(processedRowsMap.values());
    
    // Langkah 5: Hitung Metrik Inserted vs Updated sebelum Upsert dilakukan
    let insertedCount = 0;
    let updatedCount = 0;

    finalSheetRecords.forEach(rec => {
      if (existingCodesMap.has(rec.driver_code)) {
        updatedCount++;
      } else {
        insertedCount++;
      }
    });

    // Eksekusi Upsert ke Supabase
    if (finalSheetRecords.length > 0) {
      const { error: upsertErr } = await supabase
        .from("drivers")
        .upsert(finalSheetRecords, { onConflict: "airport_id,driver_code" });
      if (upsertErr) throw upsertErr;
    }

    // Langkah 6: Soft-Deactivate data lama yang ada di Supabase tapi hilang dari Google Sheet
    const sheetCodesSet = new Set(processedRowsMap.keys());
    const codesToDeactivate = Array.from(existingCodesMap.keys()).filter(code => !sheetCodesSet.has(code));

    if (codesToDeactivate.length > 0) {
      const { error: deactErr } = await supabase
        .from("drivers")
        .update({ status: "INACTIVE", is_active: false, updated_at: new Date().toISOString() })
        .eq("airport_id", airportId)
        .in("driver_code", codesToDeactivate);
      
      if (deactErr) throw deactErr;
    }

    // Tampilkan Validasi Sinkronisasi Real-time sesuai permintaan format sistem
    console.log(`\n===================================`);
    console.log(`${normalizedCode} (DRIVERS)`);
    console.log(`Sheet Driver       : ${rows.length}`);
    console.log(`Supabase Active    : ${existingDrivers?.length || 0}`);
    console.log(`Inserted           : ${insertedCount}`);
    console.log(`Updated            : ${updatedCount}`);
    console.log(`Deactivated        : ${codesToDeactivate.length}`);
    console.log(`Duplicate Removed  : ${duplicateRemovedCount}`);
    console.log(`Failed             : ${failedCount}`);
    console.log(`Status             : SUCCESS`);
    console.log(`===================================\n`);

  } catch (err: any) {
    importLog("error", `Gagal melakukan sinkronisasi driver pada bandara ${airportCode}`, { error: err.message });
    console.log(`${normalizedCode} (DRIVERS) -> Status: FAILED (${err.message})`);
  }
}
