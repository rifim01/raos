import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import {
  findCol,
  resolveAirportCode,
  sanitizePhone,
  toTitleCase,
} from "./mapper";
import { importLog } from "./logger";
import { upsertBatch } from "./upsert";
import type { ImportError, ImportResult, SheetRow } from "./types";

const DRIVER_COL = {
  driver_code: [
    "ID Driver",
    "ID DRIVER",
    "Kode Driver",
    "KODE",
    "driver_code",
    "Driver Code",
    "driver_id",
    "DRIVER_ID",
    "Driver ID",
    "No",
    "NO",
    "Nomor",
    "No.",
  ],
  nama: [
    "Nama Driver",
    "NAMA DRIVER",
    "Nama",
    "NAMA",
    "Nama Lengkap",
    "NAMA LENGKAP",
    "full_name",
    "Full Name",
  ],
  airport: ["Cabang", "CABANG", "ID Cabang", "Bandara", "BANDARA", "ID CABANG", "Airport"],
  nomor_hp: ["Nomor HP", "HP", "No HP", "Telepon", "Phone", "No. HP", "No Telp", "Telp", "phone"],
  nik: ["NIK", "Nik", "No KTP", "KTP"],
};

function detectDriverColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(DRIVER_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof DRIVER_COL, string | null>;
}

export async function importDrivers(
  supabase: SupabaseClient,
  rows: SheetRow[],
  airportId: string,
  driverType: "INTERNAL" | "EXTERNAL" = "INTERNAL"
): Promise<ImportResult> {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const colMap = detectDriverColumns(headers);

  importLog("info", "driver import column mapping", {
    colMap,
    rowCount: rows.length,
    driverType,
    airportId,
  });

  if (!colMap.driver_code || !colMap.nama) {
    const msg =
      "Kolom wajib tidak ditemukan. Butuh header seperti 'ID Driver' / 'Kode Driver' dan 'Nama'.";
    importLog("error", msg, { headers });
    return {
      success: false,
      imported: 0,
      skipped: rows.length,
      failed: 0,
      errors: [{ message: msg }],
      headers,
    };
  }

  const mapped: Record<string, unknown>[] = [];
  const errors: ImportError[] = [];
  let skipped = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const driverCode = row[colMap.driver_code!]?.trim();
    const nama = row[colMap.nama!]?.trim();

    if (!driverCode || !nama) {
      skipped++;
      errors.push({
        row: i + 2,
        message: "driver_code atau nama kosong",
        code: driverCode || undefined,
      });
      continue;
    }

    let targetAirportId = airportId;
    if (colMap.airport && row[colMap.airport]?.trim()) {
      const code = resolveAirportCode(row[colMap.airport]);
      if (!code) {
        skipped++;
        errors.push({
          row: i + 2,
          message: `Bandara tidak dikenal: "${row[colMap.airport]}"`,
          code: driverCode,
        });
        continue;
      }
      const resolved = await resolveAirportId(supabase, code);
      if (!resolved) {
        skipped++;
        errors.push({
          row: i + 2,
          message: `Airport ID tidak ditemukan untuk: ${code}`,
          code: driverCode,
        });
        continue;
      }
      targetAirportId = resolved;
    }

    const record: Record<string, unknown> = {
      driver_code: driverCode,
      nama: toTitleCase(nama),
      airport_id: targetAirportId,
      driver_type: driverType,
      status: "ACTIVE",
    };

    if (colMap.nomor_hp && row[colMap.nomor_hp]?.trim()) {
      record.nomor_hp = sanitizePhone(row[colMap.nomor_hp]);
    }
    if (colMap.nik && row[colMap.nik]?.trim()) {
      record.nik = row[colMap.nik].trim();
    }

    mapped.push(record);
  }

  const deduped = new Map<string, Record<string, unknown>>();
  for (const r of mapped) {
    deduped.set(`${r.airport_id}:${r.driver_code}`, r);
  }
  const dedupedRows = [...deduped.values()];

  importLog("info", "drivers ready for upsert", {
    total: rows.length,
    valid: dedupedRows.length,
    skipped,
  });

  if (!dedupedRows.length) {
    return {
      success: false,
      imported: 0,
      skipped,
      failed: 0,
      errors,
      headers,
    };
  }

  const { inserted, failed, errors: upsertErrors } = await upsertBatch(
    supabase,
    "drivers",
    dedupedRows,
    "airport_id,driver_code"
  );

  const allErrors = [...errors, ...upsertErrors];
  const success = inserted > 0 && failed === 0;

  importLog(success ? "info" : "error", "driver import complete", {
    inserted,
    skipped,
    failed,
    errorCount: allErrors.length,
  });

  return {
    success,
    imported: inserted,
    skipped,
    failed,
    errors: allErrors,
    headers,
  };
}
