// Migration: Google Sheets "ERP ABSENSI" → Supabase attendance
// Run: npx tsx scripts/migrate-attendance.ts

import { getSheetRows } from './utils/google.js'
import { supabase, getAirportMap, getStaffMap } from './utils/supabase.js'
import { Logger, saveReport, printBanner } from './utils/logger.js'
import { resolveAirportCode, normalizeCheckType, parseGPS, normalizeDate } from './utils/mapper.js'
import { requireFields } from './utils/validator.js'

const SPREADSHEET_ID = process.env.SHEET_ID_ATTENDANCE ?? process.env.SHEET_ID_MASTER!
const SHEET_NAME     = process.env.SHEET_NAME_ATTENDANCE ?? 'ERP ABSENSI'

const COL = {
  timestamp:  ['Timestamp', 'timestamp', 'Waktu', 'WAKTU', 'Tanggal Waktu'],
  nama:       ['Nama Staff', 'Nama', 'NAMA', 'NAMA STAFF'],
  bandara:    ['Bandara', 'BANDARA', 'Cabang', 'Airport'],
  tipe_absen: ['Tipe Absen', 'TIPE ABSEN', 'Tipe', 'Check Type', 'Jenis'],
  gps:        ['Koordinat GPS', 'GPS', 'Koordinat', 'Location'],
  foto:       ['Bukti Foto', 'Foto', 'Photo', 'Photo URL'],
  status_jarak: ['Status Jarak', 'Status GPS', 'Distance Status'],
}

function findCol(headers: string[], candidates: string[]): string | null {
  return candidates.find(c => headers.includes(c)) ?? null
}

function parseTimestamp(raw: string): { tanggal: string; ts: string } | null {
  if (!raw) return null

  // normalizeDate handles all formats including "3/6/2026, 01.06.43"
  const normalized = normalizeDate(raw)
  if (normalized) {
    const dateOnly = normalized.split('T')[0]
    const fullTs   = normalized.includes('T') ? normalized : `${normalized}T00:00:00+07:00`
    return { tanggal: dateOnly, ts: fullTs }
  }

  // Fallback: native Date parsing for ISO strings
  const d = new Date(raw)
  if (!isNaN(d.getTime())) {
    return { tanggal: d.toISOString().split('T')[0], ts: d.toISOString() }
  }

  return null
}

function normalizeDistanceStatus(raw: string): 'VALID' | 'INVALID' | 'UNKNOWN' {
  const v = raw.toLowerCase()
  if (v === 'valid' || v.includes('valid') && !v.includes('in')) return 'VALID'
  if (v.includes('invalid') || v.includes('jauh') || v.includes('tidak')) return 'INVALID'
  return 'UNKNOWN'
}

async function main() {
  printBanner('Attendance')
  const log = new Logger('migrate-attendance')

  if (!SPREADSHEET_ID) {
    log.error('SHEET_ID_ATTENDANCE atau SHEET_ID_MASTER tidak diset di .env.local')
    process.exit(1)
  }

  log.info(`Sheet: "${SHEET_NAME}" — ${SPREADSHEET_ID}`)
  const { headers, rows, rawCount } = await getSheetRows(SPREADSHEET_ID, SHEET_NAME)
  log.info(`Ditemukan ${rawCount} baris data`)

  const [airportMap, staffMap] = await Promise.all([getAirportMap(), getStaffMap()])

  const colMap = Object.fromEntries(
    Object.entries(COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof COL, string | null>

  if (!colMap.timestamp || !colMap.nama || !colMap.bandara || !colMap.tipe_absen) {
    log.error('Kolom wajib tidak ditemukan (timestamp / nama / bandara / tipe_absen)')
    process.exit(1)
  }

  const attendanceRows: Record<string, unknown>[] = []
  let skipped = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    if (!requireFields(row, [colMap.timestamp!, colMap.nama!, colMap.bandara!, colMap.tipe_absen!], rowNum, log)) {
      skipped++
      continue
    }

    // Parse timestamp
    const ts = parseTimestamp(row[colMap.timestamp!])
    if (!ts) {
      log.warn(`Baris ${rowNum}: timestamp tidak valid — "${row[colMap.timestamp!]}"`)
      skipped++
      continue
    }

    // Resolve airport
    const airportCode = resolveAirportCode(row[colMap.bandara!])
    if (!airportCode) {
      log.warn(`Baris ${rowNum}: airport tidak dikenal — "${row[colMap.bandara!]}"`)
      skipped++
      continue
    }
    const airportId = airportMap[airportCode]
    if (!airportId) {
      log.warn(`Baris ${rowNum}: airport "${airportCode}" tidak ada di database`)
      skipped++
      continue
    }

    // Resolve staff (by name + airport)
    const namaLower = row[colMap.nama!].toLowerCase().trim()
    const staffId   = staffMap.get(`${airportId}:${namaLower}`)
    if (!staffId) {
      log.warn(`Baris ${rowNum}: staff tidak ditemukan — "${row[colMap.nama!]}" @ ${airportCode}`)
      skipped++
      continue
    }

    // Check type
    const checkType = normalizeCheckType(row[colMap.tipe_absen!])
    if (!checkType) {
      log.warn(`Baris ${rowNum}: tipe absen tidak dikenal — "${row[colMap.tipe_absen!]}"`)
      skipped++
      continue
    }

    // GPS
    const gpsRaw  = colMap.gps ? row[colMap.gps] : ''
    const gpsData = parseGPS(gpsRaw)

    const attendRow: Record<string, unknown> = {
      staff_id:        staffId,
      airport_id:      airportId,
      tanggal:         ts.tanggal,
      check_type:      checkType,
      gps_location:    gpsRaw || null,
      latitude:        gpsData?.latitude  ?? null,
      longitude:       gpsData?.longitude ?? null,
      distance_status: colMap.status_jarak
        ? normalizeDistanceStatus(row[colMap.status_jarak])
        : (gpsData ? 'UNKNOWN' : 'UNKNOWN'),
      photo_url:  colMap.foto ? (row[colMap.foto] || null) : null,
      created_at: ts.ts,
    }

    attendanceRows.push(attendRow)
  }

  log.info(`Siap insert: ${attendanceRows.length} — skip: ${skipped}`)

  // Attendance: insert batch, skip per-row jika duplicate (tidak upsert karena bisa ada multiple per hari)
  let inserted = 0, failed = 0
  const batchSize = 100

  for (let i = 0; i < attendanceRows.length; i += batchSize) {
    const batch = attendanceRows.slice(i, i + batchSize)
    const { error } = await supabase.from('attendance').insert(batch)

    if (error) {
      // Fallback: insert satu per satu untuk skip duplicate
      for (const r of batch) {
        const { error: e2 } = await supabase.from('attendance').insert(r)
        if (e2) {
          if (e2.message.includes('duplicate') || e2.code === '23505') {
            // Skip duplicate
          } else {
            log.error(`Insert gagal baris ${i}`, e2)
            failed++
          }
        } else {
          inserted++
        }
      }
    } else {
      inserted += batch.length
      log.info(`Batch [${i}..${i + batch.length}] ✓`)
    }
  }

  log.summary(attendanceRows.length, inserted)

  const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true })
  saveReport({
    table: 'attendance',
    sheet_name: SHEET_NAME,
    sheets_count: rawCount,
    supabase_count: count ?? 0,
    inserted,
    failed,
    timestamp: new Date().toISOString(),
  })
}

main().catch(err => { console.error(err); process.exit(1) })
