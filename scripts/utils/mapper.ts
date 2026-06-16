// Data normalization helpers — airport names, dates, currencies, GPS

// ── Airport mapping ────────────────────────────────────────────

const AIRPORT_ALIASES: Record<string, string> = {
  // Full names
  'jambi': 'DJB001',
  'pekanbaru': 'PKU001',
  'batam': 'BTH001',
  'balikpapan': 'BPN001',
  'manado': 'MDC001',
  'makassar': 'UPG001',
  // Short codes (case-insensitive)
  'djb': 'DJB001', 'djb001': 'DJB001',
  'pku': 'PKU001', 'pku001': 'PKU001',
  'bth': 'BTH001', 'bth001': 'BTH001',
  'bpn': 'BPN001', 'bpn001': 'BPN001',
  'mdc': 'MDC001', 'mdc001': 'MDC001',
  'upg': 'UPG001', 'upg001': 'UPG001',
  // Province / alternate names
  'riau': 'PKU001',
  'kepulauan riau': 'BTH001',
  'kaltim': 'BPN001',
  'sulut': 'MDC001',
  'sulsel': 'UPG001',
  // Spreadsheet tab names: "ID Rifim Airport <City>"
  'id rifim airport jambi': 'DJB001',
  'id rifim airport pekanbaru': 'PKU001',
  'id rifim airport batam': 'BTH001',
  'id rifim airport balikpapan': 'BPN001',
  'id rifim airport manado': 'MDC001',
  'id rifim airport makassar': 'UPG001',
  // Spreadsheet tab names: "ID Rifim <City>"
  'id rifim jambi': 'DJB001',
  'id rifim jambi luar': 'DJB001',
  'id rifim pekanbaru': 'PKU001',
  'id rifim batam': 'BTH001',
  'id rifim balikpapan': 'BPN001',
  'id rifim manado': 'MDC001',
  'id rifim makassar': 'UPG001',
  // "Rifim <City>" variants
  'rifim jambi': 'DJB001',
  'rifim pekanbaru': 'PKU001',
  'rifim batam': 'BTH001',
  'rifim balikpapan': 'BPN001',
  'rifim manado': 'MDC001',
  'rifim makassar': 'UPG001',
}

export function resolveAirportCode(raw: string): string | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase()
  return AIRPORT_ALIASES[key] ?? null
}

// ── Date normalization ─────────────────────────────────────────

const BULAN: Record<string, string> = {
  januari: '01', februari: '02', maret: '03', april: '04',
  mei: '05', juni: '06', juli: '07', agustus: '08',
  september: '09', oktober: '10', november: '11', desember: '12',
  jan: '01', feb: '02', mar: '03', apr: '04',
  may: '05', jun: '06', jul: '07', aug: '08',
  sep: '09', oct: '10', nov: '11', dec: '12',
}

// Returns ISO date string (YYYY-MM-DD) or YYYY-MM for period, or null
export function normalizeDate(raw: string): string | null {
  if (!raw) return null
  const s = raw.trim()

  // 2026-06-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // 2026-06
  if (/^\d{4}-\d{2}$/.test(s)) return s

  // 15/06/2026 or 1/6/2026
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`

  // 06/2026
  const my = /^(\d{1,2})\/(\d{4})$/.exec(s)
  if (my) return `${my[2]}-${my[1].padStart(2, '0')}`

  // "Juni 2026" / "Jun 2026"
  const indo = /^(\w+)\s+(\d{4})$/i.exec(s)
  if (indo) {
    const m = BULAN[indo[1].toLowerCase()]
    if (m) return `${indo[2]}-${m}`
  }

  // "2026/06/15"
  const iso2 = /^(\d{4})\/(\d{2})\/(\d{2})$/.exec(s)
  if (iso2) return `${iso2[1]}-${iso2[2]}-${iso2[3]}`

  // Timestamp "2026-06-15 07:00:00" or "2026-06-15T07:00:00"
  const ts = /^(\d{4}-\d{2}-\d{2})[T ]/.exec(s)
  if (ts) return ts[1]

  // Indonesian Google Forms timestamp: "3/6/2026, 01.06.43" (D/M/YYYY, HH.MM.SS)
  const idTs = /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2})\.(\d{2})\.(\d{2})$/.exec(s)
  if (idTs) {
    const [, d, m, y, h, min, sec] = idTs
    return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${h.padStart(2,'0')}:${min}:${sec}`
  }

  return null
}

// Returns "YYYY-MM" for payroll period
export function normalizePeriod(raw: string): string | null {
  const d = normalizeDate(raw)
  if (!d) return null
  return d.slice(0, 7) // "YYYY-MM"
}

// ── Currency parsing ───────────────────────────────────────────

export function parseCurrency(raw: string): number {
  if (!raw) return 0
  // Remove "Rp", dots, spaces, commas used as thousand separator
  // Handle: "Rp 1.500.000", "1,500,000", "1500000"
  const cleaned = raw
    .replace(/[Rp\s]/gi, '')
    .replace(/\./g, '')   // Indonesian thousand sep
    .replace(/,/g, '.')   // if decimal comma
    .trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

// ── Check type normalization ───────────────────────────────────

export function normalizeCheckType(raw: string): 'CHECK_IN' | 'CHECK_OUT' | null {
  const s = raw.toLowerCase().trim()
  if (['masuk', 'check_in', 'checkin', 'in', 'check in'].includes(s)) return 'CHECK_IN'
  if (['keluar', 'check_out', 'checkout', 'out', 'check out', 'pulang'].includes(s)) return 'CHECK_OUT'
  if (s.includes('masuk') || s.includes('in'))  return 'CHECK_IN'
  if (s.includes('keluar') || s.includes('out')) return 'CHECK_OUT'
  return null
}

// ── GPS parsing ────────────────────────────────────────────────

export function parseGPS(raw: string): { latitude: number; longitude: number } | null {
  if (!raw) return null
  const parts = raw.split(',').map(p => parseFloat(p.trim()))
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return { latitude: parts[0], longitude: parts[1] }
  }
  return null
}

// ── Shift normalization ────────────────────────────────────────

export function normalizeShift(raw: string): 'PAGI' | 'SIANG' | 'MALAM' | 'LIBUR' | 'CUSTOM' | null {
  const s = raw.toUpperCase().trim()
  const valid = ['PAGI', 'SIANG', 'MALAM', 'LIBUR', 'CUSTOM'] as const
  if (valid.includes(s as typeof valid[number])) return s as typeof valid[number]
  if (s.includes('PAGI') || s.includes('MORNING')) return 'PAGI'
  if (s.includes('SIANG') || s.includes('AFTERNOON')) return 'SIANG'
  if (s.includes('MALAM') || s.includes('NIGHT')) return 'MALAM'
  if (s.includes('LIBUR') || s.includes('OFF')) return 'LIBUR'
  return null
}
