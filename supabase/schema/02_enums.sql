-- ============================================================
-- RAOS ENTERPRISE — 02_enums.sql
-- Semua PostgreSQL ENUM types
-- ============================================================

-- Airport status
CREATE TYPE airport_status AS ENUM ('ACTIVE', 'PLANNED', 'INACTIVE');

-- Role names
CREATE TYPE role_name AS ENUM (
  'SUPER_ADMIN',
  'DIRECTOR',
  'AIRPORT_COORDINATOR',
  'STAFF',
  'DRIVER'
);

-- User / Staff / Driver aktif-tidaknya
CREATE TYPE record_status AS ENUM ('ACTIVE', 'INACTIVE');

-- Staff status lebih lengkap
CREATE TYPE staff_status AS ENUM ('ACTIVE', 'INACTIVE', 'LEAVE', 'TERMINATED');

-- Driver status
CREATE TYPE driver_status AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_DUTY', 'OFF_DUTY');

-- Tipe driver
CREATE TYPE driver_type AS ENUM ('INTERNAL', 'EXTERNAL');

-- Tipe absensi
CREATE TYPE check_type AS ENUM ('CHECK_IN', 'CHECK_OUT');

-- Status validasi GPS
CREATE TYPE distance_status AS ENUM ('VALID', 'INVALID', 'UNKNOWN');

-- Shift kerja
CREATE TYPE shift_type AS ENUM ('PAGI', 'SIANG', 'MALAM', 'LIBUR', 'CUSTOM');

-- Status antrian
CREATE TYPE queue_status AS ENUM ('WAITING', 'CALLED', 'SERVING', 'DONE', 'SKIP', 'VIOLATION');

-- Status payroll
CREATE TYPE payroll_status AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'PAID');

-- Tipe item payroll
CREATE TYPE payroll_item_type AS ENUM ('PENDAPATAN', 'POTONGAN');

-- Jenis transaksi keuangan
CREATE TYPE finance_jenis AS ENUM ('PEMASUKAN', 'PENGELUARAN');

-- Status tagihan
CREATE TYPE bill_status AS ENUM ('UNPAID', 'PAID', 'OVERDUE', 'DISPUTED');

-- Kategori dokumen knowledge
CREATE TYPE knowledge_category AS ENUM (
  'SOP', 'KEBIJAKAN', 'REGULASI', 'PANDUAN', 'FAQ', 'LAPORAN', 'LAINNYA'
);

-- Tipe notifikasi
CREATE TYPE notification_type AS ENUM (
  'INFO', 'WARNING', 'SUCCESS', 'ERROR',
  'QUEUE', 'PAYROLL', 'FINANCE', 'ATTENDANCE'
);

-- Operasi audit
CREATE TYPE audit_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE');
