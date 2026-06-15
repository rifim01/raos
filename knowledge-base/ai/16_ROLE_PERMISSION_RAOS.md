# ROLE PERMISSION RAOS

Versi Knowledge Base AI 2026

## TUJUAN

Mengatur hak akses seluruh pengguna dalam sistem RAOS.

Prinsip:

* Least Privilege Access
* Role Based Access Control (RBAC)
* Data Security
* Multi Airport Management

---

# ROLE HIERARCHY

SUPER_ADMIN
↓
DIRECTOR
↓
AIRPORT_COORDINATOR
↓
STAFF
↓
DRIVER

---

# SUPER_ADMIN

## DESKRIPSI

Administrator tertinggi sistem.

Memiliki akses penuh terhadap seluruh data dan konfigurasi RAOS.

---

## HAK AKSES

Dashboard Nasional

✓ View
✓ Create
✓ Edit
✓ Delete

---

Bandara

✓ Semua Bandara

---

Staff

✓ Semua Staff

---

Koordinator

✓ Semua Koordinator

---

Driver

✓ Semua Driver

---

Absensi

✓ Full Access

---

Payroll

✓ Full Access

---

KPI

✓ Full Access

---

Keuangan

✓ Full Access

---

AI Assistant

✓ Full Access

---

Pengaturan Sistem

✓ Full Access

---

## MENU YANG MUNCUL

* Dashboard Nasional
* SDM
* Driver
* Bandara
* Operasional
* Keuangan
* Payroll
* KPI
* Laporan
* AI Assistant
* Pengaturan

---

# DIRECTOR

## DESKRIPSI

Pimpinan perusahaan.

Fokus pada pengawasan, analisa, dan pengambilan keputusan.

---

## HAK AKSES

Dashboard Nasional

✓ View

---

Bandara

✓ View Semua

---

SDM

✓ View Semua

---

Driver

✓ View Semua

---

Absensi

✓ View Semua

---

Payroll

✓ View Semua

---

KPI

✓ View Semua

---

Keuangan

✓ View Semua

---

Laporan

✓ View Semua

---

AI Assistant

✓ View
✓ Analisis
✓ Prediksi

---

## TIDAK BOLEH

✗ Menghapus Data

✗ Mengubah Konfigurasi Sistem

---

## MENU YANG MUNCUL

* Dashboard Nasional
* SDM
* Driver
* Bandara
* Operasional
* Keuangan
* Payroll
* KPI
* Laporan
* AI Assistant

---

# AIRPORT_COORDINATOR

## DESKRIPSI

Penanggung jawab operasional satu bandara.

---

## HAK AKSES

Bandara Sendiri

✓ View

✓ Edit

---

Staff Bandara Sendiri

✓ View

✓ Create

✓ Edit

---

Driver Bandara Sendiri

✓ View

✓ Edit

---

Absensi Bandara Sendiri

✓ View

✓ Approve

---

KPI Bandara Sendiri

✓ View

---

Payroll Bandara Sendiri

✓ View

---

Laporan Operasional

✓ Create

✓ View

---

AI Assistant

✓ Analisis Bandara Sendiri

---

## TIDAK BOLEH

✗ Melihat Data Bandara Lain

✗ Mengakses Keuangan Nasional

✗ Mengakses Payroll Nasional

---

## MENU YANG MUNCUL

* Dashboard Bandara
* Driver
* Staff
* Absensi
* Pickup Point
* Antrian
* KPI
* Laporan
* AI Assistant

---

# STAFF

## DESKRIPSI

Petugas operasional lapangan.

---

## HAK AKSES

Profil Sendiri

✓ View

✓ Edit Terbatas

---

Absensi

✓ Check In

✓ Check Out

✓ Riwayat Sendiri

---

Jadwal Kerja

✓ View

---

Tugas Harian

✓ View

---

KPI Pribadi

✓ View

---

Bonus dan Insentif

✓ View

---

AI Assistant

✓ Tanya Data Pribadi

---

## TIDAK BOLEH

✗ Melihat Data Staff Lain

✗ Melihat Payroll Staff Lain

✗ Mengubah Data Operasional

---

## MENU YANG MUNCUL

* Dashboard
* Absensi
* Shift
* Tugas
* KPI Saya
* Bonus Saya
* AI Assistant

---

# DRIVER

## DESKRIPSI

Mitra operasional pickup point.

---

## HAK AKSES

Profil Driver

✓ View

---

Status Antrian

✓ View

---

Status Pickup

✓ View

---

Riwayat Pickup

✓ View

---

Pelanggaran Pribadi

✓ View

---

AI Assistant

✓ Tanya Informasi Operasional

---

## TIDAK BOLEH

✗ Melihat Driver Lain

✗ Melihat Payroll Staff

✗ Melihat Data Keuangan

---

## MENU YANG MUNCUL

* Dashboard Driver
* Status Antrian
* Pickup Saya
* Riwayat Pickup
* Pelanggaran Saya
* AI Assistant

---

# PERMISSION MATRIX

MODULE                    SA   DIR   COORD   STAFF   DRIVER

Dashboard Nasional        ✓     ✓      ✗       ✗       ✗

Bandara                   ✓     ✓      ✓       ✗       ✗

Staff                     ✓     ✓      ✓       ✗       ✗

Driver                    ✓     ✓      ✓       ✗       ✓

Absensi                   ✓     ✓      ✓       ✓       ✗

Payroll                   ✓     ✓      ✓       ✗       ✗

KPI                       ✓     ✓      ✓       ✓       ✗

Keuangan                  ✓     ✓      ✗       ✗       ✗

Antrian                   ✓     ✓      ✓       ✗       ✓

Pickup Point              ✓     ✓      ✓       ✓       ✓

AI Assistant              ✓     ✓      ✓       ✓       ✓

Pengaturan                ✓     ✗      ✗       ✗       ✗

---

# RLS SUPABASE

Aturan dasar:

SUPER_ADMIN

Melihat seluruh data.

---

DIRECTOR

Read Only seluruh data.

---

AIRPORT_COORDINATOR

Hanya data airport_id yang sama.

---

STAFF

Hanya data milik sendiri.

---

DRIVER

Hanya data milik sendiri.

---

# AI SECURITY

Rifim AI wajib:

* Memeriksa role pengguna.
* Memeriksa airport_id pengguna.
* Menolak data yang tidak berhak diakses.
* Menampilkan data sesuai izin.

Contoh:

Driver tidak boleh melihat payroll staff.

Staff tidak boleh melihat payroll koordinator.

Koordinator Batam tidak boleh melihat data Manado.

---

# AUDIT LOG

Setiap aktivitas penting wajib dicatat:

* Login
* Logout
* Create
* Update
* Delete
* Approval
* Payroll
* Keuangan

Field:

* user_id
* role
* action
* table_name
* timestamp

---

# INFORMASI UNTUK AI

Jika pengguna bertanya mengenai hak akses, keamanan data, role pengguna, atau batasan akses sistem RAOS, gunakan dokumen ini sebagai referensi utama.
