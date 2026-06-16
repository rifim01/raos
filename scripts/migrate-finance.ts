// Migration: Google Sheets (Money / Tagihan / Pendapatan Luar) → Supabase finance tables
// Run: npx tsx scripts/migrate-finance.ts

import { getSheetRows } from './utils/google.js'
import { supabase, getAirportMap, upsertBatch } from './utils/supabase.js'
import { Logger, saveReport, printBanner } from './utils/logger.js'
import { resolveAirportCode, parseCurrency, normalizeDate } from './utils/mapper.js'
import { requireFields } from './utils/validator.js'

const SPREADSHEET_ID           = process.env.SHEET_ID_FINANCE     ?? process.env.SHEET_ID_MASTER!
const SPREADSHEET_ID_PENDAPATAN = process.env.SHEET_ID_PENDAPATAN ?? SPREADSHEET_ID
const SHEET_MONEY       = process.env.SHEET_NAME_MONEY       ?? 'Money'
const SHEET_TAGIHAN     = process.env.SHEET_NAME_TAGIHAN     ?? 'Tagihan'
const SHEET_PENDAPATAN  = process.env.SHEET_NAME_PENDAPATAN  ?? 'Pendapatan Luar'

function findCol(headers: string[], candidates: string[]): string | null {
  return candidates.find(c => headers.includes(c)) ?? null
}

// ── Transactions (Money) ─────────────────────────────────────

async function migrateTransactions(
  airportMap: Record<string, string>,
  log: Logger
): Promise<{ rawCount: number; inserted: number; failed: number }> {
  log.info(`\n  → Sheet "${SHEET_MONEY}"`)

  let sheetData
  try { sheetData = await getSheetRows(SPREADSHEET_ID, SHEET_MONEY) }
  catch { log.warn(`  Sheet "${SHEET_MONEY}" tidak ditemukan — skip`); return { rawCount: 0, inserted: 0, failed: 0 } }

  const { headers, rows, rawCount } = sheetData
  log.info(`  ${rawCount} baris`)

  const COL = {
    airport:    ['Bandara', 'ID Cabang', 'BANDARA', 'Cabang'],
    jenis:      ['Jenis', 'JENIS', 'Tipe', 'Type'],
    kategori:   ['Kategori', 'KATEGORI', 'Keterangan', 'Deskripsi'],
    nominal:    ['Nominal', 'NOMINAL', 'Jumlah', 'Amount'],
    tanggal:    ['Tanggal', 'TANGGAL', 'Date', 'Tgl'],
    keterangan: ['Keterangan', 'Deskripsi', 'Notes', 'Catatan'],
    bukti_url:  ['Bukti Foto', 'Bukti', 'Foto URL', 'Receipt'],
  }
  const col = Object.fromEntries(Object.entries(COL).map(([k, c]) => [k, findCol(headers, c)]))

  const txRows: Record<string, unknown>[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!requireFields(row, [col.airport, col.nominal].filter(Boolean) as string[], i + 2, log)) continue

    const code = resolveAirportCode(col.airport ? row[col.airport] : '')
    if (!code) { log.warn(`Baris ${i+2}: airport tidak dikenal — skip`); continue }
    const airportId = airportMap[code]
    if (!airportId) { log.warn(`Baris ${i+2}: airport "${code}" tidak ada — skip`); continue }

    const nominal = col.nominal ? parseCurrency(row[col.nominal]) : 0
    if (!nominal) { log.warn(`Baris ${i+2}: nominal 0 — skip`); continue }

    const jenisRaw = col.jenis ? row[col.jenis].toUpperCase() : ''
    const jenis = jenisRaw.includes('KELUAR') || jenisRaw.includes('PENGELUARAN')
      ? 'PENGELUARAN' : 'PEMASUKAN'

    const tanggalRaw = col.tanggal ? row[col.tanggal] : ''
    const tanggal    = normalizeDate(tanggalRaw) ?? new Date().toISOString().split('T')[0]

    txRows.push({
      airport_id: airportId,
      jenis,
      kategori:   col.kategori   ? (row[col.kategori] || 'LAINNYA') : 'LAINNYA',
      nominal,
      tanggal,
      keterangan: col.keterangan ? (row[col.keterangan] || null) : null,
      bukti_url:  col.bukti_url  ? (row[col.bukti_url]  || null) : null,
    })
  }

  log.info(`  ${txRows.length} valid`)
  const { inserted, failed } = await upsertBatch('finance_transactions', txRows, 'id')
  return { rawCount, inserted, failed }
}

