// src/lib/import/csv.ts

export const GOOGLE_SHEET_ID = "1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc"; // Default Internal Driver File

/**
 * Resolusi dinamis untuk menentukan Sheet ID dan GID yang tepat
 */
export function resolveSheetDetails(
  airportCode: string,
  options?: { isStaff?: boolean; driverType?: string }
) {
  const code = airportCode.trim().toUpperCase();

  // 1. KONDISI: DATABASE STAFF (Single Master File)
  if (options?.isStaff) {
    return {
      sheetId: "1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw",
      gid: "1974631595",
    };
  }

  // 2. KONDISI: DATABASE DRIVER EXTERNAL
  if (options?.driverType === "EXTERNAL") {
    const externalGids: Record<string, string> = {
      BTH001: "1698812948",
      DJB001: "674113852",
    };
    return {
      sheetId: "1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc",
      gid: externalGids[code] || "0",
    };
  }

  // 3. KONDISI: DATABASE DRIVER INTERNAL (Default)
  const internalGids: Record<string, string> = {
    BTH001: "198439898",
    DJB001: "180760202",
    UPG001: "2145251861",
    BPN001: "717116103",
    MDC001: "1905281204",
    PKU001: "466122581",
  };

  return {
    sheetId: GOOGLE_SHEET_ID,
    gid: internalGids[code] || "0",
  };
}

export function buildGoogleSheetCsvUrl(
  airportCode: string,
  options?: { isStaff?: boolean; driverType?: string }
): string {
  const { sheetId, gid } = resolveSheetDetails(airportCode, options);
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map((line) => {
    const data = line.split(",").map((v) => v.replace(/^"|"$/g, "").trim());
    return Object.fromEntries(headers.map((header, index) => [header, data[index] || ""]));
  });
}

export { parseCSV as parseCsv };

/**
 * Core Fetcher: Mengembalikan Hybrid Object ber-tipe 'any' 
 * Menghilangkan error TypeScript pada route.ts tanpa merusak fungsionalitas array
 */
export async function fetchSheetCsv(
  input: string,
  options?: { airportCode?: string; driverType?: string; isStaff?: boolean }
): Promise<any> {
  let url = input;
  let targetCode = options?.airportCode || (!input.includes("http") ? input : "BTH001");
  const { sheetId } = resolveSheetDetails(targetCode, options);

  // Jika dipanggil secara programmatic dengan kode bandara, susun URL otomatis
  if (targetCode && (options?.isStaff || options?.driverType || !input.includes("http"))) {
    url = buildGoogleSheetCsvUrl(targetCode, options);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Gagal unduh sheet [HTTP ${response.status}]: ${response.statusText}`);
  }

  const csvText = await response.text();
  const rows = parseCSV(csvText);

  // INI KUNCINYA: Bentuk hybrid array-object agar route.ts lama tetap membaca properti meta
  const hybridResult = rows as any;
  hybridResult.csv = csvText;
  hybridResult.csvUrl = url;
  hybridResult.sheetId = sheetId;

  return hybridResult;
}

export { fetchSheetCsv as fetchSheetRows };
