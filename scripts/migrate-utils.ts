// Shared utilities untuk semua migration scripts

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // service role — bypass RLS
)

// Airport code → UUID cache
let _airportCache: Record<string, string> | null = null
export async function getAirportMap(): Promise<Record<string, string>> {
  if (_airportCache) return _airportCache
  const { data, error } = await supabase.from('airports').select('id, code')
  if (error) throw error
  _airportCache = Object.fromEntries(data!.map(a => [a.code, a.id]))
  return _airportCache
}

// Staff nama → UUID cache (per airport)
let _staffCache: Record<string, string> | null = null
export async function getStaffMap(): Promise<Record<string, string>> {
  if (_staffCache) return _staffCache
  const { data, error } = await supabase.from('staff').select('id, nama, airport_id')
  if (error) throw error
  _staffCache = Object.fromEntries(data!.map(s => [`${s.airport_id}:${s.nama.toLowerCase()}`, s.id]))
  return _staffCache
}

// Simple logger dengan file output
export class MigrationLogger {
  private logPath: string
  private errors: string[] = []

  constructor(name: string) {
    this.logPath = path.join(process.cwd(), 'scripts', 'logs', `${name}-${Date.now()}.log`)
    fs.mkdirSync(path.dirname(this.logPath), { recursive: true })
  }

  info(msg: string) {
    const line = `[INFO]  ${new Date().toISOString()} ${msg}`
    console.log(line)
    fs.appendFileSync(this.logPath, line + '\n')
  }

  error(msg: string, err?: unknown) {
    const detail = err instanceof Error ? err.message : String(err ?? '')
    const line = `[ERROR] ${new Date().toISOString()} ${msg} ${detail}`
    console.error(line)
    fs.appendFileSync(this.logPath, line + '\n')
    this.errors.push(line)
  }

  summary(total: number, success: number) {
    const failed = total - success
    this.info(`SUMMARY: total=${total} success=${success} failed=${failed}`)
    if (this.errors.length) {
      this.info(`Error log: ${this.logPath}`)
    }
  }
}

// Upsert dengan retry sederhana
export async function upsertWithRetry<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  conflictColumns: string,
  log: MigrationLogger,
  batchSize = 50
): Promise<{ success: number; failed: number }> {
  let success = 0, failed = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict: conflictColumns, ignoreDuplicates: false })

    if (error) {
      log.error(`Batch ${i}-${i + batch.length} gagal`, error)
      failed += batch.length
    } else {
      success += batch.length
      log.info(`Batch ${i}-${i + batch.length} ✓`)
    }
  }

  return { success, failed }
}
