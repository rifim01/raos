-- ============================================================
-- RAOS ENTERPRISE — 16_views.sql
-- Views: Dashboard Nasional, Bandara, Payroll, Driver, Attendance
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- VIEW: vw_dashboard_nasional
-- Agregasi seluruh bandara aktif untuk halaman utama
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_dashboard_nasional AS
SELECT
  (SELECT COUNT(*) FROM airports WHERE status = 'ACTIVE')                AS total_airports,
  (SELECT COUNT(*) FROM drivers  WHERE status = 'ACTIVE')                AS total_driver_aktif,
  (SELECT COUNT(*) FROM staff    WHERE status = 'ACTIVE')                AS total_staff_aktif,
  (SELECT COUNT(*) FROM pickup_queues
   WHERE tanggal = CURRENT_DATE AND status = 'DONE')                     AS total_pickup_hari_ini,
  (SELECT COUNT(*) FROM pickup_queues
   WHERE tanggal = CURRENT_DATE AND status = 'WAITING')                  AS queue_menunggu,
  (SELECT COALESCE(SUM(nominal),0) FROM finance_transactions
   WHERE tanggal = CURRENT_DATE AND jenis = 'PEMASUKAN')                 AS income_hari_ini,
  (SELECT COALESCE(SUM(nominal),0) FROM finance_transactions
   WHERE tanggal = CURRENT_DATE AND jenis = 'PENGELUARAN')               AS expense_hari_ini,
  (SELECT COUNT(DISTINCT staff_id) FROM attendance
   WHERE tanggal = CURRENT_DATE AND check_type = 'CHECK_IN')             AS staff_hadir_hari_ini,
  (SELECT COUNT(*) FROM finance_bills WHERE status = 'OVERDUE')          AS tagihan_jatuh_tempo,
  (SELECT COUNT(DISTINCT dl.driver_id)
   FROM driver_locations dl
   WHERE dl.last_seen > NOW() - INTERVAL '5 minutes')                    AS driver_online_sekarang;

-- ────────────────────────────────────────────────────────────
-- VIEW: vw_dashboard_bandara
-- KPI per bandara, bergabung dengan data hari ini
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_dashboard_bandara AS
SELECT
  a.id                AS airport_id,
  a.code              AS airport_code,
  a.name              AS airport_name,
  a.city,
  a.status,

  -- SDM
  (SELECT COUNT(*) FROM staff   s WHERE s.airport_id = a.id AND s.status = 'ACTIVE') AS total_staff,
  (SELECT COUNT(*) FROM drivers d WHERE d.airport_id = a.id AND d.status = 'ACTIVE') AS total_driver,

  -- Queue hari ini
  (SELECT COUNT(*) FROM pickup_queues pq
   WHERE pq.airport_id = a.id AND pq.tanggal = CURRENT_DATE)             AS queue_hari_ini,
  (SELECT COUNT(*) FROM pickup_queues pq
   WHERE pq.airport_id = a.id AND pq.tanggal = CURRENT_DATE
     AND pq.status = 'WAITING')                                           AS queue_waiting,
  (SELECT COUNT(*) FROM pickup_queues pq
   WHERE pq.airport_id = a.id AND pq.tanggal = CURRENT_DATE
     AND pq.status = 'DONE')                                              AS queue_done,

  -- Absensi hari ini
  (SELECT COUNT(DISTINCT att.staff_id) FROM attendance att
   WHERE att.airport_id = a.id AND att.tanggal = CURRENT_DATE
     AND att.check_type = 'CHECK_IN')                                     AS staff_hadir,

  -- Keuangan hari ini
  (SELECT COALESCE(SUM(ft.nominal),0) FROM finance_transactions ft
   WHERE ft.airport_id = a.id AND ft.tanggal = CURRENT_DATE
     AND ft.jenis = 'PEMASUKAN')                                          AS income_hari_ini,
  (SELECT COALESCE(SUM(ft.nominal),0) FROM finance_transactions ft
   WHERE ft.airport_id = a.id AND ft.tanggal = CURRENT_DATE
     AND ft.jenis = 'PENGELUARAN')                                        AS expense_hari_ini,

  -- Driver online
  (SELECT COUNT(DISTINCT dl.driver_id)
   FROM driver_locations dl
   JOIN drivers d ON d.id = dl.driver_id
   WHERE d.airport_id = a.id
     AND dl.last_seen > NOW() - INTERVAL '5 minutes')                     AS driver_online,

  -- Tagihan overdue
  (SELECT COUNT(*) FROM finance_bills fb
   WHERE fb.airport_id = a.id AND fb.status = 'OVERDUE')                 AS tagihan_overdue

FROM airports a
WHERE a.status IN ('ACTIVE', 'PLANNED')
ORDER BY a.code;

