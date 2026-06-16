-- ============================================================
-- RAOS ENTERPRISE — 005_drivers.sql
-- Drivers (Internal + External) + Driver Locations
-- ============================================================

CREATE TABLE IF NOT EXISTS drivers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID NOT NULL REFERENCES airports(id),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  driver_code TEXT NOT NULL,
  nama        TEXT NOT NULL,
  nomor_hp    TEXT,
  nik         VARCHAR(20),
  driver_type TEXT NOT NULL DEFAULT 'INTERNAL'
                CHECK (driver_type IN ('INTERNAL', 'EXTERNAL')),
  status      TEXT NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'ON_DUTY', 'OFF_DUTY')),
  photo_url   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (airport_id, driver_code)
);

COMMENT ON TABLE drivers IS 'Gabungan driver AIRPORT (INTERNAL) dan EXTERNAL — mapping 2 sheet Google Sheets';
COMMENT ON COLUMN drivers.driver_type IS 'INTERNAL = driver tetap bandara, EXTERNAL = driver mitra/freelance';

CREATE INDEX idx_drivers_airport ON drivers(airport_id);
CREATE INDEX idx_drivers_status  ON drivers(status);
CREATE INDEX idx_drivers_type    ON drivers(driver_type);

CREATE TRIGGER trg_drivers_updated
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TABLE: driver_locations (realtime tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS driver_locations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude    DECIMAL(10,8) NOT NULL,
  longitude   DECIMAL(11,8) NOT NULL,
  accuracy    DECIMAL(6,2),
  speed       DECIMAL(6,2),
  heading     DECIMAL(5,2),
  status      TEXT NOT NULL DEFAULT 'ONLINE'
                CHECK (status IN ('ONLINE', 'OFFLINE', 'ON_DUTY')),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE driver_locations IS 'Realtime GPS driver — subscribe via Supabase Realtime';

CREATE INDEX idx_driver_locations_driver   ON driver_locations(driver_id);
CREATE INDEX idx_driver_locations_lastseen ON driver_locations(last_seen DESC);

-- ============================================================
-- VIEW: v_driver_latest_location
-- Ambil posisi terbaru setiap driver
-- ============================================================
CREATE OR REPLACE VIEW v_driver_latest_location AS
SELECT DISTINCT ON (dl.driver_id)
  dl.driver_id,
  dl.latitude,
  dl.longitude,
  dl.status,
  dl.last_seen,
  d.nama,
  d.driver_code,
  d.driver_type,
  d.airport_id,
  a.code AS airport_code
FROM driver_locations dl
JOIN drivers d  ON d.id = dl.driver_id
JOIN airports a ON a.id = d.airport_id
ORDER BY dl.driver_id, dl.last_seen DESC;
