-- ============================================================
-- RAOS ENTERPRISE — 001_airports.sql
-- PT RIFIM GEMILANG | ONE PLATFORM. ALL AIRPORTS. FULL CONTROL.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLE: airports
-- ============================================================
CREATE TABLE IF NOT EXISTS airports (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(10) UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  city        TEXT NOT NULL,
  province    TEXT,
  partner     TEXT,
  latitude    DECIMAL(10,8) NOT NULL DEFAULT 0,
  longitude   DECIMAL(11,8) NOT NULL DEFAULT 0,
  radius_meter INTEGER NOT NULL DEFAULT 500,
  status      TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'PLANNED', 'INACTIVE')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE airports IS 'Master data bandara RIFIM — satu row per bandara operasional';
COMMENT ON COLUMN airports.radius_meter IS 'Radius validasi GPS absensi dalam meter';

-- Indexes
CREATE INDEX idx_airports_status ON airports(status);
CREATE INDEX idx_airports_code   ON airports(code);

-- updated_at trigger function (shared, buat sekali)
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_airports_updated
  BEFORE UPDATE ON airports
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- SEED: 6 bandara aktif + 1 planned
-- ============================================================
INSERT INTO airports (code, name, city, province, partner, latitude, longitude, radius_meter, status) VALUES
  ('DJB001', 'Bandara Sultan Thaha',                                 'Jambi',       'Jambi',              'Angkasa Pura II', -1.6382,  103.6444, 500, 'ACTIVE'),
  ('PKU001', 'Bandara Sultan Syarif Kasim II',                       'Pekanbaru',   'Riau',               'Angkasa Pura II',  0.4607,  101.4451, 500, 'ACTIVE'),
  ('BTH001', 'Bandara Internasional Hang Nadim',                     'Batam',       'Kepulauan Riau',     'BP Batam',         1.1212,  104.1186, 500, 'ACTIVE'),
  ('BPN001', 'Bandara Sultan Aji Muhammad Sulaiman Sepinggan',       'Balikpapan',  'Kalimantan Timur',   'Angkasa Pura I',  -1.2683,  116.8946, 500, 'ACTIVE'),
  ('MDC001', 'Bandara Sam Ratulangi',                                'Manado',      'Sulawesi Utara',     'Angkasa Pura I',   1.5493,  124.9261, 500, 'ACTIVE'),
  ('UPG001', 'Bandara Sultan Hasanuddin',                            'Makassar',    'Sulawesi Selatan',   'Angkasa Pura I',  -5.0615,  119.5540, 500, 'ACTIVE'),
  ('CGK001', 'Bandara Internasional Soekarno-Hatta',                 'Tangerang',   'Banten',             'Angkasa Pura II', -6.1256,  106.6559, 500, 'PLANNED')
ON CONFLICT (code) DO NOTHING;
