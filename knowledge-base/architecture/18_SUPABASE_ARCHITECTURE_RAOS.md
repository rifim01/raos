# SUPABASE ARCHITECTURE RAOS

Versi Knowledge Base AI 2026

## TUJUAN

Menjadi arsitektur backend utama untuk:

* RAOS PWA
* Rifim AI
* Dashboard Realtime
* Payroll Engine
* Attendance Engine
* Driver Queue System
* Finance Management

---

# ARSITEKTUR UTAMA

PWA RAOS
↓
Supabase
↓
Database RAOS
↓
AI Engine
↓
Dashboard & Analytics

---

# KOMPONEN UTAMA

## FRONTEND

Platform:

* Next.js
* PWA
* TypeScript
* Tailwind CSS

Fungsi:

* Dashboard
* Absensi
* Payroll
* Driver
* Keuangan
* AI Assistant

---

## BACKEND

Platform:

Supabase

Komponen:

* PostgreSQL
* Authentication
* Realtime
* Storage
* Edge Functions
* Row Level Security

---

# AUTHENTICATION

Menggunakan:

Supabase Auth

Metode Login:

* Email & Password
* Magic Link (Opsional)

Role:

* SUPER_ADMIN
* DIRECTOR
* AIRPORT_COORDINATOR
* STAFF
* DRIVER

---

# DATABASE

Database utama:

PostgreSQL

Tabel utama:

* airports
* users
* staff
* drivers
* attendance
* payroll
* incentives
* queue
* finance
* reports
* knowledge_documents

Referensi:

Database_Schema_RAOS.md

---

# STORAGE

Supabase Storage

Bucket:

## staff-photos

Menyimpan:

* Foto profil
* Foto absensi

---

## incident-evidence

Menyimpan:

* Foto pelanggaran
* Bukti insiden

---

## payroll-documents

Menyimpan:

* Slip gaji
* Rekap payroll

---

## knowledge-base

Menyimpan:

* SOP
* Payroll
* KPI
* FAQ
* Dokumen AI

---

# REALTIME ENGINE

Menggunakan:

Supabase Realtime

Realtime untuk:

* Absensi
* Driver Online
* Antrian Driver
* Pickup Point
* Dashboard Nasional
* Dashboard Bandara

Update:

1–5 detik

---

# ATTENDANCE ENGINE

Input:

* Check In
* Check Out
* GPS
* Foto

Output:

* Attendance Table
* KPI
* Payroll

Alur:

Absensi
↓
Attendance Table
↓
KPI
↓
Payroll

---

# KPI ENGINE

Sumber Data:

* Attendance
* Pelanggaran
* Operasional
* Laporan

Output:

* KPI Staff
* KPI Koordinator
* Ranking Cabang

---

# PAYROLL ENGINE

Sumber Data:

* Attendance
* Lembur
* Alpha
* Kasbon
* Bonus

Formula:

Gapok

* Bonus
* Lembur
* BPJS
* Kuota

-

Telat

* Alpha
* Kasbon

=

Gaji Bersih

---

# DRIVER ENGINE

Mengelola:

* Driver Aktif
* Driver Tidak Aktif
* Driver Suspend
* Driver Baru

Terhubung ke:

* Queue System
* Pickup System

---

# QUEUE ENGINE

Tabel:

driver_queue

Status:

* WAITING
* CALLED
* PICKUP
* FINISHED
* HOLD

Realtime:

Ya

---

# PICKUP ENGINE

Mengelola:

* Pickup Point
* Driver Pickup
* Riwayat Pickup

Output:

* Statistik Pickup
* KPI Operasional

---

# FINANCE ENGINE

Mengelola:

* Money
* Tagihan
* Pendapatan
* Pengeluaran

Output:

* Cashflow
* Dashboard Keuangan

---

# AI ARCHITECTURE

RAOS
↓
Supabase
↓
Knowledge Base
↓
Rifim AI
↓
Jawaban & Analisis

---

# KNOWLEDGE BASE

Dokumen:

* Profil_Perusahaan.md
* Bandara.md
* SOP_Staff.md
* SOP_Koordinator.md
* SOP_Driver.md
* Payroll.md
* KPI_Kinerja.md
* AI_Assistant_RAOS.md
* AI_Commands_RAOS.md
* Role_Permission_RAOS.md

Lokasi:

knowledge-base bucket

---

# OLLAMA INTEGRATION

RAOS
↓
API Layer
↓
Ollama
↓
Qwen
↓
Knowledge Base Rifim

Model Awal:

qwen2.5:3b

Model Produksi:

qwen2.5:7b (jika server sudah memadai)

---

# MIGRASI GOOGLE SHEETS

FASE 1

Google Sheets tetap digunakan.

RAOS hanya membaca data.

---

FASE 2

Data sinkron ke Supabase.

Google Sheets menjadi backup.

---

FASE 3

Supabase menjadi database utama.

Google Sheets hanya arsip.

---

# RLS POLICY

SUPER_ADMIN

Full Access

---

DIRECTOR

Read Only Nasional

---

AIRPORT_COORDINATOR

Hanya airport_id sendiri

---

STAFF

Data sendiri

---

DRIVER

Data sendiri

---

# PUSH NOTIFICATION

Menggunakan:

* Web Push
* Firebase Messaging (Opsional)

Notifikasi:

* Terlambat
* Alpha
* Payroll
* Antrian
* Pelanggaran
* Pengumuman

---

# BACKUP

Backup Harian

Backup Mingguan

Backup Bulanan

Lokasi:

* Supabase Backup
* Google Drive Backup

---

# MONITORING

Dashboard Monitoring:

* Error Log
* API Usage
* Database Usage
* Storage Usage
* AI Usage

---

# TARGET PRODUKSI

Mendukung:

* 7+ Bandara
* 10.000+ Driver
* 500+ Staff
* Multi Cabang
* Multi Role
* AI Assistant
* Realtime Dashboard

---

# INFORMASI UNTUK AI

Jika pengguna bertanya tentang Supabase, database, migrasi data, realtime dashboard, storage, authentication, atau integrasi Ollama, gunakan dokumen ini sebagai referensi utama.
