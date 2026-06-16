-- ============================================================
-- RAOS ENTERPRISE — 06_staff.sql
-- Staff + Kasbon + Staff Schedule
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: staff
-- ────────────────────────────────────────────────────────────
CREATE TABLE staff (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID        NOT NULL REFERENCES airports(id),
  user_id     UUID        REFERENCES users(id) ON DELETE SET NULL,
  staff_code  TEXT        NOT NULL,
  nama        TEXT        NOT NULL,
  email       TEXT,
  jabatan     TEXT        NOT NULL,
  department  TEXT,
  gaji_pokok  NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_nominal NUMERIC(15,2) NOT NULL DEFAULT 0,
  kuota_nominal NUMERIC(15,2) NOT NULL DEFAULT 0,
  deposit     NUMERIC(15,2) NOT NULL DEFAULT 0,
  join_date   DATE,
  photo_url   TEXT,
  status      staff_status NOT NULL DEFAULT 'ACTIVE',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_staff_code UNIQUE (airport_id, staff_code),
  CONSTRAINT chk_staff_gaji   CHECK (gaji_pokok  >= 0),
  CONSTRAINT chk_staff_deposit CHECK (deposit    >= 0)
);

COMMENT ON TABLE staff IS 'Master data staff per bandara';

CREATE INDEX idx_staff_airport  ON staff(airport_id);
CREATE INDEX idx_staff_user     ON staff(user_id);
CREATE INDEX idx_staff_status   ON staff(status);
CREATE INDEX idx_staff_jabatan  ON staff(jabatan);

-- ────────────────────────────────────────────────────────────
-- TABLE: kasbon
-- ────────────────────────────────────────────────────────────
CREATE TABLE kasbon (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id          UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  airport_id        UUID        NOT NULL REFERENCES airports(id),
  jumlah            NUMERIC(15,2) NOT NULL,
  sisa              NUMERIC(15,2) NOT NULL,
  cicilan_per_bulan NUMERIC(15,2) NOT NULL,
  tujuan            TEXT,
  tanggal           DATE        NOT NULL DEFAULT CURRENT_DATE,
  status            record_status NOT NULL DEFAULT 'ACTIVE',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_kasbon_jumlah CHECK (jumlah > 0),
  CONSTRAINT chk_kasbon_sisa   CHECK (sisa   >= 0)
);

CREATE INDEX idx_kasbon_staff   ON kasbon(staff_id);
CREATE INDEX idx_kasbon_status  ON kasbon(status);
CREATE INDEX idx_kasbon_airport ON kasbon(airport_id);

-- ────────────────────────────────────────────────────────────
-- TABLE: staff_schedule
-- ────────────────────────────────────────────────────────────
CREATE TABLE staff_schedule (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    UUID        NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  tanggal     DATE        NOT NULL,
  shift       shift_type  NOT NULL,
  jam_masuk   TIME,
  jam_keluar  TIME,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_schedule UNIQUE (staff_id, tanggal)
);

CREATE INDEX idx_schedule_staff   ON staff_schedule(staff_id);
CREATE INDEX idx_schedule_tanggal ON staff_schedule(tanggal);
CREATE INDEX idx_schedule_shift   ON staff_schedule(shift);

-- ────────────────────────────────────────────────────────────
-- TABLE: shift_config (referensi jam default per shift)
-- ────────────────────────────────────────────────────────────
CREATE TABLE shift_config (
  id              SERIAL  PRIMARY KEY,
  shift           TEXT    NOT NULL UNIQUE CHECK (shift IN ('PAGI','SIANG','MALAM')),
  jam_masuk       TIME    NOT NULL,
  jam_keluar      TIME    NOT NULL,
  toleransi_menit INTEGER NOT NULL DEFAULT 15
);

INSERT INTO shift_config (shift, jam_masuk, jam_keluar, toleransi_menit) VALUES
  ('PAGI',  '07:00', '15:00', 15),
  ('SIANG', '15:00', '23:00', 15),
  ('MALAM', '23:00', '07:00', 15)
ON CONFLICT (shift) DO NOTHING;
