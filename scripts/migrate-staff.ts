// Migration: Google Sheets "MASTER DATA STAFF" → Supabase staff
// Run: npx tsx scripts/migrate-staff.ts

import { getSheetRows } from './utils/google.js'
import { supabase, getAirportMap, upsertBatch } from './utils/supabase.js'
import { Logger, saveReport, printBanner } from './utils/logger.js'
import { resolveAirportCode, parseCurrency } from './utils/mapper.js'
import { requireFields, toTitleCase, isValidEmail } from './utils/validator.js'

const SPREADSHEET_ID = process.env.SHEET_ID_STAFF ?? process.env.SHEET_ID_MASTER!
const SHEET_NAME     = process.env.SHEET_NAME_STAFF ?? 'MASTER DATA STAFF'

// Kandidat nama kolom (auto-detect dari header sheet)
const COL = {
  staff_code:  ['ID Staff', 'ID STAFF', 'Kode Staff', 'KODE'],
  nama:        ['Nama', 'NAMA', 'Nama Staff', 'NAMA STAFF'],
  email:       ['Email', 'EMAIL'],
  jabatan:     ['Jabatan', 'JABATAN', 'Posisi', 'POSISI'],
  gaji_pokok:  ['Gaji Staff', 'GAJI STAFF', 'Gaji Pokok', 'GAJI POKOK'],
  deposit:     ['Deposit', 'DEPOSIT'],
  bpjs:        ['BPJS', 'Bpjs Nominal', 'BPJS Nominal'],
  kuota:       ['Kuota', 'KUOTA', 'Kuota Nominal'],
  airport:     ['ID Cabang', 'ID CABANG', 'Cabang', 'CABANG', 'Bandara', 'BANDARA'],
}

function findCol(headers: string[], candidates: string[]): string | null {
  return candidates.find(c => headers.includes(c)) ?? null
}

async function main() {
  printBanner('Staff')
  const log = new Logger('migrate-staff')

  if (!SPREADSHEET_ID) {
    log.error('SHEET_ID_STAFF atau SHEET_ID_MASTER tidak diset di .env.local')
    process.exit(1)
  }

  log.info(`Sheet: "${SHEET_NAME}" — ${SPREADSHEET_ID}`)
  const { headers, rows, rawCount } = await getSheetRows(SPREADSHEET_ID, SHEET_NAME)
  log.info(`Ditemukan ${rawCount} baris data`)

  const airportMap = await getAirportMap()

  // Auto-detect column positions
  const colMap = Object.fromEntries(
    Object.entries(COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof COL, string | null>

  log.info('Column mapping: ' + JSON.stringify(colMap, null, 2))

  if (!colMap.staff_code || !colMap.nama || !colMap.airport) {
    log.error('Kolom wajib tidak ditemukan (staff_code / nama / airport). Cek header sheet.')
    process.exit(1)
  }

  const staffRows: Record<string, unknown>[] = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    if (!requireFields(row, [colMap.staff_code!, colMap.nama!, colMap.airport!], rowNum, log)) {
      skipped++
      continue
    }

    const rawAirport  = row[colMap.airport!]
    const airportCode = resolveAirportCode(rawAirport)
    if (!airportCode) {
      log.warn(`Baris ${rowNum}: airport tidak dikenal — "${rawAirport}"`)
      skipped++
      continue
    }

    const airportId = airportMap[airportCode]
    if (!airportId) {
      log.warn(`Baris ${rowNum}: airport "${airportCode}" tidak ada di database`)
      skipped++
      continue
    }

    const email = colMap.email ? row[colMap.email] : ''
    const staffRow: Record<string, unknown> = {
      staff_code:    row[colMap.staff_code!].trim(),
      nama:          toTitleCase(row[colMap.nama!]),
      jabatan:       colMap.jabatan ? (row[colMap.jabatan] || 'Staff') : 'Staff',
      airport_id:    airportId,
      gaji_pokok:    colMap.gaji_pokok  ? parseCurrency(row[colMap.gaji_pokok])  : 0,
      deposit:       colMap.deposit     ? parseCurrency(row[colMap.deposit])     : 0,
      bpjs_nominal:  colMap.bpjs        ? parseCurrency(row[colMap.bpjs])        : 0,
      kuota_nominal: colMap.kuota       ? parseCurrency(row[colMap.kuota])       : 0,
      status: 'ACTIVE',
    }

    if (email && isValidEmail(email)) staffRow.email = email

    staffRows.push(staffRow)
  }

  // Deduplicate by airport_id:staff_code (last row wins)
  const deduped = new Map<string, Record<string, unknown>>()
  for (const r of staffRows) deduped.set(`${r.airport_id}:${r.staff_code}`, r)
  const dedupedRows = [...deduped.values()]
  if (dedupedRows.length < staffRows.length)
    log.warn(`${staffRows.length - dedupedRows.length} duplikat dihapus dari sheet`)

  log.info(`Siap upsert: ${dedupedRows.length} baris — skip: ${skipped}`)
  const { inserted, failed } = await upsertBatch('staff', dedupedRows, 'airport_id,staff_code')

  log.summary(rows.length, inserted)

  const { count } = await supabase.from('staff').select('*', { count: 'exact', head: true })
  saveReport({
    table: 'staff',
    sheet_name: SHEET_NAME,
    sheets_count: rawCount,
    supabase_count: count ?? 0,
    inserted,
    failed,
    timestamp: new Date().toISOString(),
  })
}

main().catch(err => { console.error(err); process.exit(1) })
