/**
 * RIFIM RAOS — Google Apps Script
 * Sync MASTER DATA STAFF → RAOS /api/sheets/staff-sync
 *
 * Setup:
 * 1. Buka Google Sheet "DATABASE STAFF" → tab "MASTER DATA STAFF"
 * 2. Extensions → Apps Script → paste seluruh file ini
 * 3. Isi RAOS_URL dan SYNC_KEY sesuai environment
 * 4. Jalankan setupTrigger() SEKALI untuk aktifkan auto-sync
 */

const RAOS_URL  = "https://raos-ten.vercel.app";
const SYNC_KEY  = PropertiesService.getScriptProperties().getProperty("ATTENDANCE_SYNC_KEY") || "";
const SHEET_ID  = SpreadsheetApp.getActiveSpreadsheet().getId();

// ── Kolom MASTER DATA STAFF (A=1, B=2, dst) ──────────────────────────────────
const COL = {
  EMAIL:      1, // A
  NAMA:       2, // B
  GAJI:       3, // C
  ID_CABANG:  4, // D
  STAFF_CODE: 5, // E
  JABATAN:    6, // F
  DEPOSIT:    7, // G (optional)
};

// ── Main sync function ────────────────────────────────────────────────────────
function syncMasterStaff() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("MASTER DATA STAFF");
  if (!sheet) { Logger.log("Sheet 'MASTER DATA STAFF' tidak ditemukan"); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log("Tidak ada data"); return; }

  const data = sheet.getRange(2, 1, lastRow - 1, 7).getValues();

  const rows = [];
  for (const row of data) {
    const email      = String(row[COL.EMAIL - 1] || "").trim();
    const nama       = String(row[COL.NAMA - 1] || "").trim();
    const gaji       = String(row[COL.GAJI - 1] || "").replace(/[^0-9]/g, "");
    const id_cabang  = String(row[COL.ID_CABANG - 1] || "").trim();
    const staff_code = String(row[COL.STAFF_CODE - 1] || "").trim();
    const jabatan    = String(row[COL.JABATAN - 1] || "").trim();

    if (!email || !staff_code || !nama) continue;

    rows.push({
      email,
      nama,
      staff_code,
      jabatan,
      id_cabang,
      gaji_pokok: gaji ? parseInt(gaji, 10) : null,
    });
  }

  if (rows.length === 0) { Logger.log("Tidak ada baris valid untuk disync"); return; }

  try {
    const resp = UrlFetchApp.fetch(`${RAOS_URL}/api/sheets/staff-sync`, {
      method:  "post",
      headers: { "Content-Type": "application/json", "X-Sync-Key": SYNC_KEY },
      payload: JSON.stringify({ rows }),
      muteHttpExceptions: true,
    });

    const code = resp.getResponseCode();
    const body = JSON.parse(resp.getContentText());

    if (code === 200 && body.success) {
      Logger.log(`✅ Sync berhasil: ${body.upserted} upserted, ${body.skipped} skipped`);
      if (body.errors?.length) Logger.log("⚠️ Errors: " + JSON.stringify(body.errors));
    } else {
      Logger.log(`❌ Sync gagal (${code}): ${JSON.stringify(body)}`);
    }
  } catch (e) {
    Logger.log("❌ Network error: " + e.message);
  }
}

