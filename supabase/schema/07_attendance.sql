-- ============================================================
-- RAOS ENTERPRISE — 07_attendance.sql
-- Absensi Staff (GPS Validation)
-- ============================================================

CREATE TABLE attendance (
  id              UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID            NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  airport_id      UUID            NOT NULL REFERENCES airports(id),
  tanggal         DATE            NOT NULL DEFAULT CURRENT_DATE,
  check_type      check_type      NOT NULL,
  gps_location    TEXT,                       -- "lat,lng" string
  latitude        NUMERIC(10,8),
  longitude       NUMERIC(11,8),
  distance_meter  NUMERIC(8,2),
  distance_status distance_status NOT NULL DEFAULT 'UNKNOWN',
  photo_url       TEXT,
  device_info     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE attendance IS 'Rekam absensi per event check_in / check_out — GPS validated';

CREATE INDEX idx_att_staff      ON attendance(staff_id);
CREATE INDEX idx_att_airport    ON attendance(airport_id);
CREATE INDEX idx_att_tanggal    ON attendance(tanggal);
CREATE INDEX idx_att_type       ON attendance(check_type);
CREATE INDEX idx_att_daily      ON attendance(staff_id, tanggal, check_type);
CREATE INDEX idx_att_dist_status ON attendance(distance_status);
