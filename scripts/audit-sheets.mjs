/**
 * FASE 1 AUDIT — Google Sheets → Supabase
 * Fetch semua sheet, bandingkan dengan DB, laporkan anomali
 * Run: node scripts/audit-sheets.mjs
 */

import { google } from "googleapis";
import { readFileSync, writeFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SA = JSON.parse(readFileSync(path.join(__dirname, "../google-service-account.json"), "utf8"));

// ── Supabase (service role key from .env.local) ──────────────────────────────
import { config } from "dotenv";
config({ path: path.join(__dirname, "../.env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── Google Sheets Auth ────────────────────────────────────────────────────────
const auth = new google.auth.GoogleAuth({
  credentials: SA,
  scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
});
const sheets = google.sheets({ version: "v4", auth });

async function fetchSheet(spreadsheetId, range) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const rows = res.data.values || [];
  if (rows.length === 0) return [];
  const [headers, ...data] = rows;
  return data.map((row) =>
    Object.fromEntries(headers.map((h, i) => [h?.trim() ?? `col_${i}`, row[i]?.trim() ?? ""]))
  );
}

// ── Source definitions ────────────────────────────────────────────────────────
const STAFF_SHEET_ID   = "1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw";
const DRIVER_INT_ID    = "1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc";
const DRIVER_EXT_ID    = "1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc";

const DRIVER_INT_TABS = {
  BTH001: { gid: "198439898",  tab: "ID Rifim Airport Batam",      label: "Batam Airport" },
  DJB001: { gid: "180760202",  tab: "ID Rifim Airport Jambi",      label: "Jambi Airport" },
  UPG001: { gid: "2145251861", tab: "ID Rifim Airport Makassar",   label: "Makassar Airport" },
  BPN001: { gid: "717116103",  tab: "ID Rifim Airport Balikpapan", label: "Balikpapan Airport" },
  MDC001: { gid: "1905281204", tab: "ID Rifim Airport Manado",     label: "Manado Airport" },
  PKU001: { gid: "466122581",  tab: "ID Rifim Airport Pekanbaru",  label: "Pekanbaru Airport" },
};

const DRIVER_EXT_TABS = {
  BTH001: { tab: "ID Rifim Batam",     label: "Batam External" },
  DJB001: { tab: "ID Rifim Jambi Luar", label: "Jambi External" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const isBlank = (v) => !v || v.trim() === "";

function tbl(rows, cols) {
  const widths = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)));
  const sep = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
  const header = "| " + cols.map((c, i) => c.padEnd(widths[i])).join(" | ") + " |";
  const body = rows.map((r) => "| " + cols.map((c, i) => String(r[c] ?? "").padEnd(widths[i])).join(" | ") + " |").join("\n");
  return [header, sep, body].join("\n");
}

// ── Main Audit ────────────────────────────────────────────────────────────────
async function main() {
  const lines = [];
  const log = (...args) => { console.log(...args); lines.push(args.join(" ")); };

  log("# LAPORAN AUDIT FASE 1 — Staff & Driver");
  log(`> Tanggal: ${new Date().toLocaleString("id-ID")}`);
  log(`> Sumber: Google Sheets (service account: ${SA.client_email})`);
  log("");

  // ── 1. FETCH STAFF SHEET ─────────────────────────────────────────────────
  log("## 1. MASTER DATA STAFF");
  log("");

  let staffRows = [];
  try {
    staffRows = await fetchSheet(STAFF_SHEET_ID, "MASTER DATA STAFF!A:G");
    log(`**Fetch berhasil** — ${staffRows.length} baris ditemukan`);
  } catch (e) {
    log(`**ERROR fetch staff:** ${e.message}`);
  }

  // Filter baris kosong
  const staffValid = staffRows.filter(r => !isBlank(r["Nama"]) && !isBlank(r["ID Staff"]));
  const staffEmpty = staffRows.filter(r => isBlank(r["Nama"]) || isBlank(r["ID Staff"]));
  log(`- Baris valid: ${staffValid.length}`);
  log(`- Baris kosong/tidak lengkap: ${staffEmpty.length}`);
  log("");

  // Duplicate check
  const staffByCode = {};
  for (const r of staffValid) {
    const code = (r["ID Staff"] ?? "").trim();
    if (!staffByCode[code]) staffByCode[code] = [];
    staffByCode[code].push(r);
  }
  const staffDupes = Object.entries(staffByCode).filter(([, rows]) => rows.length > 1);

  // Anomali format ID (harusnya RIFxxxx, 7 karakter total)
  const staffIdPattern = /^RIF\d{4}$/;
  const staffIdAnomalies = staffValid.filter(r => {
    const id = (r["ID Staff"] ?? "").trim();
    return id && !staffIdPattern.test(id);
  });

  // Group by cabang
  const staffByCabang = {};
  for (const r of staffValid) {
    const cab = (r["ID CABANG"] ?? r["ID Cabang"] ?? "UNKNOWN").trim();
    if (!staffByCabang[cab]) staffByCabang[cab] = [];
    staffByCabang[cab].push(r);
  }

  log("### 1.1 Staff per Cabang (dari Sheet)");
  log("");
  const staffCabangRows = Object.entries(staffByCabang).map(([cab, rows]) => ({
    Cabang: cab,
    Jumlah: rows.length,
    "Jabatan (ringkasan)": [...new Set(rows.map(r => r["Jabatan"] ?? "").filter(Boolean))].join(", "),
  }));
  log(tbl(staffCabangRows, ["Cabang", "Jumlah", "Jabatan (ringkasan)"]));
  log("");

  log("### 1.2 Anomali Format ID Staff");
  if (staffIdAnomalies.length === 0) {
    log("_Tidak ada anomali format ID Staff._");
  } else {
    log(`**⚠ ${staffIdAnomalies.length} anomali ditemukan:**`);
    log("");
    const anomRows = staffIdAnomalies.map(r => ({
      "ID Staff": r["ID Staff"] ?? "",
      Nama: r["Nama"] ?? "",
      Cabang: r["ID CABANG"] ?? r["ID Cabang"] ?? "",
      Catatan: `Format tidak sesuai RIF####`,
    }));
    log(tbl(anomRows, ["ID Staff", "Nama", "Cabang", "Catatan"]));
  }
  log("");

  log("### 1.3 Duplikat ID Staff");
  if (staffDupes.length === 0) {
    log("_Tidak ada duplikat ID Staff._");
  } else {
    log(`**⚠ ${staffDupes.length} ID duplikat:**`);
    for (const [code, rows] of staffDupes) {
      log(`- \`${code}\`: ${rows.map(r => r["Nama"]).join(", ")}`);
    }
  }
  log("");

  // ── 2. DRIVER INTERNAL ───────────────────────────────────────────────────
  log("## 2. DRIVER AIRPORT (INTERNAL)");
  log("");

  const allIntDrivers = {};
  const intSummary = [];
  const allIntCodes = [];

  for (const [code, { tab, label }] of Object.entries(DRIVER_INT_TABS)) {
    try {
      const rows = await fetchSheet(DRIVER_INT_ID, `${tab}!A:D`);
      const valid = rows.filter(r => !isBlank(r["Nama Driver"]) && !isBlank(r["ID Driver"]));
      const empty = rows.filter(r => isBlank(r["Nama Driver"]) || isBlank(r["ID Driver"]));
      allIntDrivers[code] = valid;
      allIntCodes.push(...valid.map(r => ({ code: r["ID Driver"].trim(), cabang: code, nama: r["Nama Driver"].trim() })));
      intSummary.push({
        Cabang: label, Code: code,
        "Total baris": rows.length,
        Valid: valid.length,
        "Baris kosong": empty.length,
      });
    } catch (e) {
      intSummary.push({ Cabang: label, Code: code, "Total baris": "ERROR", Valid: 0, "Baris kosong": 0 });
      log(`⚠ Gagal fetch ${label}: ${e.message}`);
    }
  }

  log(tbl(intSummary, ["Cabang", "Code", "Total baris", "Valid", "Baris kosong"]));
  log("");

  // Duplicate ID Driver across all internal
  const intById = {};
  for (const { code, cabang, nama } of allIntCodes) {
    if (!intById[code]) intById[code] = [];
    intById[code].push({ cabang, nama });
  }
  const intDupes = Object.entries(intById).filter(([, rows]) => rows.length > 1);

  log("### 2.1 Duplikat ID Driver (antar cabang, internal)");
  if (intDupes.length === 0) {
    log("_Tidak ada duplikat antar cabang._");
  } else {
    log(`**⚠ ${intDupes.length} ID duplikat ditemukan:**`);
    for (const [id, rows] of intDupes.slice(0, 20)) {
      log(`- \`${id}\`: ${rows.map(r => `${r.nama} (${r.cabang})`).join(" | ")}`);
    }
  }
  log("");

  // ── 3. DRIVER EXTERNAL ───────────────────────────────────────────────────
  log("## 3. DRIVER EXTERNAL");
  log("");

  const extSummary = [];
  const allExtCodes = [];

  for (const [code, { tab, label }] of Object.entries(DRIVER_EXT_TABS)) {
    try {
      const rows = await fetchSheet(DRIVER_EXT_ID, `${tab}!A:D`);
      const valid = rows.filter(r => !isBlank(r["Nama"]) && !isBlank(r["ID Driver"]));
      const empty = rows.filter(r => isBlank(r["Nama"]) || isBlank(r["ID Driver"]));
      allExtCodes.push(...valid.map(r => ({ code: r["ID Driver"].trim(), cabang: label, nama: r["Nama"].trim() })));
      extSummary.push({
        Cabang: label, Code: code,
        "Total baris": rows.length,
        Valid: valid.length,
        "Baris kosong": empty.length,
      });
    } catch (e) {
      extSummary.push({ Cabang: label, Code: code, "Total baris": "ERROR", Valid: 0, "Baris kosong": 0 });
      log(`⚠ Gagal fetch ${label}: ${e.message}`);
    }
  }

  log(tbl(extSummary, ["Cabang", "Code", "Total baris", "Valid", "Baris kosong"]));
  log("");

  // Cross-check Int vs Ext dupes
  const allDriverCodes = new Map();
  for (const { code, cabang, nama } of [...allIntCodes, ...allExtCodes]) {
    if (!allDriverCodes.has(code)) allDriverCodes.set(code, []);
    allDriverCodes.get(code).push({ cabang, nama });
  }
  const crossDupes = [...allDriverCodes.entries()].filter(([, rows]) => rows.length > 1 && rows.some(r => r.cabang.includes("External")) && rows.some(r => !r.cabang.includes("External")));

  log("### 3.1 ID Driver muncul di kedua sheet (Internal & External)");
  if (crossDupes.length === 0) {
    log("_Tidak ada ID yang tumpang tindih antar file._");
  } else {
    log(`**⚠ ${crossDupes.length} ID ada di kedua file:**`);
    for (const [id, rows] of crossDupes.slice(0, 10)) {
      log(`- \`${id}\`: ${rows.map(r => `${r.nama} (${r.cabang})`).join(" | ")}`);
    }
  }
  log("");

  // ── 4. PERBANDINGAN DENGAN SUPABASE ─────────────────────────────────────
  log("## 4. PERBANDINGAN SUPABASE vs GOOGLE SHEETS");
  log("");

  const { data: airports } = await supabase.from("airports").select("id, code, city, status").order("city");
  const { data: dbDrivers } = await supabase.from("drivers").select("driver_code, driver_type, airport_id, nama, status");
  const { data: dbStaff } = await supabase.from("staff").select("staff_code, jabatan, airport_id, nama, status");

  const airportById = Object.fromEntries((airports ?? []).map(a => [a.id, a]));
  const airportByCode = Object.fromEntries((airports ?? []).map(a => [a.code, a]));

  const compareRows = [];
  for (const [code, meta] of Object.entries(DRIVER_INT_TABS)) {
    const sheetCount = (allIntDrivers[code] ?? []).length;
    const dbCount = (dbDrivers ?? []).filter(d => airportById[d.airport_id]?.code === code && d.driver_type === "INTERNAL").length;
    const diff = dbCount - sheetCount;
    compareRows.push({
      Cabang: meta.label,
      "Sheet Internal": sheetCount,
      "DB Internal": dbCount,
      "Selisih": diff === 0 ? "✓" : diff > 0 ? `+${diff} (DB lebih)` : `${diff} (Sheet lebih)`,
    });
  }

  // External compare
  const sheetExtBatam = allExtCodes.filter(r => r.cabang === "Batam External").length;
  const sheetExtJambi = allExtCodes.filter(r => r.cabang === "Jambi External").length;
  const dbExtBatam = (dbDrivers ?? []).filter(d => airportById[d.airport_id]?.code === "BTH001" && d.driver_type === "EXTERNAL").length;
  const dbExtJambi = (dbDrivers ?? []).filter(d => airportById[d.airport_id]?.code === "DJB001" && d.driver_type === "EXTERNAL").length;

  compareRows.push({ Cabang: "Batam External", "Sheet Internal": sheetExtBatam, "DB Internal": dbExtBatam, "Selisih": dbExtBatam - sheetExtBatam === 0 ? "✓" : `${dbExtBatam - sheetExtBatam > 0 ? "+" : ""}${dbExtBatam - sheetExtBatam}` });
  compareRows.push({ Cabang: "Jambi External", "Sheet Internal": sheetExtJambi, "DB Internal": dbExtJambi, "Selisih": dbExtJambi - sheetExtJambi === 0 ? "✓" : `${dbExtJambi - sheetExtJambi > 0 ? "+" : ""}${dbExtJambi - sheetExtJambi}` });

  log("### 4.1 Driver Count: Sheet vs DB");
  log(tbl(compareRows, ["Cabang", "Sheet Internal", "DB Internal", "Selisih"]));
  log("");

  // Staff compare
  const staffSheetByCabangNorm = {};
  for (const [cab, rows] of Object.entries(staffByCabang)) {
    const key = cab.toLowerCase();
    const airportCode = {
      "id rifim airport batam": "BTH001",
      "id rifim airport jambi": "DJB001",
      "id rifim airport pekanbaru": "PKU001",
      "id rifim airport balikpapan": "BPN001",
      "id rifim airport manado": "MDC001",
      "id rifim airport makassar": "UPG001",
    }[key] ?? cab;
    staffSheetByCabangNorm[airportCode] = (staffSheetByCabangNorm[airportCode] ?? 0) + rows.length;
  }

  const staffCompare = [];
  for (const airport of airports ?? []) {
    if (airport.status === "PLANNED") continue;
    const sheetCount = staffSheetByCabangNorm[airport.code] ?? 0;
    const dbCount = (dbStaff ?? []).filter(s => s.airport_id === airport.id && s.status === "ACTIVE").length;
    const diff = dbCount - sheetCount;
    staffCompare.push({
      Cabang: airport.city,
      "Sheet Staff": sheetCount,
      "DB Staff (aktif)": dbCount,
      "Selisih": diff === 0 ? "✓" : diff > 0 ? `+${diff}` : `${diff}`,
    });
  }

  log("### 4.2 Staff Count: Sheet vs DB");
  log(tbl(staffCompare, ["Cabang", "Sheet Staff", "DB Staff (aktif)", "Selisih"]));
  log("");

  // ── 5. FLAGS KHUSUS ──────────────────────────────────────────────────────
  log("## 5. FLAG & PERTANYAAN KLARIFIKASI UNTUK BOBBY");
  log("");

  log("### 5.1 Status Makassar (UPG001)");
  const makassarSheet = (allIntDrivers["UPG001"] ?? []).length;
  const makassarDB = (dbDrivers ?? []).filter(d => airportById[d.airport_id]?.code === "UPG001").length;
  log(`- **Sheet Makassar** memiliki ${makassarSheet} driver`);
  log(`- **DB Supabase** memiliki ${makassarDB} driver (airport status: ACTIVE)`);
  log(`- ⚠ **Pertanyaan:** Makassar sudah operasional atau masih persiapan staff saja?`);
  log(`  - Jika masih persiapan → status airport harus diubah ke \`PLANNED\``);
  log(`  - Jika sudah aktif → data driver perlu di-sync penuh`);
  log("");

  log("### 5.2 Driver dengan Highlight Hitam");
  log("Highlight warna tidak dapat dibaca via Sheets API (hanya nilai sel yang diambil).");
  log("**Untuk audit ini, tidak ada driver yang dinonaktifkan berdasarkan warna.**");
  log("⚠ **Pertanyaan ke Bobby:** Apa arti baris driver dengan background hitam?");
  log("  - Opsi A: Driver resign/nonaktif → set status = INACTIVE");
  log("  - Opsi B: Driver kategori khusus (prioritas/VIP) → tambah kolom flag");
  log("  - Opsi C: Penanda visual lain (tidak ada implikasi data)");
  log("");

  log("### 5.3 Anomali ID Staff");
  if (staffIdAnomalies.length > 0) {
    for (const r of staffIdAnomalies) {
      log(`- \`${r["ID Staff"]}\` (${r["Nama"]}, ${r["ID CABANG"] ?? r["ID Cabang"]}): format tidak sesuai \`RIF####\``);
      log(`  - Kemungkinan typo dari \`${(r["ID Staff"] ?? "").replace(/(\d{4})\d+$/, "$1")}\``);
      log(`  - ⚠ **Konfirmasi dulu** sebelum auto-fix`);
    }
  } else {
    log("_Tidak ada anomali ID Staff._");
  }
  log("");

  log("### 5.4 Selisih Besar DB vs Sheet");
  for (const row of compareRows) {
    const diff = parseInt(String(row["Selisih"]).replace(/[^-\d]/g, "") || "0");
    if (Math.abs(diff) > 5) {
      log(`- **${row["Cabang"]}**: DB=${row["DB Internal"]}, Sheet=${row["Sheet Internal"]} → selisih ${row["Selisih"]}`);
      log(`  - Kemungkinan: data di-import manual di luar sync, atau sheet belum di-update`);
    }
  }
  log("");

  // ── 6. RINGKASAN ─────────────────────────────────────────────────────────
  log("## 6. RINGKASAN EKSEKUTIF");
  log("");

  const totalSheetInt = Object.values(allIntDrivers).reduce((s, r) => s + r.length, 0);
  const totalSheetExt = allExtCodes.length;
  const totalSheetStaff = staffValid.length;
  const totalDbInt = (dbDrivers ?? []).filter(d => d.driver_type === "INTERNAL").length;
  const totalDbExt = (dbDrivers ?? []).filter(d => d.driver_type === "EXTERNAL").length;
  const totalDbStaff = (dbStaff ?? []).filter(s => s.status === "ACTIVE").length;

  log("| Entitas | Total Sheet | Total DB | Match |");
  log("|---------|-------------|----------|-------|");
  log(`| Driver Internal | ${totalSheetInt} | ${totalDbInt} | ${Math.abs(totalDbInt - totalSheetInt) <= 5 ? "≈ OK" : "⚠ SELISIH"} |`);
  log(`| Driver External | ${totalSheetExt} | ${totalDbExt} | ${Math.abs(totalDbExt - totalSheetExt) <= 5 ? "≈ OK" : "⚠ SELISIH"} |`);
  log(`| Staff | ${totalSheetStaff} | ${totalDbStaff} | ${Math.abs(totalDbStaff - totalSheetStaff) <= 3 ? "≈ OK" : "⚠ SELISIH"} |`);
  log("");

  log("### Status Tabel Supabase yang Akan Digunakan");
  log("| Tabel | Status | Catatan |");
  log("|-------|--------|---------|");
  log("| `airports` | ✅ Sudah ada | 6 aktif + 1 PLANNED (CGK) |");
  log("| `drivers` | ✅ Sudah ada + terisi | Gunakan `driver_code` + `driver_type` sebagai key |");
  log("| `staff` | ✅ Sudah ada + terisi | Gunakan `staff_code` + `airport_id` sebagai unique |");
  log("| `sync_logs` | ❌ Belum ada | Perlu dibuat untuk audit trail sync |");
  log("| `branches` | ❌ Tidak perlu | `airports` sudah cukup — JANGAN buat tabel duplikat |");
  log("");

  log("### Rekomendasi Urutan Eksekusi");
  log("1. ✅ Jawab 4 pertanyaan klarifikasi (Section 5)");
  log("2. ✅ Create tabel `sync_logs` (migration kecil)");
  log("3. ✅ Tambah kolom `source_sheet_url`, `source_gid`, `highlight_flag` ke `drivers`");
  log("4. ✅ Build cron sync (`/api/cron/sync-sheets`) — gunakan existing import lib");
  log("5. ✅ Bangun halaman `/master-data` di RAOS admin");
  log("6. ✅ Freeze Google Sheets (setelah RAOS terbukti stabil)");

  // ── Save report ───────────────────────────────────────────────────────────
  const report = lines.join("\n");
  const outPath = path.join(__dirname, "audit-report.md");
  writeFileSync(outPath, report, "utf8");
  console.log(`\n✅ Laporan disimpan ke: ${outPath}`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
