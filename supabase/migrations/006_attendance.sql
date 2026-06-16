-- ============================================================
-- RAOS ENTERPRISE — 006_attendance.sql
-- Absensi Staff (GPS + Foto)
-- ============================================================

CREATE TABLE IF NOT EXISTS attendance (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id         UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  airport_id       UUID NOT NULL REFERENCES airports(id),
  tanggal          DATE NOT NULL DEFAULT CURRENT_DATE,
  check_type       TEXT NOT NULL CHECK (check_type IN ('CHECK_IN', 'CHECK_OUT')),
  gps_location     TEXT,                      -- format: "lat,lng"
  latitude         DECIMAL(10,8),
  longitude        DECIMAL(11,8),
  distance_meter   DECIMAL(8,2),              -- jarak dari titik bandara (meter)
  distance_status  TEXT NOT NULL DEFAULT 'UNKNOWN'
                     CHECK (distance_status IN ('VALID', 'INVALID', 'UNKNOWN')),
  photo_url        TEXT,
  device_info      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE attendance IS 'Rekam absensi staff per event (check_in / check_out) — mapping ERP ABSENSI Google Sheet';

CREATE INDEX idx_attendance_staff     ON attendance(staff_id);
CREATE INDEX idx_attendance_airport   ON attendance(airport_id);
CREATE INDEX idx_attendance_tanggal   ON attendance(tanggal);
CREATE INDEX idx_attendance_type      ON attendance(check_type);

-- Composite untuk query kehadiran harian
CREATE INDEX idx_attendance_daily ON attendance(staff_id, tanggal, check_type);

-- ============================================================
-- FUNCTION: hitung jarak GPS vs titik bandara
-- ============================================================
CREATE OR REPLACE FUNCTION fn_calc_distance_meter(
  lat1 DECIMAL, lng1 DECIMAL,
  lat2 DECIMAL, lng2 DECIMAL
) RETURNS DECIMAL LANGUAGE plpgsql AS $$
DECLARE
  R CONSTANT DECIMAL := 6371000; -- radius bumi meter
  phi1 DECIMAL; phi2 DECIMAL;
  dphi DECIMAL; dlambda DECIMAL;
  a DECIMAL; c DECIMAL;
BEGIN
  phi1    := radians(lat1); phi2 := radians(lat2);
  dphi    := radians(lat2 - lat1);
  dlambda := radians(lng2 - lng1);
  a := sin(dphi/2)^2 + cos(phi1) * cos(phi2) * sin(dlambda/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN ROUND((R * c)::NUMERIC, 2);
END;
$$;

-- ============================================================
-- TRIGGER: auto-set distance_status saat INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION fn_attendance_set_distance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_lat DECIMAL; v_lng DECIMAL; v_radius INTEGER;
  v_dist DECIMAL;
BEGIN
  -- Ambil koordinat dan radius bandara
  SELECT latitude, longitude, radius_meter
  INTO v_lat, v_lng, v_radius
  FROM airports WHERE id = NEW.airport_id;

  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND v_lat IS NOT NULL THEN
    v_dist := fn_calc_distance_meter(NEW.latitude, NEW.longitude, v_lat, v_lng);
    NEW.distance_meter := v_dist;
    NEW.distance_status := CASE WHEN v_dist <= v_radius THEN 'VALID' ELSE 'INVALID' END;
    NEW.gps_location := NEW.latitude::TEXT || ',' || NEW.longitude::TEXT;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_distance
  BEFORE INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_set_distance();

-- ============================================================
-- VIEW: v_attendance_daily (rekap per staff per hari)
-- ============================================================
CREATE OR REPLACE VIEW v_attendance_daily AS
SELECT
  s.id           AS staff_id,
  s.nama,
  s.jabatan,
  a.code         AS airport_code,
  att.tanggal,
  MAX(CASE WHEN att.check_type = 'CHECK_IN'  THEN att.created_at END) AS waktu_masuk,
  MAX(CASE WHEN att.check_type = 'CHECK_OUT' THEN att.created_at END) AS waktu_keluar,
  BOOL_OR(att.check_type = 'CHECK_IN'  AND att.distance_status = 'VALID') AS masuk_valid,
  BOOL_OR(att.check_type = 'CHECK_OUT' AND att.distance_status = 'VALID') AS keluar_valid
FROM attendance att
JOIN staff    s ON s.id = att.staff_id
JOIN airports a ON a.id = att.airport_id
GROUP BY s.id, s.nama, s.jabatan, a.code, att.tanggal;