// ── Bills (Tagihan) ───────────────────────────────────────────

async function migrateBills(
  airportMap: Record<string, string>,
  log: Logger
): Promise<{ rawCount: number; inserted: number; failed: number }> {
  log.info(`\n  → Sheet "${SHEET_TAGIHAN}"`)

  let sheetData
  try { sheetData = await getSheetRows(SPREADSHEET_ID, SHEET_TAGIHAN) }
  catch { log.warn(`  Sheet "${SHEET_TAGIHAN}" tidak ditemukan — skip`); return { rawCount: 0, inserted: 0, failed: 0 } }

  const { headers, rows, rawCount } = sheetData
  log.info(`  ${rawCount} baris`)

  const COL = {
    airport:     ['Bandara', 'ID Cabang', 'BANDARA', 'Cabang'],
    vendor:      ['Vendor', 'VENDOR', 'Nama Vendor', 'Perusahaan'],
    invoice:     ['Invoice Number', 'Invoice', 'No Invoice', 'Nomor Invoice'],
    jumlah:      ['Jumlah', 'JUMLAH', 'Nominal', 'Amount'],
    jatuh_tempo: ['Jatuh Tempo', 'JATUH TEMPO', 'Due Date', 'Tenggat'],
    status:      ['Status', 'STATUS'],
    keterangan:  ['Keterangan', 'Notes', 'Catatan'],
    bukti_url:   ['Bukti', 'Bukti Foto', 'Receipt'],
  }
  const col = Object.fromEntries(Object.entries(COL).map(([k, c]) => [k, findCol(headers, c)]))

  const billRows: Record<string, unknown>[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!requireFields(row, [col.airport, col.vendor, col.jumlah].filter(Boolean) as string[], i + 2, log)) continue

    const code = resolveAirportCode(col.airport ? row[col.airport] : '')
    if (!code) { log.warn(`Baris ${i+2}: airport tidak dikenal — skip`); continue }
    const airportId = airportMap[code]
    if (!airportId) continue

    const jumlah = col.jumlah ? parseCurrency(row[col.jumlah]) : 0
    if (!jumlah) continue

    const jatuh_tempo_raw = col.jatuh_tempo ? row[col.jatuh_tempo] : ''
    const jatuh_tempo     = normalizeDate(jatuh_tempo_raw) ?? new Date().toISOString().split('T')[0]

    const rawStatus = col.status ? row[col.status].toUpperCase() : 'UNPAID'
    const status = ['UNPAID', 'PAID', 'OVERDUE', 'DISPUTED'].includes(rawStatus)
      ? rawStatus : 'UNPAID'

    billRows.push({
      airport_id:     airportId,
      vendor:         col.vendor  ? row[col.vendor]  : 'UNKNOWN',
      invoice_number: col.invoice ? (row[col.invoice] || null) : null,
      jumlah,
      jatuh_tempo,
      status,
      keterangan: col.keterangan ? (row[col.keterangan] || null) : null,
      bukti_url:  col.bukti_url  ? (row[col.bukti_url]  || null) : null,
    })
  }

  log.info(`  ${billRows.length} valid`)
  const { inserted, failed } = await upsertBatch('finance_bills', billRows, 'id')
  return { rawCount, inserted, failed }
}

// ── External Income (Pendapatan Luar) ─────────────────────────

