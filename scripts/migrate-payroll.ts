// Migration: Google Sheets "RIFIM PAYROLL" → Supabase payroll
// Run: npx tsx scripts/migrate-payroll.ts

import { getSheetRows, listSheetNames } from './utils/google.js'
import { supabase, getAirportMap, getStaffMap } from './utils/supabase.js'
import { Logger, saveReport, printBanner } from './utils/logger.js'
import { resolveAirportCode, parseCurrency, normalizePeriod } from './utils/mapper.js'
import { requireFields } from './utils/validator.js'

const SPREADSHEET_ID = process.env.SHEET_ID_PAYROLL ?? process.env.SHEET_ID_MASTER!
const SHEET_NAME     = process.env.SHEET_NAME_PAYROLL ?? 'RIFIM PAYROLL'
// Jika payroll punya multiple tab per periode, set SHEET_PAYROLL_MULTI=true
const MULTI_SHEET    = process.env.SHEET_PAYROLL_MULTI === 'true'

const COL = {
  nama:           ['Nama Staff', 'Nama', 'NAMA'],
  airport:        ['ID Cabang', 'Cabang', 'CABANG', 'Bandara'],
  periode:        ['Periode', 'PERIODE', 'Bulan', 'Period'],
  gaji_pokok:     ['Gaji Pokok', 'GAJI POKOK', 'Gaji Staff'],
  bonus:          ['Bonus Lembur', 'Bonus', 'BONUS'],
  lembur:         ['Tarif Lembur', 'Lembur', 'LEMBUR', 'Tunjangan Lembur'],
  kasbon:         ['Kasbon', 'KASBON', 'Hutang'],
  denda_telat:    ['Denda Telat', 'DENDA TELAT', 'Denda Keterlambatan'],
  potongan_alpha: ['Potongan Alpha', 'POTONGAN ALPHA', 'Potongan Absen'],
  deposit:        ['Deposit', 'DEPOSIT'],
  bpjs:           ['BPJS', 'Bpjs'],
  kuota:          ['Kuota', 'KUOTA'],
  total_hadir:    ['Total Hadir', 'HADIR', 'Hari Hadir'],
  total_alpha:    ['Total Alpha', 'Alpha', 'ALPHA', 'Hari Alpha'],
  total_terlambat: ['Terlambat', 'TERLAMBAT', 'Total Terlambat'],
  jam_lembur:     ['Jam Lembur', 'JAM LEMBUR'],
}

function findCol(headers: string[], candidates: string[]): string | null {
  return candidates.find(c => headers.includes(c)) ?? null
}

