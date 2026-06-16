// Migration: Google Sheets "JADWAL KERJA" → Supabase staff_schedule
// Run: npx tsx scripts/migrate-schedule.ts

import { getSheetRows } from './utils/google.js'
import { supabase, getAirportMap, getStaffCodeMap } from './utils/supabase.js'
import { Logger, saveReport, printBanner } from './utils/logger.js'
import { normalizeDate, normalizeShift } from './utils/mapper.js'
import { requireFields } from './utils/validator.js'

const SPREADSHEET_ID = process.env.SHEET_ID_SCHEDULE ?? process.env.SHEET_ID_MASTER!
const SHEET_NAME     = process.env.SHEET_NAME_SCHEDULE ?? 'JADWAL KERJA'

const COL = {
  staff_code: ['ID Staff', 'Kode Staff', 'Staff Code', 'ID STAFF'],
  tanggal:    ['Tanggal', 'TANGGAL', 'Date', 'Tgl'],
  shift:      ['Shift', 'SHIFT', 'Jenis Shift'],
  jam_masuk:  ['Jam Masuk', 'JAM MASUK', 'Time In', 'Start'],
  jam_keluar: ['Jam Keluar', 'JAM KELUAR', 'Time Out', 'End'],
  airport:    ['ID Cabang', 'Cabang', 'CABANG', 'Bandara'],
  notes:      ['Notes', 'Catatan', 'Keterangan'],
}

function findCol(headers: string[], candidates: string[]): string | null {
  return candidates.find(c => headers.includes(c)) ?? null
}

function normalizeTime(raw: string): string | null {
  if (!raw) return null
  // Formats: "07:00", "07:00:00", "7:00 AM"
  const m = /^(\d{1,2}):(\d{2})/.exec(raw.trim())
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}:00`
  return null
}

async function main() {
  printBanner('Staff Schedule')
  const log = new Logger('migrate-schedule')

  if (!SPREADSHEET_ID) {
    log.error('SHEET_ID_SCHEDULE atau SHEET_ID_MASTER tidak diset di .env.local')
    process.exit(1)
  }

  log.info(`Sheet: "${SHEET_NAME}" — ${SPREADSHEET_ID}`)
  const { headers, rows, rawCount } = await getSheetRows(SPREADSHEET_ID, SHEET_NAME)
  log.info(`Ditemukan ${rawCount} baris data`)

  const [airportMap, staffCodeMap] = await Promise.all([getAirportMap(), getStaffCodeMap()])

  const colMap = Object.fromEntries(
    Object.entries(COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof COL, string | null>

  if (!colMap.staff_code || !colMap.tanggal || !colMap.shift) {
    log.error('Kolom wajib tidak ditemukan (staff_code / tanggal / shift)')
    process.exit(1)
  }

  // Determine airport resolution: either from sheet column or from env
  const useAirportCol = !!colMap.airport
  const defaultAirportCode = process.env.DEFAULT_AIRPORT_CODE ?? null

  const scheduleRows: Record<string, unknown>[] = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    if (!requireFields(row, [colMap.staff_code!, colMap.tanggal!, colMap.shift!], rowNum, log)) {
      skipped++
      continue
    }

    // Resolve airport
    let airportId: string | null = null
    if (useAirportCol) {
      const code = row[colMap.airport!]
      const resolved = airportMap[code] ?? airportMap[code + '001']
      if (!resolved) {
        log.warn(`Baris ${rowNum}: airport tidak ditemukan — "${code}"`)
        skipped++
        continue
      }
      airportId = resolved
    } else if (defaultAirportCode) {
      airportId = airportMap[defaultAirportCode] ?? null
    }

    if (!airportId) {
      log.warn(`Baris ${rowNum}: airport tidak bisa ditentukan — set DEFAULT_AIRPORT_CODE di .env.local`)
      skipped++
      continue
    }

    // Resolve staff
    const staffCode = row[colMap.staff_code!].trim()
    const staffId   = staffCodeMap.get(`${airportId}:${staffCode}`)
    if (!staffId) {
      log.warn(`Baris ${rowNum}: staff "${staffCode}" tidak ditemukan di airport tersebut`)
      skipped++
      continue
    }

    // Parse date
    const tanggal = normalizeDate(row[colMap.tanggal!])
    if (!tanggal || tanggal.length !== 10) {
      log.warn(`Baris ${rowNum}: tanggal tidak valid — "${row[colMap.tanggal!]}"`)
      skipped++
      continue
    }

    // Shift
    const shift = normalizeShift(row[colMap.shift!])
    if (!shift) {
      log.warn(`Baris ${rowNum}: shift tidak dikenal — "${row[colMap.shift!]}"`)
      skipped++
      continue
    }

    scheduleRows.push({
      staff_id:   staffId,
      tanggal,
      shift,
      jam_masuk:  colMap.jam_masuk  ? normalizeTime(row[colMap.jam_masuk])  : null,
      jam_keluar: colMap.jam_keluar ? normalizeTime(row[colMap.jam_keluar]) : null,
      notes:      colMap.notes      ? (row[colMap.notes] || null) : null,
    })
  }

  log.info(`Siap upsert: ${scheduleRows.length} — skip: ${skipped}`)

  let inserted = 0, failed = 0
  const batchSize = 100

  for (let i = 0; i < scheduleRows.length; i += batchSize) {
    const batch = scheduleRows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('staff_schedule')
      .upsert(batch, { onConflict: 'staff_id,tanggal', ignoreDuplicates: false })

    if (error) {
      log.error(`Batch [${i}..${i + batch.length}] gagal`, error)
      failed += batch.length
    } else {
      inserted += batch.length
      log.info(`Batch [${i}..${i + batch.length}] ✓`)
    }
  }

  log.summary(scheduleRows.length, inserted)

  const { count } = await supabase.from('staff_schedule').select('*', { count: 'exact', head: true })
  saveReport({
    table: 'staff_schedule',
    sheet_name: SHEET_NAME,
    sheets_count: rawCount,
    supabase_count: count ?? 0,
    inserted,
    failed,
    timestamp: new Date().toISOString(),
  })
}

main().catch(err => { console.error(err); process.exit(1) })
