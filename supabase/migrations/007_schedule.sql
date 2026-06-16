-- ============================================================
-- RAOS ENTERPRISE — 007_schedule.sql
-- Jadwal Kerja Staff
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_schedule (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id    UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  tanggal     DATE NOT NULL,
  shift       TEXT NOT NULL CHECK (shift IN ('PAGI', 'SIANG', 'MALAM', 'LIBUR', 'CUSTOM')),
  jam_masuk   TIME,
  jam_keluar  TIME,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, tanggal)
);

COMMENT ON TABLE staff_schedule IS 'Jadwal kerja harian staff — mapping Google Sheet JADWAL KERJA';

CREATE INDEX idx_schedule_staff   ON staff_schedule(staff_id);
CREATE INDEX idx_schedule_tanggal ON staff_schedule(tanggal);

CREATE TRIGGER trg_schedule_updated
  BEFORE UPDATE ON staff_schedule
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TABLE: shift_config (jam default per tipe shift)
-- ============================================================
CREATE TABLE IF NOT EXISTS shift_config (
  id         SERIAL PRIMARY KEY,
  shift      TEXT UNIQUE NOT NULL CHECK (shift IN ('PAGI', 'SIANG', 'MALAM')),
  jam_masuk  TIME NOT NULL,
  jam_keluar TIME NOT NULL,
  toleransi_menit INTEGER NOT NULL DEFAULT 15
);

INSERT INTO shift_config (shift, jam_masuk, jam_keluar, toleransi_menit) VALUES
  ('PAGI',  '07:00', '15:00', 15),
  ('SIANG', '15:00', '23:00', 15),
  ('MALAM', '23:00', '07:00', 15)
ON CONFLICT (shift) DO NOTHING;

-- ============================================================
-- FUNCTION: bulk generate jadwal bulanan
-- ============================================================
CREATE OR REPLACE FUNCTION fn_generate_schedule_bulanan(
  p_staff_id   UUID,
  p_bulan      INTEGER,
  p_tahun      INTEGER,
  p_shift      TEXT DEFAULT 'PAGI'
) RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_date DATE;
  v_end  DATE;
  v_jam_masuk  TIME; v_jam_keluar TIME;
  inserted_count INTEGER := 0;
BEGIN
  SELECT jam_masuk, jam_keluar INTO v_jam_masuk, v_jam_keluar
  FROM shift_config WHERE shift = p_shift;

  v_date := make_date(p_tahun, p_bulan, 1);
  v_end  := v_date + INTERVAL '1 month' - INTERVAL '1 day';

  WHILE v_date <= v_end LOOP
    INSERT INTO staff_schedule (staff_id, tanggal, shift, jam_masuk, jam_keluar)
    VALUES (p_staff_id, v_date, p_shift, v_jam_masuk, v_jam_keluar)
    ON CONFLICT (staff_id, tanggal) DO NOTHING;

    IF FOUND THEN inserted_count := inserted_count + 1; END IF;
    v_date := v_date + 1;
  END LOOP;

  RETURN inserted_count;
END;
$$;

-- ============================================================
-- VIEW: v_schedule_with_attendance
-- ============================================================
CREATE OR REPLACE VIEW v_schedule_with_attendance AS
SELECT
  ss.id,
  ss.staff_id,
  s.nama,
  s.jabatan,
  a.code AS airport_code,
  ss.tanggal,
  ss.shift,
  ss.jam_masuk  AS jadwal_masuk,
  ss.jam_keluar AS jadwal_keluar,
  att_in.created_at   AS realisasi_masuk,
  att_out.created_at  AS realisasi_keluar,
  CASE
    WHEN att_in.id IS NULL THEN 'ALPHA'
    WHEN att_in.created_at::TIME > ss.jam_masuk + (
      SELECT toleransi_menit * INTERVAL '1 minute' FROM shift_config sc WHERE sc.shift = ss.shift
    ) THEN 'TERLAMBAT'
    ELSE 'HADIR'
  END AS status_kehadiran
FROM staff_schedule ss
JOIN staff    s ON s.id = ss.staff_id
JOIN airports a ON a.id = s.airport_id
LEFT JOIN attendance att_in  ON att_in.staff_id  = ss.staff_id
                              AND att_in.tanggal  = ss.tanggal
                              AND att_in.check_type = 'CHECK_IN'
LEFT JOIN attendance att_out ON att_out.staff_id = ss.staff_id
                              AND att_out.tanggal  = ss.tanggal
                              AND att_out.check_type = 'CHECK_OUT';
