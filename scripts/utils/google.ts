// Google Sheets API client
import { google } from 'googleapis'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

function getAuth() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_PATH

  if (keyJson) {
    return new google.auth.GoogleAuth({
      credentials: JSON.parse(keyJson),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
  }

  if (keyPath && fs.existsSync(keyPath)) {
    return new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
  }

  throw new Error(
    'Google auth tidak dikonfigurasi. Set GOOGLE_SERVICE_ACCOUNT_JSON atau GOOGLE_SERVICE_ACCOUNT_JSON_PATH di .env.local'
  )
}

export type SheetRow = Record<string, string>

export async function getSheetRows(
  spreadsheetId: string,
  sheetName: string,
  range = 'A:Z'
): Promise<{ headers: string[]; rows: SheetRow[]; rawCount: number }> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!${range}`,
  })

  const values = resp.data.values ?? []
  if (values.length < 2) return { headers: [], rows: [], rawCount: 0 }

  const headers = values[0].map(h => String(h ?? '').trim())
  const rawCount = values.length - 1

  const rows = values
    .slice(1)
    .map(row => {
      const obj: SheetRow = {}
      headers.forEach((h, i) => {
        obj[h] = String(row[i] ?? '').trim()
      })
      return obj
    })
    .filter(row => Object.values(row).some(v => v !== ''))

  return { headers, rows, rawCount }
}

export async function getSheetRowCount(
  spreadsheetId: string,
  sheetName: string
): Promise<number> {
  const { rows } = await getSheetRows(spreadsheetId, sheetName)
  return rows.length
}

export async function listSheetNames(spreadsheetId: string): Promise<string[]> {
  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })
  const resp = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties.title' })
  return (resp.data.sheets ?? []).map(s => s.properties?.title ?? '').filter(Boolean)
}