async function processSheet(
  spreadsheetId: string,
  sheetName: string,
  airportMap: Record<string, string>,
  staffMap: Map<string, string>,
  defaultPeriode: string | null,
  log: Logger
): Promise<Record<string, unknown>[]> {
  log.info(`Sheet: "${sheetName}"`)
  const { headers, rows, rawCount } = await getSheetRows(spreadsheetId, sheetName)
  log.info(`  ${rawCount} baris`)

  const colMap = Object.fromEntries(
    Object.entries(COL).map(([key, candidates]) => [key, findCol(headers, candidates)])
  ) as Record<keyof typeof COL, string | null>

  if (!colMap.nama) {
    log.warn(`  Kolom "Nama" tidak ditemukan di "${sheetName}" — skip`)
    return []
  }

  const result: Record<string, unknown>[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 2

    if (!requireFields(row, [colMap.nama!], rowNum, log)) continue

    // Resolve periode
    const periodeRaw = colMap.periode ? row[colMap.periode] : (defaultPeriode ?? '')
    const periode    = normalizePeriod(periodeRaw || sheetName)  // fallback: parse sheet name
    if (!periode) {
      log.warn(`Baris ${rowNum}: periode tidak valid — "${periodeRaw}"`)
      continue
    }
    const [tahunStr, bulanStr] = periode.split('-')
    const periode_tahun = parseInt(tahunStr)
    const periode_bulan = parseInt(bulanStr)

    // Resolve airport
    let airportId: string | null = null
    if (colMap.airport) {
      const code = resolveAirportCode(row[colMap.airport])
      if (code) airportId = airportMap[code] ?? null
    }

    // Resolve staff (by nama + airport, or just nama across all airports)
    const namaLower = row[colMap.nama!].toLowerCase().trim()
    let staffId: string | null = null

    if (airportId) {
      staffId = staffMap.get(`${airportId}:${namaLower}`) ?? null
    } else {
      // Try all airports
      for (const [key, id] of staffMap.entries()) {
        if (key.endsWith(`:${namaLower}`)) { staffId = id; break }
      }
    }

    if (!staffId) {
      log.warn(`Baris ${rowNum}: staff tidak ditemukan — "${row[colMap.nama!]}"`)
      continue
    }

    const gaji_pokok = colMap.gaji_pokok ? parseCurrency(row[colMap.gaji_pokok]) : 0

    result.push({
      staff_id:        staffId,
      periode,
      periode_bulan,
      periode_tahun,
      gaji_pokok,
      bpjs:            colMap.bpjs        ? parseCurrency(row[colMap.bpjs])        : 0,
      kuota:           colMap.kuota       ? parseCurrency(row[colMap.kuota])       : 0,
      deposit:         colMap.deposit     ? parseCurrency(row[colMap.deposit])     : 0,
      bonus:           colMap.bonus       ? parseCurrency(row[colMap.bonus])       : 0,
      lembur:          colMap.lembur      ? parseCurrency(row[colMap.lembur])      : 0,
      kasbon:          colMap.kasbon      ? parseCurrency(row[colMap.kasbon])      : 0,
      denda_telat:     colMap.denda_telat ? parseCurrency(row[colMap.denda_telat]) : 0,
      potongan_alpha:  colMap.potongan_alpha ? parseCurrency(row[colMap.potongan_alpha]) : 0,
      total_hadir:     colMap.total_hadir     ? (parseInt(row[colMap.total_hadir]) || 0)     : 0,
      total_alpha:     colMap.total_alpha     ? (parseInt(row[colMap.total_alpha]) || 0)     : 0,
      total_terlambat: colMap.total_terlambat ? (parseInt(row[colMap.total_terlambat]) || 0) : 0,
      jam_lembur:      colMap.jam_lembur  ? (parseFloat(row[colMap.jam_lembur]) || 0) : 0,
      status: 'DRAFT',
    })
  }

  return result
}

async function main() {
  printBanner('Payroll')
  const log = new Logger('migrate-payroll')

  if (!SPREADSHEET_ID) {
    log.error('SHEET_ID_PAYROLL atau SHEET_ID_MASTER tidak diset di .env.local')
    process.exit(1)
  }

  const [airportMap, staffMap] = await Promise.all([getAirportMap(), getStaffMap()])

  let allRows: Record<string, unknown>[] = []
  let totalRaw = 0

  if (MULTI_SHEET) {
    // Setiap tab = satu periode (nama tab = "Juni 2026", "2026-06", dll)
    const sheetNames = await listSheetNames(SPREADSHEET_ID)
    log.info(`Mode multi-sheet: ${sheetNames.length} tab ditemukan`)

    for (const name of sheetNames) {
      const rows = await processSheet(SPREADSHEET_ID, name, airportMap, staffMap, null, log)
      totalRaw += rows.length
      allRows.push(...rows)
    }
  } else {
    const { rawCount } = await getSheetRows(SPREADSHEET_ID, SHEET_NAME)
    totalRaw = rawCount
    allRows = await processSheet(SPREADSHEET_ID, SHEET_NAME, airportMap, staffMap, null, log)
  }

  log.info(`Total siap upsert: ${allRows.length}`)

  let inserted = 0, failed = 0
  const batchSize = 50

  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize)
    const { error } = await supabase
      .from('payroll')
      .upsert(batch, { onConflict: 'staff_id,periode', ignoreDuplicates: false })

    if (error) {
      log.error(`Batch [${i}..${i + batch.length}] gagal`, error)
      failed += batch.length
    } else {
      inserted += batch.length
      log.info(`Batch [${i}..${i + batch.length}] ✓`)
    }
  }

  log.summary(allRows.length, inserted)

  const { count } = await supabase.from('payroll').select('*', { count: 'exact', head: true })
  saveReport({
    table: 'payroll',
    sheet_name: SHEET_NAME,
    sheets_count: totalRaw,
    supabase_count: count ?? 0,
    inserted,
    failed,
    timestamp: new Date().toISOString(),
  })
}

main().catch(err => { console.error(err); process.exit(1) })
