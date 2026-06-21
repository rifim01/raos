-- ============================================================
-- RAOS ENTERPRISE — 19_violations.sql
-- Pelanggaran Driver (Geofence, Telat, No-Show, dll)
-- NOTE: Tabel ini sebelumnya BELUM ADA di database production,
-- padahal src/app/(dashboard)/violations/page.tsx sudah dibangun
-- mengasumsikan tabel ini ada. File ini melengkapi gap tersebut.
-- ============================================================

CREATE TYPE violation_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE violation_status   AS ENUM ('OPEN', 'REVIEWED', 'RESOLVED', 'DISMISSED');
CREATE TYPE violation_type     AS ENUM (
  'GEOFENCE_EXIT',
  'LATE_CHECK_IN',
  'NO_SHOW',
  'SPEEDING',
  'ROUTE_DEVIATION',
  'UNAUTHORIZED_STOP'
);

CREATE TABLE violations (
  id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id   UUID               NOT NULL REFERENCES airports(id),
  driver_id    UUID               NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type         violation_type     NOT NULL,
  description  TEXT,
  severity     violation_severity NOT NULL DEFAULT 'LOW',
  status       violation_status   NOT NULL DEFAULT 'OPEN',
  occurred_at  TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  resolved_at  TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE violations IS 'Pelanggaran operasional driver — geofence, telat, no-show, speeding, dll';

CREATE INDEX idx_violations_airport   ON violations(airport_id);
CREATE INDEX idx_violations_driver    ON violations(driver_id);
CREATE INDEX idx_violations_status    ON violations(status);
CREATE INDEX idx_violations_severity  ON violations(severity);
CREATE INDEX idx_violations_occurred  ON violations(occurred_at DESC);

ALTER TABLE violations ENABLE ROW LEVEL SECURITY;
