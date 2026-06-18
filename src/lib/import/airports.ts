import type { SupabaseClient } from "@supabase/supabase-js";
import { AIRPORT_FALLBACK, resolveAirportCode } from "./mapper";
import { importLog } from "./logger";

let cachedAirportMap: Record<string, string> | null = null;

export async function loadAirportMap(
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  if (cachedAirportMap) return cachedAirportMap;

  const { data, error } = await supabase.from("airports").select("id, code");
  if (error) {
    importLog("warn", "Failed to load airports from DB, using fallback map", {
      error: error.message,
    });
    cachedAirportMap = { ...AIRPORT_FALLBACK };
    return cachedAirportMap;
  }

  const map: Record<string, string> = { ...AIRPORT_FALLBACK };
  for (const row of data ?? []) {
    if (row.code && row.id) map[row.code.toUpperCase()] = row.id;
  }
  cachedAirportMap = map;
  return map;
}

export async function resolveAirportId(
  supabase: SupabaseClient,
  rawCode: string
): Promise<string | null> {
  const code = resolveAirportCode(rawCode);
  if (!code) return null;
  const map = await loadAirportMap(supabase);
  return map[code] ?? null;
}

export function airportCodeFromRow(row: Record<string, string>): string {
  const candidates = [
    "Bandara",
    "Airport",
    "Kode Bandara",
    "airport_code",
    "ID Cabang",
    "ID CABANG",
    "Cabang",
    "CABANG",
  ];
  for (const key of candidates) {
    if (row[key]?.trim()) return row[key].trim();
  }
  for (const [key, val] of Object.entries(row)) {
    if (/bandara|airport|cabang/i.test(key) && val?.trim()) return val.trim();
  }
  return "BTH001";
}
