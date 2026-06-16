-- ============================================================
-- RAOS ENTERPRISE — 08_drivers.sql
-- Drivers + Driver Locations
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: drivers
-- ────────────────────────────────────────────────────────────
CREATE TABLE drivers (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID          NOT NULL REFERENCES airports(id),
  user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
  driver_code TEXT          NOT NULL,
  nama        TEXT          NOT NULL,
  nomor_hp    TEXT,
  nik         VARCHAR(20),
  driver_type driver_type   NOT NULL DEFAULT 'INTERNAL',
  status      driver_status NOT NULL DEFAULT 'ACTIVE',
  photo_url   TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_driver_code UNIQUE (airport_id, driver_code)
);

COMMENT ON TABLE drivers IS 'Master driver — INTERNAL (tetap) + EXTERNAL (mitra)';

CREATE INDEX idx_drivers_airport ON drivers(airport_id);
CREATE INDEX idx_drivers_status  ON drivers(status);
CREATE INDEX idx_drivers_type    ON drivers(driver_type);
CREATE INDEX idx_drivers_user    ON drivers(user_id);

-- ────────────────────────────────────────────────────────────
-- TABLE: driver_locations
-- ────────────────────────────────────────────────────────────
CREATE TABLE driver_locations (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id   UUID        NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude    NUMERIC(10,8) NOT NULL,
  longitude   NUMERIC(11,8) NOT NULL,
  speed       NUMERIC(6,2),
  heading     NUMERIC(5,2),
  accuracy    NUMERIC(6,2),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE driver_locations IS 'Realtime GPS driver — subscribe via Supabase Realtime';

CREATE INDEX idx_driver_loc_driver   ON driver_locations(driver_id);
CREATE INDEX idx_driver_loc_lastseen ON driver_locations(last_seen DESC);

-- Partial index: hanya record < 24 jam (aktif)
CREATE INDEX idx_driver_loc_recent ON driver_locations(driver_id, last_seen DESC)
  WHERE last_seen > NOW() - INTERVAL '24 hours';
