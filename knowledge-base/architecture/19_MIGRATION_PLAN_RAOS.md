# MIGRATION PLAN RAOS

Versi Knowledge Base AI 2026

## TUJUAN

Melakukan migrasi seluruh sistem PT Rifim Gemilang ke RAOS tanpa mengganggu operasional bandara yang sedang berjalan.

Prinsip:

* Zero Downtime
* Data Safety
* Gradual Migration
* Reversible Process

---

# KONDISI SAAT INI

## APLIKASI AKTIF

1. Rifim Attendance
2. Admin Absensi
3. RADMS Driver
4. RADMS Payroll
5. RADMS Dashboard

Semua aplikasi masih digunakan operasional harian.

---

# SUMBER DATA AKTIF

## SDM

MASTER DATA STAFF

---

## DRIVER

Database Driver Airport

Database Driver External

---

## ABSENSI

RIFIM ERP ABSENSI

---

## PAYROLL

RIFIM PAYROLL

---

## KEUANGAN

Money

Tagihan

Pendapatan Luar

---

# TARGET AKHIR

Semua data terpusat di:

RAOS
↓
Supabase
↓
Rifim AI

Google Sheets menjadi:

Backup dan Arsip

---

# FASE 0

PERSIAPAN

Durasi:

1 Minggu

Tujuan:

Inventarisasi seluruh data.

Aktivitas:

* Audit seluruh Google Sheet.
* Audit seluruh aplikasi.
* Audit seluruh user.
* Audit seluruh role.
* Audit seluruh form.

Output:

Dokumen Mapping Data.

Status:

Wajib selesai sebelum coding.

---

# FASE 1

DATABASE FOUNDATION

Durasi:

1 Minggu

Tujuan:

Membangun struktur database Supabase.

Aktivitas:

* Membuat seluruh tabel.
* Membuat relasi.
* Membuat role.
* Membuat RLS.

Output:

Supabase siap digunakan.

Status:

Belum ada migrasi data.

---

# FASE 2

MIGRASI MASTER DATA

Durasi:

1 Minggu

Tujuan:

Memindahkan data statis.

Migrasi:

* Airports
* Users
* Staff
* Koordinator

Validasi:

* Jumlah data sama.
* Tidak ada duplikasi.
* Role sesuai.

Output:

Master data aktif di Supabase.

---

# FASE 3

MIGRASI DRIVER

Durasi:

1 Minggu

Migrasi:

* Driver Airport
* Driver External

Validasi:

* Driver aktif
* Driver nonaktif
* Driver suspend

Output:

Database Driver terpusat.

---

# FASE 4

MIGRASI ABSENSI

Durasi:

1 Minggu

Migrasi:

* Users
* Absensi
* Jadwal Kerja

Strategi:

Dual System

Absensi lama tetap berjalan.

RAOS mulai membaca data.

Output:

Attendance Engine aktif.

---

# FASE 5

MIGRASI PAYROLL

Durasi:

1 Minggu

Migrasi:

* Payroll
* Lembur
* Kasbon
* Cuti
* Bonus

Strategi:

Shadow Payroll

Payroll dihitung oleh:

* Sistem Lama
* RAOS

Kemudian dibandingkan.

Target:

Selisih maksimal 0%.

Output:

Payroll Engine tervalidasi.

---

# FASE 6

MIGRASI KEUANGAN

Durasi:

1 Minggu

Migrasi:

* Money
* Tagihan
* Pendapatan Luar

Validasi:

* Total pemasukan
* Total pengeluaran
* Cashflow

Output:

Finance Engine aktif.

---

# FASE 7

MIGRASI OPERASIONAL

Durasi:

2 Minggu

Migrasi:

* Queue Management
* Pickup Point
* Monitoring Driver

Strategi:

Pilot Project

Bandara pertama:

Batam

Alasan:

Operasional terbesar.

Output:

Driver Engine aktif.

---

# FASE 8

AI INTEGRATION

Durasi:

1 Minggu

Integrasi:

RAOS
↓
Supabase
↓
Knowledge Base
↓
Rifim AI

Kemampuan:

* KPI Analysis
* Payroll Analysis
* Driver Analysis
* Financial Analysis

Output:

AI Assistant aktif.

---

# FASE 9

GO LIVE CABANG

Urutan:

1. Batam
2. Jambi
3. Pekanbaru
4. Balikpapan
5. Manado
6. Makassar
7. Soekarno-Hatta

Metode:

Per Bandara

Bukan nasional sekaligus.

---

# FASE 10

DEKOMISIONING

Aplikasi lama:

* Attendance Lama
* Admin Absensi Lama
* RADMS Driver Lama
* RADMS Payroll Lama
* RADMS Dashboard Lama

Status:

Read Only

Kemudian:

Arsip

---

# STRATEGI BACKUP

## Harian

Database Backup

---

## Mingguan

Full Backup

---

## Bulanan

Snapshot Backup

---

Lokasi:

* Supabase Backup
* Google Drive Backup

---

# STRATEGI ROLLBACK

Jika terjadi masalah:

1. Nonaktifkan fitur baru.
2. Kembalikan ke aplikasi lama.
3. Restore backup.
4. Audit masalah.
5. Uji ulang.

Target:

Recovery kurang dari 2 jam.

---

# UJI COBA WAJIB

## Data Test

* Staff
* Driver
* Absensi
* Payroll

---

## User Test

* Director
* Admin
* Koordinator
* Staff
* Driver

---

## Airport Test

* Batam
* Jambi
* Pekanbaru

---

# KPI MIGRASI

Target keberhasilan:

* Data Valid ≥ 99%
* Downtime = 0
* Payroll Error < 1%
* User Adoption > 90%
* AI Accuracy > 90%

---

# TIM IMPLEMENTASI

Direktur

↓

Project Owner

↓

Developer

↓

Koordinator Bandara

↓

Staff Pilot Project

---

# PRIORITAS IMPLEMENTASI

Prioritas 1

* Login
* Role
* Dashboard

Prioritas 2

* Absensi
* SDM

Prioritas 3

* Payroll

Prioritas 4

* Driver

Prioritas 5

* Keuangan

Prioritas 6

* AI Assistant

---

# INFORMASI UNTUK AI

Jika pengguna bertanya mengenai migrasi sistem, perpindahan data, implementasi RAOS, cutover, rollback, validasi data, atau roadmap go-live, gunakan dokumen ini sebagai referensi utama.