-- ────────────────────────────────────────────────────────────
-- VIEW: vw_payroll_summary
-- Rekap payroll per bandara per periode
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_payroll_summary AS
SELECT
  a.code                    AS airport_code,
  a.name                    AS airport_name,
  p.periode,
  p.periode_bulan,
  p.periode_tahun,
  COUNT(*)                  AS jumlah_staff,
  SUM(p.gaji_pokok)         AS total_gaji_pokok,
  SUM(p.total_pendapatan)   AS total_pendapatan,
  SUM(p.total_potongan)     AS total_potongan,
  SUM(p.gaji_bersih)        AS total_gaji_bersih,
  SUM(p.kasbon)             AS total_kasbon,
  SUM(p.bonus)              AS total_bonus,
  SUM(p.lembur)             AS total_lembur,
  AVG(p.total_hadir)        AS rata_hadir,
  SUM(p.total_alpha)        AS total_alpha,
  p.status,
  MIN(p.created_at)         AS dibuat_pertama,
  MAX(p.updated_at)         AS diupdate_terakhir
FROM payroll p
JOIN staff    s ON s.id = p.staff_id
JOIN airports a ON a.id = s.airport_id
GROUP BY a.code, a.name, p.periode, p.periode_bulan, p.periode_tahun, p.status
ORDER BY p.periode DESC, a.code;

-- ────────────────────────────────────────────────────────────
-- VIEW: vw_driver_status
-- Status driver realtime + posisi terakhir
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_driver_status AS
SELECT
  d.id                  AS driver_id,
  d.driver_code,
  d.nama,
  d.driver_type,
  d.status              AS driver_status,
  a.code                AS airport_code,
  a.name                AS airport_name,

  -- Lokasi terakhir
  dl.latitude,
  dl.longitude,
  dl.speed,
  dl.last_seen,
  CASE
    WHEN dl.last_seen > NOW() - INTERVAL '5 minutes'  THEN 'ONLINE'
    WHEN dl.last_seen > NOW() - INTERVAL '30 minutes' THEN 'IDLE'
    ELSE 'OFFLINE'
  END                   AS online_status,

  -- Antrian hari ini
  pq.queue_number,
  pq.status             AS queue_status,
  pq.created_at         AS queue_join_time

FROM drivers d
JOIN airports a ON a.id = d.airport_id
LEFT JOIN LATERAL (
  SELECT latitude, longitude, speed, last_seen
  FROM driver_locations
  WHERE driver_id = d.id
  ORDER BY last_seen DESC LIMIT 1
) dl ON true
LEFT JOIN pickup_queues pq
  ON pq.driver_id = d.id
  AND pq.tanggal  = CURRENT_DATE
  AND pq.status NOT IN ('DONE', 'SKIP', 'VIOLATION')
ORDER BY a.code, d.driver_code;

-- ────────────────────────────────────────────────────────────
-- VIEW: vw_attendance_summary
-- Rekap kehadiran per staff per hari
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW vw_attendance_summary AS
SELECT
  s.id                  AS staff_id,
  s.staff_code,
  s.nama,
  s.jabatan,
  a.code                AS airport_code,
  att.tanggal,

  MAX(CASE WHEN att.check_type = 'CHECK_IN'  THEN att.created_at END) AS waktu_masuk,
  MAX(CASE WHEN att.check_type = 'CHECK_OUT' THEN att.created_at END) AS waktu_keluar,
  MAX(CASE WHEN att.check_type = 'CHECK_IN'  THEN att.distance_status END) AS status_masuk,
  MAX(CASE WHEN att.check_type = 'CHECK_OUT' THEN att.distance_status END) AS status_keluar,
  MAX(CASE WHEN att.check_type = 'CHECK_IN'  THEN att.photo_url END)  AS foto_masuk,

  ss.shift,
  ss.jam_masuk          AS jadwal_masuk,
  ss.jam_keluar         AS jadwal_keluar,

  -- Status kehadiran gabungan
  CASE
    WHEN MAX(CASE WHEN att.check_type = 'CHECK_IN' THEN att.created_at END) IS NULL THEN 'ALPHA'
    WHEN ss.jam_masuk IS NOT NULL AND
         MAX(CASE WHEN att.check_type = 'CHECK_IN' THEN att.created_at END)::TIME
         > ss.jam_masuk + INTERVAL '15 minutes'                         THEN 'TERLAMBAT'
    ELSE 'HADIR'
  END                   AS status_kehadiran,

  -- Durasi kerja (menit)
  EXTRACT(EPOCH FROM (
    MAX(CASE WHEN att.check_type = 'CHECK_OUT' THEN att.created_at END) -
    MAX(CASE WHEN att.check_type = 'CHECK_IN'  THEN att.created_at END)
  )) / 60               AS durasi_menit

FROM attendance att
JOIN staff    s  ON s.id = att.staff_id
JOIN airports a  ON a.id = att.airport_id
LEFT JOIN staff_schedule ss
  ON ss.staff_id = s.id AND ss.tanggal = att.tanggal
GROUP BY s.id, s.staff_code, s.nama, s.jabatan, a.code, att.tanggal,
         ss.shift, ss.jam_masuk, ss.jam_keluar
ORDER BY att.tanggal DESC, a.code, s.nama;
