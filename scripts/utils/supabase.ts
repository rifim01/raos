// Supabase client untuk migration scripts (service role — bypass RLS)
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

export const supabase: SupabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Cache helpers ──────────────────────────────────────────────

let _airportMap: Record<string, string> | null = null
export async function getAirportMap(): Promise<Record<string, string>> {
  if (_airportMap) return _airportMap
  const { data, error } = await supabase.from('airports').select('id, code')
  if (error) throw new Error('getAirportMap: ' + error.message)
  _airportMap = Object.fromEntries(data!.map(a => [a.code, a.id]))
  return _airportMap
}

let _staffMap: Map<string, string> | null = null
// Key format: "{airport_id}:{nama_lowercase}"
export async function getStaffMap(): Promise<Map<string, string>> {
  if (_staffMap) return _staffMap
  const { data, error } = await supabase.from('staff').select('id, nama, airport_id')
  if (error) throw new Error('getStaffMap: ' + error.message)
  _staffMap = new Map(data!.map(s => [`${s.airport_id}:${s.nama.toLowerCase().trim()}`, s.id]))
  return _staffMap
}

let _staffCodeMap: Map<string, string> | null = null
// Key format: "{airport_id}:{staff_code}"
export async function getStaffCodeMap(): Promise<Map<string, string>> {
  if (_staffCodeMap) return _staffCodeMap
  const { data, error } = await supabase.from('staff').select('id, staff_code, airport_id')
  if (error) throw new Error('getStaffCodeMap: ' + error.message)
  _staffCodeMap = new Map(data!.map(s => [`${s.airport_id}:${s.staff_code}`, s.id]))
  return _staffCodeMap
}

let _driverMap: Map<string, string> | null = null
// Key format: "{airport_id}:{driver_code}"
export async function getDriverMap(): Promise<Map<string, string>> {
  if (_driverMap) return _driverMap
  const { data, error } = await supabase.from('drivers').select('id, driver_code, airport_id')
  if (error) throw new Error('getDriverMap: ' + error.message)
  _driverMap = new Map(data!.map(d => [`${d.airport_id}:${d.driver_code}`, d.id]))
  return _driverMap
}

export function clearCache() {
  _airportMap = null
  _staffMap = null
  _staffCodeMap = null
  _driverMap = null
}

// ── Batch upsert ───────────────────────────────────────────────

export async function upsertBatch<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
  batchSize = 50
): Promise<{ inserted: number; failed: number }> {
  let inserted = 0
  let failed = 0

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false })

    if (error) {
      console.error(`[ERROR] upsert ${table} batch[${i}..${i + batch.length}]: ${error.message}`)
      failed += batch.length
    } else {
      inserted += batch.length
    }
  }

  return { inserted, failed }
}

export async function getTableCount(table: string): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) return -1
  return count ?? 0
}
