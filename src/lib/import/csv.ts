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
 * Membangun URL ekspor CSV Google Sheet berdasarkan kode bandara
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
 * Fungsi parser CSV standar
 */
export function parseCSV(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== "");
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
  return lines.slice(1).map(line => {
    const data = line.split(",").map(v => v.replace(/^"|"$/g, "").trim());
    return Object.fromEntries(headers.map((header, index) => [header, data[index] || ""]));
  });
}

// Menyediakan alias huruf kecil jika diperlukan oleh modul lain
export { parseCSV as parseCsv };

/**
 * Mengambil data dari Google Sheet.
 * Dibuat fleksibel agar mendukung pemanggilan lama (2 argumen dari route.ts) 
 * maupun pemanggilan baru (1 argumen dari staff.ts / drivers.ts).
 */
export async function fetchSheetCsv(
  input: string,
  options?: { airportCode?: string; driverType?: string }
): Promise<any[]> {
  let url = input;

  // Tentukan kode bandara tujuan: prioritas dari objek opsi, atau dari parameter input jika bukan berupa tautan HTTP
  const targetCode = options?.airportCode || (!input.includes("http") ? input : null);

  if (targetCode) {
    // Override URL agar selalu menggunakan Sheet ID & GID resmi yang valid
    url = buildGoogleSheetCsvUrl(targetCode);
  }

  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Gagal mengunduh CSV dari Google Sheet [HTTP ${response.status}]: ${response.statusText}`);
  }
  
  const csvText = await response.text();
  return parseCSV(csvText);
}

/**
 * Menyediakan alias fetchSheetRows agar skrip sinkronisasi internal tetap selaras
 */
export { fetchSheetCsv as fetchSheetRows };
