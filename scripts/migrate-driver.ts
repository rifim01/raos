// migrate-driver.ts
// Migrasi dari 2 sheet (DATABASE DRIVER AIRPORT + DATABASE DRIVER EXTERNAL) → tabel drivers
// Kedua sheet di-merge dengan kolom driver_type = INTERNAL / EXTERNAL

import 'dotenv/config'
import * as fs from 'fs'
import * as readline from 'readline'
import { getAirportMap, upsertWithRetry, MigrationLogger } from './migrate-utils'

interface DriversRow {
  airport_id: string
  driver_code: string
  nama: string
  nomor_hp: string | null
  driver_type: 'INTERNAL' | 'EXTERNAL'
  status: 'ACTIVE'
}

async function readCsvFile(
  filePath: string,
  driverType: 'INTERNAL' | 'EXTERNAL',
  airportMap: Record<string, string>,
  log: MigrationLogger
): Promise<{ rows: DriversRow[]; skipped: number }> {
  const rows: DriversRow[] = []
  let skipped = 0
  let headers: string[] = []

  const rl = readline.createInterface({ input: fs.createReadStream(filePath) })

  for await (const line of rl) {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    if (!headers.length) { headers = cols.map(h => h.trim()); continue }

    const row: Record<string, string> = {}
    headers.forEach((h, i) => row[h] = cols[i] ?? '')

    const driverId = (row['ID Driver'] || row['ID_Driver'] || '').trim()
    const nama     = (row['Nama Driver'] || row['Nama'] || '').trim()
    const cabang   = (row['Cabang'] || row['ID Cabang'] || row['ID_Cabang'] || '').trim()
    const hp       = (row['Nomor HP'] || row['HP'] || '').trim() || null

    if (!driverId || !nama) continue

    // Normalisasi kode bandara
    const code = cabang.toUpperCase().match(/^[A-Z]{3}$/)
      ? cabang.toUpperCase() + '001'
      : cabang.toUpperCase()

    const airportId = airportMap[code]
    if (!airportId) {
      log.error(`Airport tidak ditemukan: "${cabang}" (driver: ${nama})`)
      skipped++
      continue
    }

    rows.push({
      airport_id: airportId,
      driver_code: driverId,
      nama,
      nomor_hp: hp,
      driver_type: driverType,
      status: 'ACTIVE',
    })
  }

  return { rows, skipped }
}

async function main() {
  const log = new MigrationLogger('driver')
  const args = Object.fromEntries(process.argv.slice(2).map(a => a.replace('--', '').split('=')))

  // Bisa pass satu atau dua file
  const internalFile = args.internal  // --internal=driver-airport.csv
  const externalFile = args.external  // --external=driver-external.csv

  if (!internalFile && !externalFile) {
    log.error('Gunakan: --internal=driver-airport.csv --external=driver-external.csv')
    process.exit(1)
  }

  const airportMap = await getAirportMap()
  log.info(`Airport map loaded: ${Object.keys(airportMap).length} bandara`)

  const allRows: DriversRow[] = []
  let totalSkipped = 0

  if (internalFile && fs.existsSync(internalFile)) {
    log.info(`Baca INTERNAL: ${internalFile}`)
    const { rows, skipped } = await readCsvFile(internalFile, 'INTERNAL', airportMap, log)
    allRows.push(...rows)
    totalSkipped += skipped
    log.info(`INTERNAL: ${rows.length} valid, ${skipped} skip`)
  }

  if (externalFile && fs.existsSync(externalFile)) {
    log.info(`Baca EXTERNAL: ${externalFile}`)
    const { rows, skipped } = await readCsvFile(externalFile, 'EXTERNAL', airportMap, log)
    allRows.push(...rows)
    totalSkipped += skipped
    log.info(`EXTERNAL: ${rows.length} valid, ${skipped} skip`)
  }

  // Deteksi duplikat driver_code dalam airport
  const seen = new Set<string>()
  const deduped = allRows.filter(r => {
    const key = `${r.airport_id}:${r.driver_code}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  if (deduped.length < allRows.length) {
    log.info(`Duplikat dihapus: ${allRows.length - deduped.length}`)
  }

  log.info(`Total upsert: ${deduped.length}, total skip: ${totalSkipped}`)
  const { success, failed } = await upsertWithRetry('drivers', deduped, 'airport_id,driver_code', log)
  log.summary(deduped.length, success)

  if (failed > 0) process.exit(1)
}

main().catch(err => { console.error(err); process.exit(1) })
