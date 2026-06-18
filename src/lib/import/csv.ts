// src/lib/import/csv.ts

export const GOOGLE_SHEET_ID = "1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc";

export const AIRPORT_GID_MAPPING: Record<string, string> = {
  BTH001: "198439898",
  DJB001: "180760202",
  UPG001: "2145251861",
  BPN001: "717116103",
  MDC001: "1905281204",
  PKU001: "466122581",
};

/**
 * Membangun URL ekspor CSV Google Sheet berdasarkan kode bandara yang valid
 */
export function buildGoogleSheetCsvUrl(airportCode: string): string {
  const normalizedCode = airportCode.trim().toUpperCase();
  const gid = AIRPORT_GID_MAPPING[normalizedCode];
  
  if (!gid) {
    throw new Error(`Gagal membangun URL: Mapping GID tidak ditemukan untuk kode bandara "${airportCode}"`);
  }
  
  return `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/export?format=csv&gid=${gid}`;
}

/**
 * Helper untuk mengambil file CSV dan mengubahnya menjadi objek baris data (SheetRow)
 */
export async function fetchSheetRows(airportCode: string): Promise<any[]> {
  const url = buildGoogleSheetCsvUrl(airportCode);
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Gagal mengunduh CSV dari Google Sheet [HTTP ${response.status}]: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  return parseCsv(csvText);
}

function parseCsv(text: string): any[] {
  // Parsing CSV standar / internal engine PapaParse Anda
  // Memastikan baris kosong diabaikan otomatis
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const data = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
    return Object.fromEntries(headers.map((header, index) => [header, data[index] || ""]));
  });
}
