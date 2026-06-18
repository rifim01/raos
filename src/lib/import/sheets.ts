/** Google Sheets — driver internal (DATABASE DRIVER AIRPORT) */
export const DRIVER_INTERNAL_SHEET_ID = "1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc";

/** Tab GID per bandara — sheet driver internal */
export const DRIVER_INTERNAL_GID_BY_AIRPORT: Record<string, string> = {
  BTH001: "198439898",
  DJB001: "180760202",
  UPG001: "2145251861",
  BPN001: "717116103",
  MDC001: "1905281204",
  PKU001: "466122581",
};

/** Google Sheets — driver external */
export const DRIVER_EXTERNAL_SHEET_ID = "1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc";

export const DRIVER_EXTERNAL_GID_BY_AIRPORT: Record<string, string> = {
  BTH001: "1698812948",
  DJB001: "674113852",
};

/** Google Sheets — master staff */
export const STAFF_SHEET_ID = "1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw";
export const STAFF_SHEET_GID = "1974631595";

export type PresetSheetType = "staff" | "driver" | "driver_external";

export interface PresetSheet {
  label: string;
  url: string;
  type: PresetSheetType;
  airport: string;
}

export function buildSheetEditUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/edit?gid=${gid}`;
}

export function resolveDriverInternalGid(airportCode: string): string | null {
  return DRIVER_INTERNAL_GID_BY_AIRPORT[airportCode.trim().toUpperCase()] ?? null;
}

export function resolveDriverExternalGid(airportCode: string): string | null {
  return DRIVER_EXTERNAL_GID_BY_AIRPORT[airportCode.trim().toUpperCase()] ?? null;
}

export function resolveSheetGidForAirport(
  sheetId: string,
  airportCode: string,
  driverType: "INTERNAL" | "EXTERNAL" = "INTERNAL"
): string | null {
  const code = airportCode.trim().toUpperCase();
  if (sheetId === DRIVER_INTERNAL_SHEET_ID && driverType === "INTERNAL") {
    return resolveDriverInternalGid(code);
  }
  if (sheetId === DRIVER_EXTERNAL_SHEET_ID && driverType === "EXTERNAL") {
    return resolveDriverExternalGid(code);
  }
  return null;
}

/** Canonical preset list — single source of truth for UI + sync */
export const PRESET_SHEETS: PresetSheet[] = [
  {
    label: "Master Data Staff",
    url: buildSheetEditUrl(STAFF_SHEET_ID, STAFF_SHEET_GID),
    type: "staff",
    airport: "",
  },
  {
    label: "Driver Batam",
    url: buildSheetEditUrl(DRIVER_INTERNAL_SHEET_ID, DRIVER_INTERNAL_GID_BY_AIRPORT.BTH001),
    type: "driver",
    airport: "BTH001",
  },
  {
    label: "Driver Jambi",
    url: buildSheetEditUrl(DRIVER_INTERNAL_SHEET_ID, DRIVER_INTERNAL_GID_BY_AIRPORT.DJB001),
    type: "driver",
    airport: "DJB001",
  },
  {
    label: "Driver Makassar",
    url: buildSheetEditUrl(DRIVER_INTERNAL_SHEET_ID, DRIVER_INTERNAL_GID_BY_AIRPORT.UPG001),
    type: "driver",
    airport: "UPG001",
  },
  {
    label: "Driver Balikpapan",
    url: buildSheetEditUrl(DRIVER_INTERNAL_SHEET_ID, DRIVER_INTERNAL_GID_BY_AIRPORT.BPN001),
    type: "driver",
    airport: "BPN001",
  },
  {
    label: "Driver Manado",
    url: buildSheetEditUrl(DRIVER_INTERNAL_SHEET_ID, DRIVER_INTERNAL_GID_BY_AIRPORT.MDC001),
    type: "driver",
    airport: "MDC001",
  },
  {
    label: "Driver Pekanbaru",
    url: buildSheetEditUrl(DRIVER_INTERNAL_SHEET_ID, DRIVER_INTERNAL_GID_BY_AIRPORT.PKU001),
    type: "driver",
    airport: "PKU001",
  },
  {
    label: "Driver Ext. Batam",
    url: buildSheetEditUrl(DRIVER_EXTERNAL_SHEET_ID, DRIVER_EXTERNAL_GID_BY_AIRPORT.BTH001),
    type: "driver_external",
    airport: "BTH001",
  },
  {
    label: "Driver Ext. Jambi",
    url: buildSheetEditUrl(DRIVER_EXTERNAL_SHEET_ID, DRIVER_EXTERNAL_GID_BY_AIRPORT.DJB001),
    type: "driver_external",
    airport: "DJB001",
  },
];
