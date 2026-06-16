-- ============================================================
-- RAOS ENTERPRISE — 004_staff.sql
-- Staff + Kasbon
-- ============================================================

CREATE TABLE IF NOT EXISTS staff (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID NOT NULL REFERENCES airports(id),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  staff_code  TEXT NOT NULL,
  nama        TEXT NOT NULL,
  email       TEXT,
  jabatan     TEXT NOT NULL,
  department  TEXT,
  gaji_pokok  DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (gaji_pokok >= 0),
  deposit     DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (deposit >= 0),
  bpjs_nominal DECIMAL(15,2) NOT NULL DEFAULT 0,
  join_date   DATE,
  photo_url   TEXT,
  status      TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'INACTIVE', 'LEAVE', 'TERMINATED')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (airport_id, staff_code)
);

COMMENT ON TABLE staff IS 'Data master staff per bandara — mapping dari Google Sheet DATABASE STAFF';

CREATE INDEX idx_staff_airport  ON staff(airport_id);
CREATE INDEX idx_staff_status   ON staff(status);
CREATE INDEX idx_staff_user     ON staff(user_id);

CREATE TRIGGER trg_staff_updated
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TABLE: kasbon (Cash Advance)
-- ============================================================
CREATE TABLE IF NOT EXISTS kasbon (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id            UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  airport_id          UUID NOT NULL REFERENCES airports(id),
  jumlah              DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  sisa                DECIMAL(15,2) NOT NULL,
  cicilan_per_bulan   DECIMAL(15,2) NOT NULL,
  tujuan              TEXT,
  tanggal             DATE NOT NULL DEFAULT CURRENT_DATE,
  status              TEXT NOT NULL DEFAULT 'ACTIVE'
                        CHECK (status IN ('ACTIVE', 'LUNAS')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kasbon_staff    ON kasbon(staff_id);
CREATE INDEX idx_kasbon_status   ON kasbon(status);

CREATE TRIGGER trg_kasbon_updated
  BEFORE UPDATE ON kasbon
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- VIEW: staff_full
-- ============================================================
CREATE OR REPLACE VIEW v_staff_full AS
SELECT
  s.*,
  a.code  AS airport_code,
  a.name  AS airport_name,
  a.city  AS airport_city,
  COALESCE(
    (SELECT SUM(sisa) FROM kasbon k WHERE k.staff_id = s.id AND k.status = 'ACTIVE'),
    0
  ) AS total_kasbon_aktif
FROM staff s
JOIN airports a ON a.id = s.airport_id;
