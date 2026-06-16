-- ============================================================
-- RAOS ENTERPRISE — 14_functions.sql
-- PostgreSQL Functions
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- HELPER: updated_at setter
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- HELPER: current user context (via JWT claim)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_current_user_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION fn_current_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT r.name::TEXT
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION fn_current_role_level()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT r.level
  FROM users u JOIN roles r ON r.id = u.role_id
  WHERE u.auth_user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION fn_current_airport_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT airport_id FROM users WHERE auth_user_id = auth.uid() LIMIT 1
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: calculate_payroll
-- Hitung dan upsert payroll untuk staff + periode tertentu
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION calculate_payroll(
  p_staff_id    UUID,
  p_bulan       INTEGER,
  p_tahun       INTEGER
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_staff           RECORD;
  v_periode         VARCHAR(7);
  v_payroll_id      UUID;
  v_total_hadir     INTEGER := 0;
  v_total_alpha     INTEGER := 0;
  v_total_terlambat INTEGER := 0;
  v_jam_lembur      NUMERIC := 0;
  v_kasbon_cicil    NUMERIC := 0;
  v_lembur_nominal  NUMERIC := 0;
  v_denda_telat     NUMERIC := 0;
  v_alpha_potongan  NUMERIC := 0;
  v_working_days    INTEGER := 26;  -- hari kerja standar sebulan
BEGIN
  SELECT * INTO v_staff FROM staff WHERE id = p_staff_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Staff tidak ditemukan: %', p_staff_id; END IF;

  v_periode := p_tahun::TEXT || '-' || LPAD(p_bulan::TEXT, 2, '0');

  -- Hitung dari schedule vs attendance
  SELECT
    COUNT(*) FILTER (WHERE
      EXISTS (SELECT 1 FROM attendance a
              WHERE a.staff_id = ss.staff_id AND a.tanggal = ss.tanggal
                AND a.check_type = 'CHECK_IN')),
    COUNT(*) FILTER (WHERE
      NOT EXISTS (SELECT 1 FROM attendance a
                  WHERE a.staff_id = ss.staff_id AND a.tanggal = ss.tanggal
                    AND a.check_type = 'CHECK_IN')),
    COUNT(*) FILTER (WHERE
      EXISTS (SELECT 1 FROM attendance a
              JOIN shift_config sc ON sc.shift = ss.shift::TEXT
              WHERE a.staff_id = ss.staff_id AND a.tanggal = ss.tanggal
                AND a.check_type = 'CHECK_IN'
                AND a.created_at::TIME > ss.jam_masuk + (sc.toleransi_menit || ' minutes')::INTERVAL))
  INTO v_total_hadir, v_total_alpha, v_total_terlambat
  FROM staff_schedule ss
  WHERE ss.staff_id = p_staff_id
    AND ss.shift <> 'LIBUR'
    AND EXTRACT(YEAR  FROM ss.tanggal) = p_tahun
    AND EXTRACT(MONTH FROM ss.tanggal) = p_bulan;

  -- Kasbon cicilan aktif
  SELECT COALESCE(SUM(cicilan_per_bulan), 0) INTO v_kasbon_cicil
  FROM kasbon WHERE staff_id = p_staff_id AND status = 'ACTIVE';

  -- Kalkulasi potongan
  v_denda_telat    := v_total_terlambat * 10000;   -- Rp 10.000/keterlambatan
  v_alpha_potongan := CASE WHEN v_working_days > 0
    THEN v_total_alpha * (v_staff.gaji_pokok / v_working_days)
    ELSE 0 END;

  INSERT INTO payroll (
    staff_id, periode, periode_bulan, periode_tahun,
    gaji_pokok, bpjs, kuota, deposit,
    kasbon, denda_telat, potongan_alpha,
    total_hadir, total_alpha, total_terlambat, jam_lembur
  ) VALUES (
    p_staff_id, v_periode, p_bulan, p_tahun,
    v_staff.gaji_pokok, v_staff.bpjs_nominal, v_staff.kuota_nominal, v_staff.deposit,
    v_kasbon_cicil, v_denda_telat, v_alpha_potongan,
    COALESCE(v_total_hadir, 0), COALESCE(v_total_alpha, 0),
    COALESCE(v_total_terlambat, 0), COALESCE(v_jam_lembur, 0)
  )
  ON CONFLICT (staff_id, periode) DO UPDATE SET
    gaji_pokok      = EXCLUDED.gaji_pokok,
    bpjs            = EXCLUDED.bpjs,
    kuota           = EXCLUDED.kuota,
    deposit         = EXCLUDED.deposit,
    kasbon          = EXCLUDED.kasbon,
    denda_telat     = EXCLUDED.denda_telat,
    potongan_alpha  = EXCLUDED.potongan_alpha,
    total_hadir     = EXCLUDED.total_hadir,
    total_alpha     = EXCLUDED.total_alpha,
    total_terlambat = EXCLUDED.total_terlambat,
    updated_at      = NOW()
  RETURNING id INTO v_payroll_id;

  RETURN v_payroll_id;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: generate_queue_number
-- Ambil nomor antrian berikutnya per bandara per hari
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION generate_queue_number(p_airport_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO v_next
  FROM pickup_queues
  WHERE airport_id = p_airport_id
    AND tanggal    = CURRENT_DATE;

  RETURN v_next;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: get_airport_summary
-- KPI ringkas satu bandara
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_airport_summary(p_airport_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'airport_id',     p_airport_id,
    'date',           p_date,
    'total_driver',   (SELECT COUNT(*) FROM drivers   WHERE airport_id = p_airport_id AND status = 'ACTIVE'),
    'total_staff',    (SELECT COUNT(*) FROM staff     WHERE airport_id = p_airport_id AND status = 'ACTIVE'),
    'driver_online',  (SELECT COUNT(DISTINCT dl.driver_id)
                       FROM driver_locations dl
                       JOIN drivers d ON d.id = dl.driver_id
                       WHERE d.airport_id = p_airport_id
                         AND dl.last_seen > NOW() - INTERVAL '5 minutes'),
    'queue_waiting',  (SELECT COUNT(*) FROM pickup_queues
                       WHERE airport_id = p_airport_id AND tanggal = p_date AND status = 'WAITING'),
    'queue_done',     (SELECT COUNT(*) FROM pickup_queues
                       WHERE airport_id = p_airport_id AND tanggal = p_date AND status = 'DONE'),
    'attendance_today', (SELECT COUNT(DISTINCT staff_id) FROM attendance
                         WHERE airport_id = p_airport_id AND tanggal = p_date AND check_type = 'CHECK_IN'),
    'income_today',   (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions
                       WHERE airport_id = p_airport_id AND tanggal = p_date AND jenis = 'PEMASUKAN'),
    'expense_today',  (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions
                       WHERE airport_id = p_airport_id AND tanggal = p_date AND jenis = 'PENGELUARAN'),
    'overdue_bills',  (SELECT COUNT(*) FROM finance_bills
                       WHERE airport_id = p_airport_id AND status = 'OVERDUE')
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: get_dashboard_nasional
-- Agregasi seluruh bandara aktif
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_dashboard_nasional(p_date DATE DEFAULT CURRENT_DATE)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_airports  JSONB;
  v_totals    JSONB;
BEGIN
  -- Per bandara
  SELECT jsonb_agg(get_airport_summary(a.id, p_date) ORDER BY a.code)
  INTO v_airports
  FROM airports a WHERE a.status = 'ACTIVE';

  -- Total nasional
  SELECT jsonb_build_object(
    'date',             p_date,
    'total_airports',   (SELECT COUNT(*) FROM airports WHERE status = 'ACTIVE'),
    'total_driver',     (SELECT COUNT(*) FROM drivers WHERE status = 'ACTIVE'),
    'total_staff',      (SELECT COUNT(*) FROM staff   WHERE status = 'ACTIVE'),
    'total_pickup_today', (SELECT COUNT(*) FROM pickup_queues WHERE tanggal = p_date AND status = 'DONE'),
    'total_income_today', (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions
                           WHERE tanggal = p_date AND jenis = 'PEMASUKAN'),
    'total_expense_today', (SELECT COALESCE(SUM(nominal), 0) FROM finance_transactions
                            WHERE tanggal = p_date AND jenis = 'PENGELUARAN'),
    'overdue_bills_total', (SELECT COUNT(*) FROM finance_bills WHERE status = 'OVERDUE'),
    'airports',         v_airports
  ) INTO v_totals;

  RETURN v_totals;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: fn_calc_distance_meter (Haversine formula)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_calc_distance_meter(
  lat1 NUMERIC, lng1 NUMERIC,
  lat2 NUMERIC, lng2 NUMERIC
) RETURNS NUMERIC LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  R  CONSTANT NUMERIC := 6371000;
  phi1 NUMERIC; phi2 NUMERIC;
  dphi NUMERIC; dlambda NUMERIC;
  a NUMERIC; c NUMERIC;
BEGIN
  phi1    := radians(lat1); phi2 := radians(lat2);
  dphi    := radians(lat2 - lat1);
  dlambda := radians(lng2 - lng1);
  a := sin(dphi/2)^2 + cos(phi1)*cos(phi2)*sin(dlambda/2)^2;
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN ROUND((R * c)::NUMERIC, 2);
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: fn_match_knowledge_chunks (RAG similarity search)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_match_knowledge_chunks(
  query_embedding  vector(1536),
  match_threshold  FLOAT   DEFAULT 0.7,
  match_count      INTEGER DEFAULT 5,
  p_airport_id     UUID    DEFAULT NULL
) RETURNS TABLE (
  id            UUID,
  document_id   UUID,
  chunk_text    TEXT,
  similarity    FLOAT,
  doc_title     TEXT,
  doc_category  TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.chunk_text,
    (1 - (kc.embedding <=> query_embedding))::FLOAT AS similarity,
    kd.title,
    kd.category::TEXT
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.is_active = true
    AND (p_airport_id IS NULL OR kd.airport_id IS NULL OR kd.airport_id = p_airport_id)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ────────────────────────────────────────────────────────────
-- FUNCTION: fn_handle_new_auth_user (auto-create user row)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_handle_new_auth_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role_id    INTEGER;
  v_airport_id UUID;
BEGIN
  SELECT id INTO v_role_id FROM roles
  WHERE name = COALESCE(NEW.raw_user_meta_data->>'role', 'STAFF')::role_name LIMIT 1;

  IF v_role_id IS NULL THEN
    SELECT id INTO v_role_id FROM roles WHERE name = 'STAFF' LIMIT 1;
  END IF;

  IF NEW.raw_user_meta_data->>'airport_code' IS NOT NULL THEN
    SELECT id INTO v_airport_id FROM airports
    WHERE code = NEW.raw_user_meta_data->>'airport_code' LIMIT 1;
  END IF;

  INSERT INTO users (auth_user_id, email, full_name, role_id, airport_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    v_role_id,
    v_airport_id
  )
  ON CONFLICT (auth_user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
