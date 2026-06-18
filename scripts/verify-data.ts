// Verification: Compare Google Sheets counts vs Supabase counts
// Generates migration_report.json
// Run: npx tsx scripts/verify-data.ts

import { getSheetRowCount } from './utils/google.js'
import { getTableCount } from './utils/supabase.js'
import { printBanner } from './utils/logger.js'
import {
  DRIVER_INTERNAL_TAB_ALIASES,
} from './constants/google-sheets.js'
import * as fs from 'fs'
import * as path from 'path'

interface VerifyTarget {
  label: string
  table: string
  spreadsheetId: string
  sheetName: string
}

interface VerifyResult extends VerifyTarget {
  sheets_count: number
  supabase_count: number
  delta: number
  status: 'OK' | 'MISMATCH' | 'EMPTY' | 'ERROR'
}

// Konfigurasi per tabel — baca dari env
function buildTargets(): VerifyTarget[] {
  const master     = process.env.SHEET_ID_MASTER
  const staff      = process.env.SHEET_ID_STAFF              ?? master!
  const driverInt  = process.env.SHEET_ID_DRIVER_INTERNAL    ?? process.env.SHEET_ID_DRIVER ?? master!
  const driverExt  = process.env.SHEET_ID_DRIVER_EXTERNAL    ?? process.env.SHEET_ID_DRIVER ?? master!
  const att        = process.env.SHEET_ID_ATTENDANCE         ?? master!
  const sched      = process.env.SHEET_ID_SCHEDULE           ?? att
  const payroll    = process.env.SHEET_ID_PAYROLL            ?? master!
  const finance    = process.env.SHEET_ID_FINANCE            ?? master!
  const pendapatan = process.env.SHEET_ID_PENDAPATAN         ?? finance

  const targets: VerifyTarget[] = []

  if (staff)      targets.push({ label: 'Staff',                table: 'staff',                   spreadsheetId: staff,      sheetName: process.env.SHEET_NAME_STAFF       ?? 'MASTER DATA STAFF' })
  if (driverInt)  targets.push({ label: 'Driver Internal',      table: 'drivers',                 spreadsheetId: driverInt,  sheetName: DRIVER_INTERNAL_TAB_ALIASES.DJB001[0] })
  if (driverExt)  targets.push({ label: 'Driver External',      table: 'drivers',                 spreadsheetId: driverExt,  sheetName: 'ID Rifim Batam' })
  if (att)        targets.push({ label: 'Attendance',           table: 'attendance',              spreadsheetId: att,        sheetName: process.env.SHEET_NAME_ATTENDANCE  ?? 'ABSENSI' })
  if (sched)      targets.push({ label: 'Staff Schedule',       table: 'staff_schedule',          spreadsheetId: sched,      sheetName: process.env.SHEET_NAME_SCHEDULE    ?? 'JADWAL KERJA' })
  if (payroll)    targets.push({ label: 'Payroll',              table: 'payroll',                 spreadsheetId: payroll,    sheetName: process.env.SHEET_NAME_PAYROLL     ?? 'PAYROLL' })
  if (finance)    targets.push({ label: 'Transactions (Money)', table: 'finance_transactions',    spreadsheetId: finance,    sheetName: process.env.SHEET_NAME_MONEY       ?? 'Money' })
  if (finance)    targets.push({ label: 'Bills (Tagihan)',      table: 'finance_bills',           spreadsheetId: finance,    sheetName: process.env.SHEET_NAME_TAGIHAN     ?? 'Tagihan' })
  if (pendapatan) targets.push({ label: 'External Income',      table: 'finance_external_income', spreadsheetId: pendapatan, sheetName: process.env.SHEET_NAME_PENDAPATAN  ?? 'Pendapatan Luar' })

  return targets
}

async function verify(target: VerifyTarget): Promise<VerifyResult> {
  let sheets_count = 0
  let supabase_count = 0

  try {
    [sheets_count, supabase_count] = await Promise.all([
      getSheetRowCount(target.spreadsheetId, target.sheetName).catch(() => -1),
      getTableCount(target.table),
    ])
  } catch (e) {
    return { ...target, sheets_count: -1, supabase_count: -1, delta: 0, status: 'ERROR' }
  }

  const delta = supabase_count - sheets_count
  let status: VerifyResult['status'] = 'OK'

  if (sheets_count < 0 || supabase_count < 0) status = 'ERROR'
  else if (sheets_count === 0 && supabase_count === 0) status = 'EMPTY'
  else if (Math.abs(delta) > 0) status = 'MISMATCH'

  return { ...target, sheets_count, supabase_count, delta, status }
}

async function main() {
  printBanner('Verify Data')

  const targets = buildTargets()
  if (targets.length === 0) {
    console.error('Tidak ada SHEET_ID_* yang dikonfigurasi di .env.local')
    process.exit(1)
  }

  console.log(`Memverifikasi ${targets.length} sumber data...\n`)

  const results: VerifyResult[] = []
  for (const target of targets) {
    process.stdout.write(`  Checking ${target.label}...`)
    const result = await verify(target)
    results.push(result)

    const icon = result.status === 'OK' ? '✅' : result.status === 'EMPTY' ? '⚪' : result.status === 'ERROR' ? '❌' : '⚠️'
    const delta = result.delta >= 0 ? `+${result.delta}` : `${result.delta}`
    console.log(` ${icon}  Sheets=${result.sheets_count}  Supabase=${result.supabase_count}  delta=${delta}`)
  }

  // Summary
  const ok       = results.filter(r => r.status === 'OK').length
  const mismatch = results.filter(r => r.status === 'MISMATCH').length
  const errors   = results.filter(r => r.status === 'ERROR').length

  console.log('\n' + '─'.repeat(52))
  console.log(`  ✅ OK: ${ok}   ⚠️  Mismatch: ${mismatch}   ❌ Error: ${errors}`)
  console.log('─'.repeat(52) + '\n')

  if (mismatch > 0) {
    console.log('⚠️  Mismatch ditemukan:')
    results.filter(r => r.status === 'MISMATCH').forEach(r => {
      console.log(`   ${r.label}: Sheets=${r.sheets_count}  Supabase=${r.supabase_count}  (delta=${r.delta})`)
    })
    console.log()
  }

  // Save report
  const reportPath = path.join(process.cwd(), 'migration_report.json')
  const report = {
    generated_at: new Date().toISOString(),
    summary: { total: results.length, ok, mismatch, errors },
    results,
  }
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📄 Report disimpan: ${reportPath}`)

  if (errors > 0) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
