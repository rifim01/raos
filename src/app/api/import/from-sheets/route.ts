import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function extractSheetInfo(url: string): { sheetId: string; gid: string } | null {
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

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
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
  return lines.slice(1).map(line => {
    const cells = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { if (h) row[h] = cells[i] ?? ""; });
    return row;
  }).filter(row => Object.values(row).some(v => v));
}

const AIRPORT_CODES: Record<string, string> = {
  "BPN001": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "BTH001": "1325804e-8dd5-458e-a782-80a231a09303",
  "DJB001": "2669bd67-290d-4aa1-805f-540951592b2a",
  "MDC001": "0587c176-e85f-4c7b-a2be-0e255e158612",
  "PKU001": "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  "UPG001": "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  "CGK001": "e7c34a55-86d7-4693-a02e-7b4426420ad8",
  "BATAM": "1325804e-8dd5-458e-a782-80a231a09303",
  "JAMBI": "2669bd67-290d-4aa1-805f-540951592b2a",
  "MAKASSAR": "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  "BALIKPAPAN": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "MANADO": "0587c176-e85f-4c7b-a2be-0e255e158612",
  "PEKANBARU": "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
};

export async function POST(req: NextRequest) {
  try {
    const { url, airport_code, data_type, driver_type = "INTERNAL" } = await req.json() as {
      url: string;
      airport_code: string;
      data_type: "driver" | "staff";
      driver_type?: string;
    };

    const info = extractSheetInfo(url);
    if (!info) return NextResponse.json({ error: "URL Google Sheets tidak valid" }, { status: 400 });

    const csvUrl = `https://docs.google.com/spreadsheets/d/${info.sheetId}/export?format=csv&gid=${info.gid}`;

    const csvRes = await fetch(csvUrl, {
      headers: { "User-Agent": "RAOS-Import/1.0" },
    });

    if (!csvRes.ok) {
      return NextResponse.json({
        error: `Gagal fetch sheet (${csvRes.status}). Pastikan sheet diset "Anyone with link can view".`
      }, { status: 400 });
    }

    const csvText = await csvRes.text();
    const rows = parseCSV(csvText);

    if (!rows.length) return NextResponse.json({ error: "Sheet kosong atau format tidak dikenali" }, { status: 400 });

    const airportId = AIRPORT_CODES[airport_code?.toUpperCase()];
    if (!airportId && data_type !== "staff") {
      return NextResponse.json({ error: `Airport tidak dikenal: ${airport_code}` }, { status: 400 });
    }

    const supabase = await createClient();
    let result;

    if (data_type === "driver") {
      const { data, error } = await supabase.rpc("import_drivers", {
        p_rows: rows,
        p_airport_id: airportId,
        p_type: driver_type,
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      result = data;
    } else {
      // Staff bisa multi-bandara, group by airport code dalam data
      if (airportId) {
        const { data, error } = await supabase.rpc("import_staff", {
          p_rows: rows,
          p_airport_id: airportId,
        });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        result = data;
      } else {
        // Auto-detect airport dari kolom data
        const byAirport: Record<string, Record<string, string>[]> = {};
        rows.forEach(row => {
          const code = (row["Bandara"] || row["Airport"] || row["Kode Bandara"] || row["airport_code"] || "BTH001").toUpperCase();
          if (!byAirport[code]) byAirport[code] = [];
          byAirport[code].push(row);
        });

        let totalImported = 0;
        for (const [code, codeRows] of Object.entries(byAirport)) {
          const aid = AIRPORT_CODES[code];
          if (!aid) continue;
          const { data, error } = await supabase.rpc("import_staff", {
            p_rows: codeRows,
            p_airport_id: aid,
          });
          if (!error && data) totalImported += (data as { imported: number }).imported || 0;
        }
        result = { success: true, imported: totalImported };
      }
    }

    return NextResponse.json({ ...result, rows_fetched: rows.length, headers: Object.keys(rows[0]) });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
