import type { SheetRow } from "./types";

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

export function extractSheetInfo(url: string): { sheetId: string; gid: string } | null {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return null;
    const sheetId = match[1];
    const gidMatch = url.match(/[#&?]gid=(\d+)/);
    const gid = gidMatch ? gidMatch[1] : "0";
    return { sheetId, gid };
  } catch {
    return null;
  }
}

export async function fetchSheetCsv(url: string): Promise<{ csv: string; csvUrl: string }> {
  const info = extractSheetInfo(url);
  if (!info) throw new Error("URL Google Sheets tidak valid");

  const csvUrl = `https://docs.google.com/spreadsheets/d/${info.sheetId}/export?format=csv&gid=${info.gid}`;
  const csvRes = await fetch(csvUrl, {
    headers: { "User-Agent": "RAOS-Import/1.0" },
  });

  if (!csvRes.ok) {
    throw new Error(
      `Gagal fetch sheet (${csvRes.status}). Pastikan sheet diset "Anyone with link can view".`
    );
  }

  return { csv: await csvRes.text(), csvUrl };
}
