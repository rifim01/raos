import type { SheetRow } from "./types";
import { resolveSheetGidForAirport } from "./sheets";

export interface FetchSheetCsvOptions {
  /** Used to resolve tab GID when URL omits gid (driver internal/external sheets) */
  airportCode?: string;
  driverType?: "INTERNAL" | "EXTERNAL";
}

export function parseCSV(text: string): SheetRow[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else inQuotes = !inQuotes;
      } else if (line[i] === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += line[i];
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  return lines
    .slice(1)
    .map((line) => {
      const cells = parseRow(line);
      const row: SheetRow = {};
      headers.forEach((h, i) => {
        if (h) row[h] = cells[i] ?? "";
      });
      return row;
    })
    .filter((row) => Object.values(row).some((v) => v));
}

/**
 * Parse spreadsheet ID and tab GID from a Google Sheets URL.
 * Supports ?gid=, &gid=, and #gid= forms. Falls back to airport mapping when gid is missing.
 */
export function extractSheetInfo(
  url: string,
  options?: FetchSheetCsvOptions
): { sheetId: string; gid: string; gidSource: "url" | "airport" | "default" } | null {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;

    const sheetId = match[1];
    const gidMatch = url.match(/(?:[#&?])gid=(\d+)/);
    let gid = gidMatch?.[1] ?? null;
    let gidSource: "url" | "airport" | "default" = gid ? "url" : "default";

    if ((!gid || gid === "0") && options?.airportCode) {
      const mapped = resolveSheetGidForAirport(
        sheetId,
        options.airportCode,
        options.driverType ?? "INTERNAL"
      );
      if (mapped) {
        gid = mapped;
        gidSource = "airport";
      }
    }

    return { sheetId, gid: gid ?? "0", gidSource };
  } catch {
    return null;
  }
}

export function buildSheetCsvExportUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}

export async function fetchSheetCsv(
  url: string,
  options?: FetchSheetCsvOptions
): Promise<{ csv: string; csvUrl: string; sheetId: string; gid: string; gidSource: string }> {
  const info = extractSheetInfo(url, options);
  if (!info) throw new Error("URL Google Sheets tidak valid");

  const csvUrl = buildSheetCsvExportUrl(info.sheetId, info.gid);
  const csvRes = await fetch(csvUrl, {
    headers: { "User-Agent": "RAOS-Import/1.0" },
  });

  if (!csvRes.ok) {
    throw new Error(
      `Gagal fetch sheet (${csvRes.status}). Pastikan sheet diset "Anyone with link can view".`
    );
  }

  return {
    csv: await csvRes.text(),
    csvUrl,
    sheetId: info.sheetId,
    gid: info.gid,
    gidSource: info.gidSource,
  };
}
