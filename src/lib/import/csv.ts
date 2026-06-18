// src/lib/import/csv.ts

export const GOOGLE_SHEET_ID = "1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc";

/**
 * Mengotomatisasi pemilihan Sheet ID dan GID berdasarkan kode bandara dan deteksi URL
 */
export function resolveSheetDetails(
  airportCode: string,
  options?: { isStaff?: boolean; driverType?: string }
) {
  const code = airportCode.trim().toUpperCase();

  if (options?.isStaff) {
    return { sheetId: "1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw", gid: "1974631595" };
  }

  if (options?.driverType === "EXTERNAL") {
    const externalGids: Record<string, string> = { BTH001: "1698812948", DJB001: "674113852" };
    return { sheetId: "1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc", gid: externalGids[code] || "0" };
  }

  const internalGids: Record<string, string> = {
    BTH001: "198439898", DJB001: "180760202", UPG001: "2145251861",
    BPN001: "717116103", MDC001: "1905281204", PKU001: "466122581"
  };
  return { sheetId: GOOGLE_SHEET_ID, gid: internalGids[code] || "0" };
}

export function buildGoogleSheetCsvUrl(airportCode: string, options?: { isStaff?: boolean; driverType?: string }): string {
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
 * Smart Fetcher dengan Inteceptor URL Otomatis untuk kompatibilitas API Route Lama
 */
export async function fetchSheetCsv(
  input: string,
  options?: { airportCode?: string; driverType?: string; isStaff?: boolean }
): Promise<any> {
  let url = input.trim();
  
  // DETEKSI OTOMATIS: Intersepsi URL dari frontend jika rute API memanggil tanpa mengirimkan opsi objek
  const isStaffSheet = options?.isStaff || url.includes("1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw");
  const isExternalDriver = options?.driverType === "EXTERNAL" || url.includes("1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc");
  
  const targetCode = options?.airportCode || (!input.includes("http") ? input : "BTH001");
  const normalizedCode = targetCode.trim().toUpperCase();

  // Override URL mentah lama menuju format eksport CSV resmi dengan GID yang akurat
  if (isStaffSheet) {
    url = `https://docs.google.com/spreadsheets/d/1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw/export?format=csv&gid=1974631595`;
  } else if (isExternalDriver) {
    const externalGids: Record<string, string> = { BTH001: "1698812948", DJB001: "674113852" };
    url = `https://docs.google.com/spreadsheets/d/1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc/export?format=csv&gid=${externalGids[normalizedCode] || "0"}`;
  } else {
    const internalGids: Record<string, string> = {
      BTH001: "198439898", DJB001: "180760202", UPG001: "2145251861",
      BPN001: "717116103", MDC001: "1905281204", PKU001: "466122581"
    };
    url = `https://docs.google.com/spreadsheets/d/1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc/export?format=csv&gid=${internalGids[normalizedCode] || "0"}`;
  }

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Gagal unduh sheet [HTTP ${response.status}]`);

  const csvText = await response.text();
  const rows = parseCSV(csvText);

  const hybridResult = rows as any;
  hybridResult.csv = csvText;
  hybridResult.csvUrl = url;
  hybridResult.sheetId = isStaffSheet 
    ? "1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw" 
    : (isExternalDriver ? "1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc" : GOOGLE_SHEET_ID);

  return hybridResult;
}

export { fetchSheetCsv as fetchSheetRows };
