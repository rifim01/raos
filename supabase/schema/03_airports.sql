-- ============================================================
-- RAOS ENTERPRISE — 03_airports.sql
-- Master data bandara
-- ============================================================

CREATE TABLE airports (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  code          VARCHAR(20) NOT NULL,
  name          TEXT        NOT NULL,
  city          TEXT        NOT NULL,
  province      TEXT,
  partner       TEXT,
  latitude      NUMERIC(10,8) NOT NULL DEFAULT 0,
  longitude     NUMERIC(11,8) NOT NULL DEFAULT 0,
  radius_meter  INTEGER     NOT NULL DEFAULT 500,
  status        airport_status NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_airports_code UNIQUE (code)
);

COMMENT ON TABLE  airports              IS 'Master data bandara RIFIM';
COMMENT ON COLUMN airports.code        IS 'Kode unik bandara, format: XXX001 (e.g. DJB001)';
COMMENT ON COLUMN airports.radius_meter IS 'Radius validasi GPS absensi dalam meter';

CREATE INDEX idx_airports_status ON airports(status);
CREATE INDEX idx_airports_code   ON airports(code);
