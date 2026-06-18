/**
 * Google Sheets IDs and tab GIDs — shared with scripts/migrate-drivers.ts
 * Driver internal file: 1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc
 */

export const DRIVER_INTERNAL_SHEET_ID = '1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc'

export const DRIVER_INTERNAL_GID_BY_AIRPORT: Record<string, string> = {
  BTH001: '198439898',
  DJB001: '180760202',
  UPG001: '2145251861',
  BPN001: '717116103',
  MDC001: '1905281204',
  PKU001: '466122581',
}

/** Expected tab names per airport (used by migrate-drivers when Cabang column is absent) */
export const DRIVER_INTERNAL_TAB_ALIASES: Record<string, string[]> = {
  BTH001: ['ID Rifim Airport Batam', 'ID Rifim Batam', 'Rifim Batam'],
  DJB001: ['ID Rifim Airport Jambi', 'ID Rifim Jambi', 'ID Rifim Jambi Luar', 'Rifim Jambi'],
  UPG001: ['ID Rifim Airport Makassar', 'ID Rifim Makassar', 'Rifim Makassar'],
  BPN001: ['ID Rifim Airport Balikpapan', 'ID Rifim Balikpapan', 'Rifim Balikpapan'],
  MDC001: ['ID Rifim Airport Manado', 'ID Rifim Manado', 'Rifim Manado'],
  PKU001: ['ID Rifim Airport Pekanbaru', 'ID Rifim Pekanbaru', 'Rifim Pekanbaru'],
}

export const DRIVER_EXTERNAL_SHEET_ID = '1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc'

export const DRIVER_EXTERNAL_GID_BY_AIRPORT: Record<string, string> = {
  BTH001: '1698812948',
  DJB001: '674113852',
}
