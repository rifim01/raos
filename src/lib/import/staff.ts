import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAirportId } from "./airports";
import {
  findCol,
  isValidEmail,
  parseCurrency,
  resolveAirportCode,
  toTitleCase,
} from "./mapper";
import { importLog } from "./logger";
import { upsertBatch } from "./upsert";
import type { ImportError, ImportResult, SheetRow } from "./types";

const STAFF_COL = {
  staff_code: [
    "ID Staff",
    "ID STAFF",
    "Kode Staff",
    "KODE",
    "staff_code",
    "Staff Code",
    "staff_id",
    "STAFF_ID",
    "Staff ID",
  ],
  nama: ["Nama", "NAMA", "Nama Staff", "NAMA STAFF", "full_name", "Full Name"],
  email: ["Email", "EMAIL"],
  jabatan: ["Jabatan", "JABATAN", "Posisi", "POSISI", "position", "Position"],
  department: ["Department", "DEPARTMENT", "Dept", "DEPT"],
  gaji_pokok: ["Gaji Staff", "GAJI STAFF", "Gaji Pokok", "GAJI POKOK", "salary_base"],
  deposit: ["Deposit", "DEPOSIT"],
  bpjs: ["BPJS", "Bpjs Nominal", "BPJS Nominal", "bpjs_nominal"],
  kuota: ["Kuota", "KUOTA", "Kuota Nominal", "kuota_nominal"],
  airport: ["ID Cabang", "ID CABANG", "Cabang", "CABANG", "Bandara", "BANDARA", "Airport"],
};

function detectStaffColumns(headers: string[]) {
  return Object.fromEntries(
    Object.entries(STAFF_COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof STAFF_COL, string | null>;
}

function mapStaffRow(
  row: SheetRow,
  rowNum: number,
  colMap: Record<keyof typeof STAFF_COL, string | null>,
  airportId: string,
  fixedAirport: boolean
): { record: Record<string, unknown> | null; error?: ImportError } {
  const codeCol = colMap.staff_code;
  const namaCol = colMap.nama;
  if (!codeCol || !namaCol) {
    return {
      record: null,
      error: { row: rowNum, message: "Kolom staff_code / nama tidak ditemukan di header sheet" },
    };
  }

  const staffCode = row[codeCol]?.trim();
  const nama = row[namaCol]?.trim();
  if (!staffCode || !nama) {
    return {
      record: null,
      error: { row: rowNum, message: "staff_code atau nama kosong", code: staffCode || undefined },
    };
  }

  if (!fixedAirport && colMap.airport) {
    const rawAirport = row[colMap.airport];
    const code = resolveAirportCode(rawAirport);
    if (!code) {
      return {
        record: null,
        error: {
          row: rowNum,
          message: `Bandara tidak dikenal: "${rawAirport}"`,
          code: staffCode,
        },
      };
    }
  }

  const record: Record<string, unknown> = {
    staff_code: staffCode,
    nama: toTitleCase(nama),
    jabatan: colMap.jabatan ? row[colMap.jabatan]?.trim() || "Staff" : "Staff",
    airport_id: airportId,
    gaji_pokok: colMap.gaji_pokok ? parseCurrency(row[colMap.gaji_pokok]) : 0,
    deposit: colMap.deposit ? parseCurrency(row[colMap.deposit]) : 0,
    bpjs_nominal: colMap.bpjs ? parseCurrency(row[colMap.bpjs]) : 0,
    kuota_nominal: colMap.kuota ? parseCurrency(row[colMap.kuota]) : 0,
    status: "ACTIVE",
  };

  if (colMap.department && row[colMap.department]?.trim()) {
    record.department = row[colMap.department].trim();
  }

  if (colMap.email) {
    const email = row[colMap.email]?.trim();
    if (email && isValidEmail(email)) record.email = email;
  }

  return { record };
}

export async function importStaff(
  supabase: SupabaseClient,
  rows: SheetRow[],
  airportId: string,
  options?: { fixedAirport?: boolean }
): Promise<ImportResult> {
  const fixedAirport = options?.fixedAirport ?? true;
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const colMap = detectStaffColumns(headers);

  importLog("info", "staff import column mapping", { colMap, rowCount: rows.length });

  if (!colMap.staff_code || !colMap.nama) {
    const msg =
      "Kolom wajib tidak ditemukan. Butuh header seperti 'ID Staff' / 'Kode Staff' dan 'Nama'.";
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
    let targetAirportId = airportId;

    if (!fixedAirport && colMap.airport) {
      const code = resolveAirportCode(row[colMap.airport]);
      if (!code) {
        skipped++;
        errors.push({
          row: i + 2,
          message: `Bandara tidak dikenal: "${row[colMap.airport]}"`,
        });
        continue;
      }
      const resolved = await resolveAirportId(supabase, code);
      if (!resolved) {
        skipped++;
        errors.push({ row: i + 2, message: `Airport ID tidak ditemukan untuk: ${code}` });
        continue;
      }
      targetAirportId = resolved;
    }

    const { record, error } = mapStaffRow(row, i + 2, colMap, targetAirportId, fixedAirport);
    if (error || !record) {
      skipped++;
      if (error) errors.push(error);
      continue;
    }
    record.airport_id = targetAirportId;
    mapped.push(record);
  }

  const deduped = new Map<string, Record<string, unknown>>();
  for (const r of mapped) {
    deduped.set(`${r.airport_id}:${r.staff_code}`, r);
  }
  const dedupedRows = [...deduped.values()];

  importLog("info", "staff ready for upsert", {
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
    "staff",
    dedupedRows,
    "airport_id,staff_code"
  );

  const allErrors = [...errors, ...upsertErrors];
  const success = inserted > 0 && failed === 0;

  importLog(success ? "info" : "error", "staff import complete", {
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

export function groupStaffRowsByAirport(rows: SheetRow[]): Record<string, SheetRow[]> {
  const byAirport: Record<string, SheetRow[]> = {};
  for (const row of rows) {
    const code = (
      row["Bandara"] ||
      row["Airport"] ||
      row["Kode Bandara"] ||
      row["airport_code"] ||
      row["ID Cabang"] ||
      row["Cabang"] ||
      "BTH001"
    )
      .toString()
      .trim()
      .toUpperCase();
    const resolved = resolveAirportCode(code) ?? code;
    if (!byAirport[resolved]) byAirport[resolved] = [];
    byAirport[resolved].push(row);
  }
  return byAirport;
}