async function migrateExternalIncome(
  airportMap: Record<string, string>,
  log: Logger,
  spreadsheetId: string = SPREADSHEET_ID
): Promise<{ rawCount: number; inserted: number; failed: number }> {
  log.info(`\n  → Sheet "${SHEET_PENDAPATAN}"`)

  let sheetData
  try { sheetData = await getSheetRows(spreadsheetId, SHEET_PENDAPATAN) }
  catch { log.warn(`  Sheet "${SHEET_PENDAPATAN}" tidak ditemukan — skip`); return { rawCount: 0, inserted: 0, failed: 0 } }

  const { headers, rows, rawCount } = sheetData
  log.info(`  ${rawCount} baris`)

  const COL = {
    airport:    ['Bandara', 'ID Cabang', 'BANDARA', 'Cabang'],
    sumber:     ['Sumber', 'SUMBER', 'Dari', 'Source'],
    nominal:    ['Nominal', 'NOMINAL', 'Jumlah', 'Amount'],
    tanggal:    ['Tanggal', 'TANGGAL', 'Date'],
    keterangan: ['Keterangan', 'Notes', 'Catatan'],
    bukti_url:  ['Bukti', 'Foto', 'Receipt URL'],
  }
  const col = Object.fromEntries(Object.entries(COL).map(([k, c]) => [k, findCol(headers, c)]))

  const incomeRows: Record<string, unknown>[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    if (!requireFields(row, [col.airport, col.nominal].filter(Boolean) as string[], i + 2, log)) continue

    const code = resolveAirportCode(col.airport ? row[col.airport] : '')
    if (!code) continue
    const airportId = airportMap[code]
    if (!airportId) continue

    const nominal = col.nominal ? parseCurrency(row[col.nominal]) : 0
    if (!nominal) continue

    const tanggal = col.tanggal
      ? (normalizeDate(row[col.tanggal]) ?? new Date().toISOString().split('T')[0])
      : new Date().toISOString().split('T')[0]

    incomeRows.push({
      airport_id: airportId,
      sumber:     col.sumber     ? (row[col.sumber] || 'LAINNYA') : 'LAINNYA',
      nominal,
      tanggal,
      keterangan: col.keterangan ? (row[col.keterangan] || null) : null,
      bukti_url:  col.bukti_url  ? (row[col.bukti_url]  || null) : null,
    })
  }

  log.info(`  ${incomeRows.length} valid`)
  const { inserted, failed } = await upsertBatch('finance_external_income', incomeRows, 'id')
  return { rawCount, inserted, failed }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  printBanner('Finance')
  const log = new Logger('migrate-finance')

  if (!SPREADSHEET_ID) {
    log.error('SHEET_ID_FINANCE atau SHEET_ID_MASTER tidak diset di .env.local')
    process.exit(1)
  }

  const airportMap = await getAirportMap()

  const [tx, bills, income] = await Promise.all([
    migrateTransactions(airportMap, log),
    migrateBills(airportMap, log),
    migrateExternalIncome(airportMap, log, SPREADSHEET_ID_PENDAPATAN),
  ])

  const totalInserted = tx.inserted + bills.inserted + income.inserted
  const totalFailed   = tx.failed + bills.failed + income.failed
  const totalRaw      = tx.rawCount + bills.rawCount + income.rawCount

  log.summary(totalInserted + totalFailed, totalInserted)

  // Save 3 reports
  const { count: cTx } = await supabase.from('finance_transactions').select('*', { count: 'exact', head: true })
  const { count: cBills } = await supabase.from('finance_bills').select('*', { count: 'exact', head: true })
  const { count: cIncome } = await supabase.from('finance_external_income').select('*', { count: 'exact', head: true })

  saveReport({ table: 'finance_transactions',   sheet_name: SHEET_MONEY,      sheets_count: tx.rawCount,     supabase_count: cTx    ?? 0, inserted: tx.inserted,     failed: tx.failed,     timestamp: new Date().toISOString() })
  saveReport({ table: 'finance_bills',          sheet_name: SHEET_TAGIHAN,    sheets_count: bills.rawCount,  supabase_count: cBills ?? 0, inserted: bills.inserted,  failed: bills.failed,  timestamp: new Date().toISOString() })
  saveReport({ table: 'finance_external_income',sheet_name: SHEET_PENDAPATAN, sheets_count: income.rawCount, supabase_count: cIncome?? 0, inserted: income.inserted, failed: income.failed, timestamp: new Date().toISOString() })
}

main().catch(err => { console.error(err); process.exit(1) })
