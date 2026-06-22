# LAPORAN AUDIT FASE 1 — Staff & Driver
> Tanggal: 22/6/2026, 18.56.26
> Sumber: Google Sheets (service account: radms-importer@radms-rifim.iam.gserviceaccount.com)

## 1. MASTER DATA STAFF

**Fetch berhasil** — 28 baris ditemukan
- Baris valid: 27
- Baris kosong/tidak lengkap: 1

### 1.1 Staff per Cabang (dari Sheet)

| Cabang                      | Jumlah | Jabatan (ringkasan)                     |
| --------------------------- | ------ | --------------------------------------- |
| ID Rifim Airport Jambi      | 3      | STAFF KONTER, KOORDINATOR               |
| ID Rifim Airport Pekanbaru  | 5      | STAFF KONTER, PICKUP POINT, KOORDINATOR |
| ID Rifim Airport Balikpapan | 4      | PICKUP POINT, STAFF KONTER, KOORDINATOR |
| ID Rifim Airport Batam      | 7      | STAFF KONTER, PICKUP POINT              |
| ID Rifim Airport Manado     | 4      | STAFF KONTER, PICKUP POINT              |
| Admin                       | 3      | ADMIN                                   |
| ID Rifim Airport Makassar   | 1      | KOORDINATOR                             |

### 1.2 Anomali Format ID Staff
**⚠ 1 anomali ditemukan:**

| ID Staff | Nama            | Cabang                 | Catatan                     |
| -------- | --------------- | ---------------------- | --------------------------- |
| RIF01441 | Muhammad Haikal | ID Rifim Airport Batam | Format tidak sesuai RIF#### |

### 1.3 Duplikat ID Staff
**⚠ 1 ID duplikat:**
- `RIF0125`: Audra Agung pratama, Dwi Fitrianti

## 2. DRIVER AIRPORT (INTERNAL)

| Cabang             | Code   | Total baris | Valid | Baris kosong |
| ------------------ | ------ | ----------- | ----- | ------------ |
| Batam Airport      | BTH001 | 53          | 53    | 0            |
| Jambi Airport      | DJB001 | 18          | 18    | 0            |
| Makassar Airport   | UPG001 | 1           | 1     | 0            |
| Balikpapan Airport | BPN001 | 77          | 76    | 1            |
| Manado Airport     | MDC001 | 35          | 35    | 0            |
| Pekanbaru Airport  | PKU001 | 40          | 40    | 0            |

### 2.1 Duplikat ID Driver (antar cabang, internal)
**⚠ 1 ID duplikat ditemukan:**
- `212507766`: Mulyono (BPN001) | MULYONO (BPN001)

## 3. DRIVER EXTERNAL

| Cabang         | Code   | Total baris | Valid | Baris kosong |
| -------------- | ------ | ----------- | ----- | ------------ |
| Batam External | BTH001 | 133         | 133   | 0            |
| Jambi External | DJB001 | 48          | 48    | 0            |

### 3.1 ID Driver muncul di kedua sheet (Internal & External)
_Tidak ada ID yang tumpang tindih antar file._

## 4. PERBANDINGAN SUPABASE vs GOOGLE SHEETS

### 4.1 Driver Count: Sheet vs DB
| Cabang             | Sheet Internal | DB Internal | Selisih          |
| ------------------ | -------------- | ----------- | ---------------- |
| Batam Airport      | 53             | 52          | -1 (Sheet lebih) |
| Jambi Airport      | 18             | 18          | ✓                |
| Makassar Airport   | 1              | 1           | ✓                |
| Balikpapan Airport | 76             | 75          | -1 (Sheet lebih) |
| Manado Airport     | 35             | 35          | ✓                |
| Pekanbaru Airport  | 40             | 38          | -2 (Sheet lebih) |
| Batam External     | 133            | 132         | -1               |
| Jambi External     | 48             | 48          | ✓                |

### 4.2 Staff Count: Sheet vs DB
| Cabang     | Sheet Staff | DB Staff (aktif) | Selisih |
| ---------- | ----------- | ---------------- | ------- |
| Balikpapan | 4           | 4                | ✓       |
| Batam      | 7           | 10               | +3      |
| Jambi      | 3           | 3                | ✓       |
| Makassar   | 1           | 1                | ✓       |
| Manado     | 4           | 4                | ✓       |
| Pekanbaru  | 5           | 5                | ✓       |

## 5. FLAG & PERTANYAAN KLARIFIKASI UNTUK BOBBY

### 5.1 Status Makassar (UPG001)
- **Sheet Makassar** memiliki 1 driver
- **DB Supabase** memiliki 1 driver (airport status: ACTIVE)
- ⚠ **Pertanyaan:** Makassar sudah operasional atau masih persiapan staff saja?
  - Jika masih persiapan → status airport harus diubah ke `PLANNED`
  - Jika sudah aktif → data driver perlu di-sync penuh

### 5.2 Driver dengan Highlight Hitam
Highlight warna tidak dapat dibaca via Sheets API (hanya nilai sel yang diambil).
**Untuk audit ini, tidak ada driver yang dinonaktifkan berdasarkan warna.**
⚠ **Pertanyaan ke Bobby:** Apa arti baris driver dengan background hitam?
  - Opsi A: Driver resign/nonaktif → set status = INACTIVE
  - Opsi B: Driver kategori khusus (prioritas/VIP) → tambah kolom flag
  - Opsi C: Penanda visual lain (tidak ada implikasi data)

### 5.3 Anomali ID Staff
- `RIF01441` (Muhammad Haikal, ID Rifim Airport Batam): format tidak sesuai `RIF####`
  - Kemungkinan typo dari `RIF0144`
  - ⚠ **Konfirmasi dulu** sebelum auto-fix

### 5.4 Selisih Besar DB vs Sheet

## 6. RINGKASAN EKSEKUTIF

| Entitas | Total Sheet | Total DB | Match |
|---------|-------------|----------|-------|
| Driver Internal | 223 | 219 | ≈ OK |
| Driver External | 181 | 180 | ≈ OK |
| Staff | 27 | 27 | ≈ OK |

### Status Tabel Supabase yang Akan Digunakan
| Tabel | Status | Catatan |
|-------|--------|---------|
| `airports` | ✅ Sudah ada | 6 aktif + 1 PLANNED (CGK) |
| `drivers` | ✅ Sudah ada + terisi | Gunakan `driver_code` + `driver_type` sebagai key |
| `staff` | ✅ Sudah ada + terisi | Gunakan `staff_code` + `airport_id` sebagai unique |
| `sync_logs` | ❌ Belum ada | Perlu dibuat untuk audit trail sync |
| `branches` | ❌ Tidak perlu | `airports` sudah cukup — JANGAN buat tabel duplikat |

### Rekomendasi Urutan Eksekusi
1. ✅ Jawab 4 pertanyaan klarifikasi (Section 5)
2. ✅ Create tabel `sync_logs` (migration kecil)
3. ✅ Tambah kolom `source_sheet_url`, `source_gid`, `highlight_flag` ke `drivers`
4. ✅ Build cron sync (`/api/cron/sync-sheets`) — gunakan existing import lib
5. ✅ Bangun halaman `/master-data` di RAOS admin
6. ✅ Freeze Google Sheets (setelah RAOS terbukti stabil)