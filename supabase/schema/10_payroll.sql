-- ============================================================
-- RAOS ENTERPRISE — 10_payroll.sql
-- Payroll + Payroll Items
-- Formula: gaji_bersih = gaji_pokok + bpjs + kuota + bonus + lembur
--                       - kasbon - denda_telat - potongan_alpha - deposit
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: payroll
-- ────────────────────────────────────────────────────────────
CREATE TABLE payroll (
  id              UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID           NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  periode         VARCHAR(7)     NOT NULL,        -- 'YYYY-MM'
  periode_bulan   SMALLINT       NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun   INTEGER        NOT NULL CHECK (periode_tahun >= 2020),

  -- Pendapatan
  gaji_pokok      NUMERIC(15,2)  NOT NULL DEFAULT 0,
  bpjs            NUMERIC(15,2)  NOT NULL DEFAULT 0,
  kuota           NUMERIC(15,2)  NOT NULL DEFAULT 0,
  bonus           NUMERIC(15,2)  NOT NULL DEFAULT 0,
  lembur          NUMERIC(15,2)  NOT NULL DEFAULT 0,

  -- Potongan
  kasbon          NUMERIC(15,2)  NOT NULL DEFAULT 0,
  denda_telat     NUMERIC(15,2)  NOT NULL DEFAULT 0,
  potongan_alpha  NUMERIC(15,2)  NOT NULL DEFAULT 0,
  deposit         NUMERIC(15,2)  NOT NULL DEFAULT 0,

  -- Kalkulasi otomatis (GENERATED ALWAYS)
  total_pendapatan NUMERIC(15,2) GENERATED ALWAYS AS
    (gaji_pokok + bpjs + kuota + bonus + lembur) STORED,

  total_potongan  NUMERIC(15,2)  GENERATED ALWAYS AS
    (kasbon + denda_telat + potongan_alpha + deposit) STORED,

  gaji_bersih     NUMERIC(15,2)  GENERATED ALWAYS AS
    (gaji_pokok + bpjs + kuota + bonus + lembur
     - kasbon - denda_telat - potongan_alpha - deposit) STORED,

  -- Statistik kehadiran
  total_hadir     INTEGER        NOT NULL DEFAULT 0,
  total_terlambat INTEGER        NOT NULL DEFAULT 0,
  total_alpha     INTEGER        NOT NULL DEFAULT 0,
  jam_lembur      NUMERIC(6,2)   NOT NULL DEFAULT 0,

  -- Meta
  status          payroll_status NOT NULL DEFAULT 'DRAFT',
  approved_by     UUID           REFERENCES users(id),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_payroll_periode UNIQUE (staff_id, periode),
  CONSTRAINT chk_payroll_gaji   CHECK (gaji_pokok >= 0),
  CONSTRAINT chk_payroll_bersih CHECK (gaji_bersih >= -9999999)  -- boleh negatif (potongan > gaji)
);

COMMENT ON TABLE payroll IS 'Slip gaji bulanan — gaji_bersih = pendapatan - potongan';

CREATE INDEX idx_payroll_staff   ON payroll(staff_id);
CREATE INDEX idx_payroll_periode ON payroll(periode);
CREATE INDEX idx_payroll_status  ON payroll(status);
CREATE INDEX idx_payroll_year    ON payroll(periode_tahun, periode_bulan);

-- ────────────────────────────────────────────────────────────
-- TABLE: payroll_items (rincian komponen non-standar)
-- ────────────────────────────────────────────────────────────
CREATE TABLE payroll_items (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id  UUID              NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  item_name   TEXT              NOT NULL,
  item_type   payroll_item_type NOT NULL,
  amount      NUMERIC(15,2)     NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_item_amount CHECK (amount >= 0)
);

CREATE INDEX idx_payroll_items_payroll ON payroll_items(payroll_id);
