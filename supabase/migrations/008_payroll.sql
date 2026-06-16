-- ============================================================
-- RAOS ENTERPRISE — 008_payroll.sql
-- Payroll + Payroll Items
-- Formula: gaji_bersih = gaji_pokok + bpjs + kuota + bonus + lembur
--                       - denda_telat - potongan_alpha - kasbon - deposit
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  staff_id        UUID NOT NULL REFERENCES staff(id) ON DELETE RESTRICT,
  periode         TEXT NOT NULL,             -- format: 'YYYY-MM' e.g. '2026-06'
  periode_bulan   INTEGER NOT NULL CHECK (periode_bulan BETWEEN 1 AND 12),
  periode_tahun   INTEGER NOT NULL CHECK (periode_tahun >= 2020),

  -- Pendapatan
  gaji_pokok      DECIMAL(15,2) NOT NULL DEFAULT 0,
  bpjs            DECIMAL(15,2) NOT NULL DEFAULT 0,    -- tunjangan BPJS
  kuota           DECIMAL(15,2) NOT NULL DEFAULT 0,    -- tunjangan kuota/komunikasi
  bonus           DECIMAL(15,2) NOT NULL DEFAULT 0,
  lembur          DECIMAL(15,2) NOT NULL DEFAULT 0,    -- nominal lembur (bukan jam)

  -- Potongan
  denda_telat     DECIMAL(15,2) NOT NULL DEFAULT 0,
  potongan_alpha  DECIMAL(15,2) NOT NULL DEFAULT 0,
  kasbon          DECIMAL(15,2) NOT NULL DEFAULT 0,
  deposit         DECIMAL(15,2) NOT NULL DEFAULT 0,

  -- Computed
  total_pendapatan DECIMAL(15,2) GENERATED ALWAYS AS
    (gaji_pokok + bpjs + kuota + bonus + lembur) STORED,
  total_potongan  DECIMAL(15,2) GENERATED ALWAYS AS
    (denda_telat + potongan_alpha + kasbon + deposit) STORED,
  gaji_bersih     DECIMAL(15,2) GENERATED ALWAYS AS
    (gaji_pokok + bpjs + kuota + bonus + lembur
     - denda_telat - potongan_alpha - kasbon - deposit) STORED,

  -- Meta
  total_hadir     INTEGER NOT NULL DEFAULT 0,
  total_terlambat INTEGER NOT NULL DEFAULT 0,
  total_alpha     INTEGER NOT NULL DEFAULT 0,
  jam_lembur      DECIMAL(6,2) NOT NULL DEFAULT 0,

  status          TEXT NOT NULL DEFAULT 'DRAFT'
                    CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'PAID')),
  approved_by     UUID REFERENCES users(id),
  paid_at         TIMESTAMPTZ,
  notes           TEXT,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (staff_id, periode)
);

COMMENT ON TABLE payroll IS 'Data gaji bulanan staff — formula dari RAOS Enterprise DB Architect Prompt';

CREATE INDEX idx_payroll_staff   ON payroll(staff_id);
CREATE INDEX idx_payroll_periode ON payroll(periode);
CREATE INDEX idx_payroll_status  ON payroll(status);

CREATE TRIGGER trg_payroll_updated
  BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TABLE: payroll_items (rincian komponen gaji)
-- ============================================================
CREATE TABLE IF NOT EXISTS payroll_items (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payroll_id  UUID NOT NULL REFERENCES payroll(id) ON DELETE CASCADE,
  item_name   TEXT NOT NULL,
  item_type   TEXT NOT NULL CHECK (item_type IN ('PENDAPATAN', 'POTONGAN')),
  amount      DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payroll_items_payroll ON payroll_items(payroll_id);

-- ============================================================
-- FUNCTION: auto-generate payroll dari attendance
-- ============================================================
CREATE OR REPLACE FUNCTION fn_generate_payroll(
  p_staff_id    UUID,
  p_bulan       INTEGER,
  p_tahun       INTEGER
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_staff         RECORD;
  v_periode       TEXT;
  v_payroll_id    UUID;
  v_total_hadir   INTEGER;
  v_total_alpha   INTEGER;
  v_total_telat   INTEGER;
  v_jam_lembur    DECIMAL;
  v_kasbon_cicil  DECIMAL;
BEGIN
  SELECT * INTO v_staff FROM staff WHERE id = p_staff_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff tidak ditemukan: %', p_staff_id; END IF;

  v_periode := p_tahun::TEXT || '-' || LPAD(p_bulan::TEXT, 2, '0');

  -- Hitung dari schedule vs attendance
  SELECT
    COUNT(*) FILTER (WHERE status_kehadiran = 'HADIR'),
    COUNT(*) FILTER (WHERE status_kehadiran = 'ALPHA'),
    COUNT(*) FILTER (WHERE status_kehadiran = 'TERLAMBAT')
  INTO v_total_hadir, v_total_alpha, v_total_telat
  FROM v_schedule_with_attendance
  WHERE staff_id = p_staff_id
    AND EXTRACT(MONTH FROM tanggal) = p_bulan
    AND EXTRACT(YEAR  FROM tanggal) = p_tahun;

  -- Kasbon cicilan bulan ini
  SELECT COALESCE(SUM(cicilan_per_bulan), 0) INTO v_kasbon_cicil
  FROM kasbon WHERE staff_id = p_staff_id AND status = 'ACTIVE';

  INSERT INTO payroll (
    staff_id, periode, periode_bulan, periode_tahun,
    gaji_pokok, bpjs, deposit,
    denda_telat, potongan_alpha, kasbon,
    total_hadir, total_alpha, total_terlambat
  ) VALUES (
    p_staff_id, v_periode, p_bulan, p_tahun,
    v_staff.gaji_pokok,
    v_staff.bpjs_nominal,
    v_staff.deposit,
    v_total_telat * 10000,        -- Rp 10.000 per keterlambatan (configurable)
    v_total_alpha * (v_staff.gaji_pokok / 26),  -- per hari kerja
    v_kasbon_cicil,
    COALESCE(v_total_hadir, 0),
    COALESCE(v_total_alpha, 0),
    COALESCE(v_total_telat, 0)
  )
  ON CONFLICT (staff_id, periode) DO UPDATE
    SET total_hadir       = EXCLUDED.total_hadir,
        total_alpha       = EXCLUDED.total_alpha,
        total_terlambat   = EXCLUDED.total_terlambat,
        denda_telat       = EXCLUDED.denda_telat,
        potongan_alpha    = EXCLUDED.potongan_alpha,
        kasbon            = EXCLUDED.kasbon,
        updated_at        = NOW()
  RETURNING id INTO v_payroll_id;

  RETURN v_payroll_id;
END;
$$;

-- ============================================================
-- VIEW: v_payroll_summary (per bandara per periode)
-- ============================================================
CREATE OR REPLACE VIEW v_payroll_summary AS
SELECT
  a.code        AS airport_code,
  a.name        AS airport_name,
  p.periode,
  COUNT(*)      AS jumlah_staff,
  SUM(p.gaji_bersih)  AS total_gaji_bersih,
  SUM(p.total_potongan) AS total_potongan,
  SUM(p.kasbon)         AS total_kasbon,
  p.status
FROM payroll p
JOIN staff    s ON s.id = p.staff_id
JOIN airports a ON a.id = s.airport_id
GROUP BY a.code, a.name, p.periode, p.status;
