import { createClient } from '@/lib/supabase/server'

export type RoleName = 'SUPER_ADMIN' | 'DIRECTOR' | 'AIRPORT_COORDINATOR' | 'STAFF' | 'DRIVER'

export const ROLE_LEVEL: Record<RoleName, number> = {
  SUPER_ADMIN:         5,
  DIRECTOR:            4,
  AIRPORT_COORDINATOR: 3,
  STAFF:               2,
  DRIVER:              1,
}

export interface UserProfile {
  id:           string
  auth_user_id: string
  email:        string | null
  full_name:    string | null
  role:         RoleName
  role_level:   number
  airport_id:   string | null
  airport_code: string | null
  is_active:    boolean
}

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: raw } = await supabase
    .from('users')
    .select('id, auth_user_id, email, full_name, airport_id, is_active, role_id, roles(name, level), airports(code)')
    .eq('auth_user_id', user.id)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = raw as any
  if (!data) return null

  const roleRow    = data.roles    as { name: RoleName; level: number } | null
  const airportRow = data.airports as { code: string } | null

  return {
    id:           data.id,
    auth_user_id: user.id,
    email:        data.email ?? user.email ?? null,
    full_name:    data.full_name,
    role:         roleRow?.name    ?? 'STAFF',
    role_level:   roleRow?.level   ?? 2,
    airport_id:   data.airport_id,
    airport_code: airportRow?.code ?? null,
    is_active:    data.is_active,
  }
}

export function hasMinRole(user: UserProfile, minRole: RoleName): boolean {
  return user.role_level >= ROLE_LEVEL[minRole]
}

export function canAccessAirport(user: UserProfile, airportId: string): boolean {
  if (user.role_level >= ROLE_LEVEL.DIRECTOR) return true
  return user.airport_id === airportId
}
