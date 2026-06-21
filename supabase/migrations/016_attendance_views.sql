-- ============================================================
-- RAOS ENTERPRISE — 016_attendance_views.sql
-- Attendance Analytics: Alpha, Late, Monthly, Driver KPI
-- ============================================================

-- Alpha: Jadwal ada tapi tidak hadir (bukan LIBUR)
CREATE OR REPLACE VIEW vw_attendance_alpha AS
SELECT
  s.id         AS staff_id,
  s.staff_code,
  s.nama,
  s.airport_id,
  sc.tanggal,
  sc.shift,
  sc.jam_masuk,
  sc.jam_keluar
FROM staff_schedule sc
JOIN staff s ON s.id = sc.staff_id
WHERE sc.tanggal < CURRENT_DATE
  AND sc.shift != 'LIBUR'
  AND NOT EXISTS (
    SELECT 1 FROM attendance a
    WHERE a.staff_id = sc.staff_id AND a.tanggal = sc.tanggal
  );

-- Late: Check-in lebih dari 15 menit setelah jam masuk
CREATE OR REPLACE VIEW vw_attendance_late AS
SELECT
  a.id,
  a.staff_id,
  s.staff_code,
  s.nama,
  a.airport_id,
  a.tanggal,
  a.created_at::time   AS jam_checkin,
  sc.jam_masuk,
  ROUND(EXTRACT(EPOCH FROM (a.created_at::time - sc.jam_masuk)) / 60) AS menit_terlambat
FROM attendance a
JOIN staff s ON s.id = a.staff_id
JOIN staff_schedule sc ON sc.staff_id = a.staff_id AND sc.tanggal = a.tanggal
WHERE a.check_type = 'CHECK_IN'
  AND a.created_at::time > sc.jam_masuk + INTERVAL '15 minutes';

-- Monthly: Rekap hadir, checkout, valid/invalid per bulan
CREATE OR REPLACE VIEW vw_attendance_monthly AS
SELECT
  s.id            AS staff_id,
  s.staff_code,
  s.nama,
  s.airport_id,
  DATE_TRUNC('month', a.tanggal)::date AS bulan,
  COUNT(DISTINCT a.tanggal) FILTER (WHERE a.check_type = 'CHECK_IN')  AS total_hadir,
  COUNT(DISTINCT a.tanggal) FILTER (WHERE a.check_type = 'CHECK_OUT') AS total_checkout,
  COUNT(*) FILTER (WHERE a.distance_status = 'VALID')   AS checkin_valid,
  COUNT(*) FILTER (WHERE a.distance_status = 'INVALID') AS checkin_luar_area
FROM attendance a
JOIN staff s ON s.id = a.staff_id
GROUP BY s.id, s.staff_code, s.nama, s.airport_id,
         DATE_TRUNC('month', a.tanggal)::date;

-- Driver KPI Nasional per bulan berjalan
CREATE OR REPLACE VIEW vw_driver_kpi_nasional AS
SELECT
  a.code          AS airport_code,
  a.city,
  COUNT(DISTINCT d.id)                              AS total_driver,
  COALESCE(SUM(k.total_order), 0)                   AS total_order_bulan,
  COALESCE(SUM(k.total_pendapatan), 0)              AS total_pendapatan_bulan,
  COALESCE(ROUND(AVG(k.rating_avg)::numeric, 2), 0) AS rating_rata,
  COALESCE(SUM(k.pelanggaran), 0)                   AS total_pelanggaran
FROM airports a
LEFT JOIN drivers d ON d.airport_id = a.id AND d.status = 'ACTIVE'
LEFT JOIN driver_kpi k ON k.airport_id = a.id
  AND k.bulan = EXTRACT(MONTH FROM CURRENT_DATE)
  AND k.tahun = EXTRACT(YEAR  FROM CURRENT_DATE)
GROUP BY a.code, a.city
ORDER BY total_order_bulan DESC;
