// Migration: Google Sheets "DATABASE DRIVER AIRPORT" + "DATABASE DRIVER EXTERNAL" → Supabase drivers
// Run: npx tsx scripts/migrate-drivers.ts
//
// Internal sheet ID: 1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc
// Set SHEET_ID_DRIVER_INTERNAL in .env.local (see scripts/constants/google-sheets.ts for GID map)

import { getSheetRows, listSheetNames } from './utils/google.js'
import { DRIVER_INTERNAL_SHEET_ID } from './constants/google-sheets.js'
import { supabase, getAirportMap, upsertBatch } from './utils/supabase.js'
import { Logger, saveReport, printBanner } from './utils/logger.js'
import { resolveAirportCode } from './utils/mapper.js'
import { requireFields, toTitleCase, sanitizePhone } from './utils/validator.js'

const SPREADSHEET_INTERNAL = process.env.SHEET_ID_DRIVER_INTERNAL ?? process.env.SHEET_ID_DRIVER ?? process.env.SHEET_ID_MASTER!
const SPREADSHEET_EXTERNAL = process.env.SHEET_ID_DRIVER_EXTERNAL ?? process.env.SHEET_ID_DRIVER ?? process.env.SHEET_ID_MASTER!

// Kandidat nama kolom
const COL = {
  driver_code: ['ID Driver', 'ID DRIVER', 'Kode Driver', 'KODE', 'No', 'NO', 'Nomor', 'No.'],
  nama:        ['Nama Driver', 'NAMA DRIVER', 'Nama', 'NAMA', 'Nama Lengkap', 'NAMA LENGKAP'],
  airport:     ['Cabang', 'CABANG', 'ID Cabang', 'Bandara', 'BANDARA', 'ID CABANG'],
  nomor_hp:    ['Nomor HP', 'HP', 'No HP', 'Telepon', 'Phone', 'No. HP', 'No Telp', 'Telp'],
  nik:         ['NIK', 'Nik', 'No KTP', 'KTP'],
}

function findCol(headers: string[], candidates: string[]): string | null {
  return candidates.find(c => headers.includes(c)) ?? null
}

async function processSheet(
  spreadsheetId: string,
  sheetName: string,
  driverType: 'INTERNAL' | 'EXTERNAL',
  airportMap: Record<string, string>,
  log: Logger
): Promise<Record<string, unknown>[]> {
  log.info(`Membaca sheet "${sheetName}"...`)

  let sheetData
  try {
    sheetData = await getSheetRows(spreadsheetId, sheetName)
  } catch (e) {
    log.warn(`Sheet "${sheetName}" tidak ditemukan atau tidak bisa dibaca — skip`)
    return []
  }

  const { headers, rows, rawCount } = sheetData
  log.info(`  ${rawCount} baris ditemukan`)

  const colMap = Object.fromEntries(
    Object.entries(COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof COL, string | null>

  // Jika kolom airport tidak ada, coba resolve dari nama tab (mis. "ID Rifim Batam")
  const tabAirportCode = !colMap.airport ? resolveAirportCode(sheetName) : null

  if (!colMap.driver_code || !colMap.nama || (!colMap.airport && !tabAirportCode)) {
    log.warn(`  Kolom wajib tidak ditemukan di "${sheetName}" dan nama tab tidak dikenali — skip`)
    return []
  }

  const result: Record<string, unknown>[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    if (!requireFields(row, [colMap.driver_code!, colMap.nama!, colMap.airport!], rowNum, log)) continue

    const airportCode = colMap.airport
      ? resolveAirportCode(row[colMap.airport])
      : tabAirportCode
    if (!airportCode) {
      log.warn(`Baris ${rowNum}: airport tidak dikenal — "${colMap.airport ? row[colMap.airport!] : sheetName}"`)
      continue
    }

    const airportId = airportMap[airportCode]
    if (!airportId) {
      log.warn(`Baris ${rowNum}: airport "${airportCode}" tidak ada di database`)
      continue
    }

    const driverRow: Record<string, unknown> = {
      driver_code: row[colMap.driver_code!].trim(),
      nama:        toTitleCase(row[colMap.nama!]),
      airport_id:  airportId,
      driver_type: driverType,
      status:      'ACTIVE',
    }

    if (colMap.nomor_hp && row[colMap.nomor_hp]) {
      driverRow.nomor_hp = sanitizePhone(row[colMap.nomor_hp])
    }
    if (colMap.nik && row[colMap.nik]) {
      driverRow.nik = row[colMap.nik].trim()
    }

    result.push(driverRow)
  }

  log.info(`  ${result.length} valid dari sheet "${sheetName}"`)
  return result
}

async function main() {
  printBanner('Drivers')
  const log = new Logger('migrate-drivers')

  if (!SPREADSHEET_INTERNAL) {
    log.error('SHEET_ID_DRIVER_INTERNAL atau SHEET_ID_MASTER tidak diset di .env.local')
    log.error(`Contoh: SHEET_ID_DRIVER_INTERNAL=${DRIVER_INTERNAL_SHEET_ID}`)
    process.exit(1)
  }

  const airportMap = await getAirportMap()

  // Baca semua tab dari file internal (satu tab per bandara)
  const internalSheets = await listSheetNames(SPREADSHEET_INTERNAL)
  log.info(`Driver Internal: ${internalSheets.length} tab → ${internalSheets.join(', ')}`)
  const internalRowsPerTab = await Promise.all(
    internalSheets.map(name => processSheet(SPREADSHEET_INTERNAL, name, 'INTERNAL', airportMap, log))
  )
  const internalRows = internalRowsPerTab.flat()

  // Baca semua tab dari file external
  const externalSheets = SPREADSHEET_EXTERNAL !== SPREADSHEET_INTERNAL
    ? await listSheetNames(SPREADSHEET_EXTERNAL)
    : []
  log.info(`Driver External: ${externalSheets.length} tab → ${externalSheets.join(', ')}`)
  const externalRowsPerTab = await Promise.all(
    externalSheets.map(name => processSheet(SPREADSHEET_EXTERNAL, name, 'EXTERNAL', airportMap, log))
  )
  const externalRows = externalRowsPerTab.flat()

  const allRows = [...internalRows, ...externalRows]

  // Deduplicate by airport_id:driver_code
  const seen = new Set<string>()
  const dedupedRows = allRows.filter(r => {
    const key = `${r.airport_id}:${r.driver_code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (dedupedRows.length < allRows.length) {
    log.warn(`${allRows.length - dedupedRows.length} duplikat dihapus`)
  }

  log.info(`Total upsert: ${dedupedRows.length} driver`)
  const { inserted, failed } = await upsertBatch('drivers', dedupedRows, 'airport_id,driver_code')

  log.summary(dedupedRows.length, inserted)

  const { count } = await supabase.from('drivers').select('*', { count: 'exact', head: true })
  saveReport({
    table: 'drivers',
    sheet_name: `Driver Internal (${internalSheets.length} tab) + External (${externalSheets.length} tab)`,
    sheets_count: internalRows.length + externalRows.length,
    supabase_count: count ?? 0,
    inserted,
    failed,
    timestamp: new Date().toISOString(),
  })
}

main().catch(err => { console.error(err); process.exit(1) })
