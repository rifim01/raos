// Airport aliases + row normalization (mirrors scripts/utils/mapper.ts)

const AIRPORT_ALIASES: Record<string, string> = {
  jambi: "DJB001",
  pekanbaru: "PKU001",
  batam: "BTH001",
  balikpapan: "BPN001",
  manado: "MDC001",
  makassar: "UPG001",
  tangerang: "CGK001",
  cgk: "CGK001",
  cgk001: "CGK001",
  djb: "DJB001",
  djb001: "DJB001",
  pku: "PKU001",
  pku001: "PKU001",
  bth: "BTH001",
  bth001: "BTH001",
  bpn: "BPN001",
  bpn001: "BPN001",
  mdc: "MDC001",
  mdc001: "MDC001",
  upg: "UPG001",
  upg001: "UPG001",
  riau: "PKU001",
  "kepulauan riau": "BTH001",
  kaltim: "BPN001",
  sulut: "MDC001",
  sulsel: "UPG001",
  "id rifim airport jambi": "DJB001",
  "id rifim airport pekanbaru": "PKU001",
  "id rifim airport batam": "BTH001",
  "id rifim airport balikpapan": "BPN001",
  "id rifim airport manado": "MDC001",
  "id rifim airport makassar": "UPG001",
  "id rifim jambi": "DJB001",
  "id rifim jambi luar": "DJB001",
  "id rifim pekanbaru": "PKU001",
  "id rifim batam": "BTH001",
  "id rifim balikpapan": "BPN001",
  "id rifim manado": "MDC001",
  "id rifim makassar": "UPG001",
  "rifim jambi": "DJB001",
  "rifim pekanbaru": "PKU001",
  "rifim batam": "BTH001",
  "rifim balikpapan": "BPN001",
  "rifim manado": "MDC001",
  "rifim makassar": "UPG001",
};

/** Fallback UUIDs when airports table is unreachable */
export const AIRPORT_FALLBACK: Record<string, string> = {
  BPN001: "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  BTH001: "1325804e-8dd5-458e-a782-80a231a09303",
  DJB001: "2669bd67-290d-4aa1-805f-540951592b2a",
  MDC001: "0587c176-e85f-4c7b-a2be-0e255e158612",
  PKU001: "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  UPG001: "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  CGK001: "e7c34a55-86d7-4693-a02e-7b4426420ad8",
  BATAM: "1325804e-8dd5-458e-a782-80a231a09303",
  JAMBI: "2669bd67-290d-4aa1-805f-540951592b2a",
  MAKASSAR: "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  BALIKPAPAN: "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  MANADO: "0587c176-e85f-4c7b-a2be-0e255e158612",
  PEKANBARU: "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
};

export function resolveAirportCode(raw: string): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (AIRPORT_ALIASES[key]) return AIRPORT_ALIASES[key];
  const upper = raw.trim().toUpperCase();
  if (/^[A-Z]{3}\d{3}$/.test(upper)) return upper;
  if (AIRPORT_FALLBACK[upper]) return upper;
  return null;
}

export function parseCurrency(raw: string): number {
  if (!raw) return 0;
  const cleaned = raw
    .replace(/[Rp\s]/gi, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function toTitleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function sanitizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return "+62" + digits.slice(1);
  if (digits.startsWith("62")) return "+" + digits;
  return digits ? "+62" + digits : "";
}

export function findCol(headers: string[], candidates: string[]): string | null {
  const headerSet = new Set(headers);
  for (const c of candidates) {
    if (headerSet.has(c)) return c;
  }
  const lowerMap = new Map(headers.map((h) => [h.toLowerCase(), h]));
  for (const c of candidates) {
    const hit = lowerMap.get(c.toLowerCase());
    if (hit) return hit;
  }
  return null;
}