// ── Sync Absensi (ABSENSI sheet) ke /api/attendance/sync ─────────────────────
function syncAbsensi() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("ABSENSI");
  if (!sheet) { Logger.log("Sheet 'ABSENSI' tidak ditemukan"); return; }

  // Ambil baris absensi HARI INI yang belum di-sync (kolom status = kosong)
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // Kolom ABSENSI: A=Tanggal B=StaffCode C=Nama D=Cabang E=CheckType F=Lat G=Lon H=Foto I=Status
  const data = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
  const today = Utilities.formatDate(new Date(), "Asia/Jakarta", "yyyy-MM-dd");

  for (let i = 0; i < data.length; i++) {
    const row       = data[i];
    const tanggal   = row[0] ? Utilities.formatDate(new Date(row[0]), "Asia/Jakarta", "yyyy-MM-dd") : "";
    const staffCode = String(row[1] || "").trim();
    const nama      = String(row[2] || "").trim();
    const cabang    = String(row[3] || "").trim();
    const checkType = String(row[4] || "").trim().toUpperCase();
    const lat       = row[5] ? parseFloat(row[5]) : null;
    const lon       = row[6] ? parseFloat(row[6]) : null;
    const synced    = String(row[8] || "").trim();

    if (tanggal !== today) continue;
    if (synced === "SYNCED") continue;
    if (!staffCode || !checkType || !cabang) continue;

    const airportCode = cabangToAirportCode(cabang);
    if (!airportCode) continue;

    try {
      const resp = UrlFetchApp.fetch(`${RAOS_URL}/api/attendance/sync`, {
        method:  "post",
        headers: { "Content-Type": "application/json", "X-Sync-Key": SYNC_KEY },
        payload: JSON.stringify({
          staff_code:   staffCode,
          nama:         nama,
          airport_code: airportCode,
          check_type:   checkType === "MASUK" ? "CHECK_IN" : "CHECK_OUT",
          latitude:     lat,
          longitude:    lon,
          tanggal:      tanggal,
        }),
        muteHttpExceptions: true,
      });

      const code = resp.getResponseCode();
      // Tandai baris sebagai SYNCED atau ERROR
      sheet.getRange(i + 2, 9).setValue(code === 200 ? "SYNCED" : `ERROR_${code}`);
    } catch (e) {
      sheet.getRange(i + 2, 9).setValue("ERROR_NETWORK");
    }

    Utilities.sleep(200); // hindari rate limit
  }

  Logger.log("✅ Sync absensi selesai");
}

// ── Mapping nama cabang → airport code ───────────────────────────────────────
function cabangToAirportCode(cabang) {
  const map = {
    "ID Rifim Airport Batam":      "BTH001",
    "ID Rifim Airport Jambi":      "DJB001",
    "ID Rifim Airport Makassar":   "UPG001",
    "ID Rifim Airport Balikpapan": "BPN001",
    "ID Rifim Airport Manado":     "MDC001",
    "ID Rifim Airport Pekanbaru":  "PKU001",
    "Batam":      "BTH001",
    "Jambi":      "DJB001",
    "Makassar":   "UPG001",
    "Balikpapan": "BPN001",
    "Manado":     "MDC001",
    "Pekanbaru":  "PKU001",
  };
  return map[cabang] || null;
}

// ── Setup trigger (jalankan SEKALI) ──────────────────────────────────────────
function setupTrigger() {
  // Hapus semua trigger lama
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  // Sync staff setiap hari jam 06:00 WIB
  ScriptApp.newTrigger("syncMasterStaff")
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  // Sync absensi setiap 15 menit
  ScriptApp.newTrigger("syncAbsensi")
    .timeBased()
    .everyMinutes(15)
    .create();

  // Sync saat sheet diedit
  ScriptApp.newTrigger("onSheetEdit")
    .forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet())
    .onEdit()
    .create();

  Logger.log("✅ Triggers aktif: syncMasterStaff (harian 06:00), syncAbsensi (15 menit), onSheetEdit");
}

// ── Trigger onEdit: sync staff jika tab MASTER DATA STAFF diedit ─────────────
function onSheetEdit(e) {
  if (!e || !e.source) return;
  const sheetName = e.source.getActiveSheet().getName();
  if (sheetName === "MASTER DATA STAFF") {
    // Debounce: set cache agar tidak trigger berkali-kali dalam 10 detik
    const cache = CacheService.getScriptCache();
    if (cache.get("staff_sync_pending")) return;
    cache.put("staff_sync_pending", "1", 10);
    syncMasterStaff();
  }
  if (sheetName === "ABSENSI") {
    syncAbsensi();
  }
}

// ── Test: jalankan manual dari Apps Script editor ─────────────────────────────
function testSync() {
  Logger.log("=== TEST SYNC MASTER STAFF ===");
  syncMasterStaff();
  Logger.log("=== SELESAI ===");
}
