// Data validation helpers
import type { SheetRow } from './google.js'

export function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || String(v).trim() === ''
}

export function requireFields(
  row: SheetRow,
  fields: string[],
  rowNum: number,
  log: { warn: (m: string) => void }
): boolean {
  const missing = fields.filter(f => isEmpty(row[f]))
  if (missing.length > 0) {
    log.warn(`Baris ${rowNum}: skip — field kosong: [${missing.join(', ')}]`)
    return false
  }
  return true
}

export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false
  const d = new Date(dateStr)
  return !isNaN(d.getTime())
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('0')) return '+62' + digits.slice(1)
  if (digits.startsWith('62')) return '+' + digits
  return digits ? '+62' + digits : ''
}

export function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .trim()
}
