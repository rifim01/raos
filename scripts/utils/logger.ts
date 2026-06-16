// Logger + migration report generator
import * as fs from 'fs'
import * as path from 'path'

export interface MigrationStat {
  table: string
  sheet_name: string
  sheets_count: number
  supabase_count: number
  inserted: number
  failed: number
  timestamp: string
}

const LOGS_DIR = path.join(process.cwd(), 'scripts', 'logs')
const REPORT_PATH = path.join(process.cwd(), 'migration_report.json')

function ensureLogsDir() {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

export class Logger {
  private logPath: string
  public errors: string[] = []
  public warnings: string[] = []

  constructor(public name: string) {
    ensureLogsDir()
    this.logPath = path.join(LOGS_DIR, `${name}-${Date.now()}.log`)
  }

  private write(level: string, msg: string, color?: string) {
    const line = `[${level}] ${new Date().toISOString()}  ${msg}`
    const colored = color ? `${color}${line}\x1b[0m` : line
    console.log(colored)
    fs.appendFileSync(this.logPath, line + '\n')
  }

  info(msg: string)  { this.write('INFO ', msg) }
  warn(msg: string)  {
    this.write('WARN ', msg, '\x1b[33m')
    this.warnings.push(msg)
  }
  error(msg: string, err?: unknown) {
    const detail = err instanceof Error ? err.message : String(err ?? '')
    const full = detail ? `${msg} — ${detail}` : msg
    this.write('ERROR', full, '\x1b[31m')
    this.errors.push(full)
  }
  success(msg: string) { this.write('OK   ', msg, '\x1b[32m') }

  summary(total: number, success: number) {
    const failed = total - success
    const status = failed === 0 ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'
    console.log(`\n${status} [${this.name}] total=${total}  sukses=${success}  gagal=${failed}`)
    if (this.warnings.length) console.log(`   ⚠ ${this.warnings.length} peringatan`)
    if (this.errors.length)   console.log(`   ✗ ${this.errors.length} error — lihat: ${this.logPath}`)
    console.log()
  }
}

export function saveReport(stat: MigrationStat) {
  let report: MigrationStat[] = []
  if (fs.existsSync(REPORT_PATH)) {
    try { report = JSON.parse(fs.readFileSync(REPORT_PATH, 'utf-8')) } catch { /* ok */ }
  }
  report = report.filter(r => r.table !== stat.table)
  report.push(stat)
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  console.log(`📄 Report diperbarui: ${REPORT_PATH}`)
}

export function printBanner(title: string) {
  console.log('\n' + '═'.repeat(52))
  console.log(`  🚀 RAOS Migration — ${title}`)
  console.log('═'.repeat(52) + '\n')
}
