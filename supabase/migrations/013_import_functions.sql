-- ============================================================
-- RAOS — 013_import_functions.sql
-- Fix import RPC: use staff_code / driver_code (not staff_id / driver_id on master tables)
-- ============================================================

CREATE OR REPLACE FUNCTION import_staff(
  p_rows      JSONB,
  p_airport_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row       JSONB;
  v_imported  INT := 0;
  v_skipped   INT := 0;
  v_staff_code TEXT;
  v_nama      TEXT;
  v_jabatan   TEXT;
  v_email     TEXT;
  v_gaji      NUMERIC;
  v_deposit   NUMERIC;
  v_bpjs      NUMERIC;
BEGIN
  IF p_rows IS NULL OR jsonb_array_length(p_rows) = 0 THEN
    RETURN jsonb_build_object('success', false, 'imported', 0, 'skipped', 0, 'error', 'No rows');
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_staff_code := COALESCE(
      NULLIF(trim(v_row->>'ID Staff'), ''),
      NULLIF(trim(v_row->>'ID STAFF'), ''),
      NULLIF(trim(v_row->>'Kode Staff'), ''),
      NULLIF(trim(v_row->>'staff_code'), ''),
      NULLIF(trim(v_row->>'staff_id'), ''),
      NULLIF(trim(v_row->>'STAFF_ID'), '')
    );
    v_nama := COALESCE(
      NULLIF(trim(v_row->>'Nama'), ''),
      NULLIF(trim(v_row->>'NAMA'), ''),
      NULLIF(trim(v_row->>'Nama Staff'), ''),
      NULLIF(trim(v_row->>'full_name'), '')
    );

    IF v_staff_code IS NULL OR v_nama IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_jabatan := COALESCE(NULLIF(trim(v_row->>'Jabatan'), ''), NULLIF(trim(v_row->>'JABATAN'), ''), 'Staff');
    v_email   := NULLIF(trim(v_row->>'Email'), '');
    v_gaji    := COALESCE(NULLIF(regexp_replace(COALESCE(v_row->>'Gaji Staff', v_row->>'Gaji Pokok', '0'), '[^0-9.]', '', 'g'), '')::NUMERIC, 0);
    v_deposit := COALESCE(NULLIF(regexp_replace(COALESCE(v_row->>'Deposit', '0'), '[^0-9.]', '', 'g'), '')::NUMERIC, 0);
    v_bpjs    := COALESCE(NULLIF(regexp_replace(COALESCE(v_row->>'BPJS', '0'), '[^0-9.]', '', 'g'), '')::NUMERIC, 0);

    INSERT INTO staff (
      airport_id, staff_code, nama, email, jabatan,
      gaji_pokok, deposit, bpjs_nominal, status
    ) VALUES (
      p_airport_id, v_staff_code, v_nama, v_email, v_jabatan,
      v_gaji, v_deposit, v_bpjs, 'ACTIVE'
    )
    ON CONFLICT (airport_id, staff_code) DO UPDATE SET
      nama          = EXCLUDED.nama,
      email         = COALESCE(EXCLUDED.email, staff.email),
      jabatan       = EXCLUDED.jabatan,
      gaji_pokok    = EXCLUDED.gaji_pokok,
      deposit       = EXCLUDED.deposit,
      bpjs_nominal  = EXCLUDED.bpjs_nominal,
      updated_at    = NOW();

    v_imported := v_imported + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'imported', v_imported, 'skipped', v_skipped);
END;
$$;

CREATE OR REPLACE FUNCTION import_drivers(
  p_rows       JSONB,
  p_airport_id UUID,
  p_type       TEXT DEFAULT 'INTERNAL'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row         JSONB;
  v_imported    INT := 0;
  v_skipped     INT := 0;
  v_driver_code TEXT;
  v_nama        TEXT;
  v_nomor_hp    TEXT;
  v_nik         TEXT;
  v_driver_type TEXT;
BEGIN
  IF p_rows IS NULL OR jsonb_array_length(p_rows) = 0 THEN
    RETURN jsonb_build_object('success', false, 'imported', 0, 'skipped', 0, 'error', 'No rows');
  END IF;

  v_driver_type := CASE WHEN upper(p_type) = 'EXTERNAL' THEN 'EXTERNAL' ELSE 'INTERNAL' END;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_rows)
  LOOP
    v_driver_code := COALESCE(
      NULLIF(trim(v_row->>'ID Driver'), ''),
      NULLIF(trim(v_row->>'ID DRIVER'), ''),
      NULLIF(trim(v_row->>'Kode Driver'), ''),
      NULLIF(trim(v_row->>'driver_code'), ''),
      NULLIF(trim(v_row->>'driver_id'), ''),
      NULLIF(trim(v_row->>'DRIVER_ID'), '')
    );
    v_nama := COALESCE(
      NULLIF(trim(v_row->>'Nama Driver'), ''),
      NULLIF(trim(v_row->>'NAMA DRIVER'), ''),
      NULLIF(trim(v_row->>'Nama'), ''),
      NULLIF(trim(v_row->>'NAMA'), ''),
      NULLIF(trim(v_row->>'full_name'), '')
    );

    IF v_driver_code IS NULL OR v_nama IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_nomor_hp := NULLIF(trim(v_row->>'Nomor HP'), '');
    v_nik      := NULLIF(trim(v_row->>'NIK'), '');

    INSERT INTO drivers (
      airport_id, driver_code, nama, nomor_hp, nik, driver_type, status
    ) VALUES (
      p_airport_id, v_driver_code, v_nama, v_nomor_hp, v_nik, v_driver_type, 'ACTIVE'
    )
    ON CONFLICT (airport_id, driver_code) DO UPDATE SET
      nama        = EXCLUDED.nama,
      nomor_hp    = COALESCE(EXCLUDED.nomor_hp, drivers.nomor_hp),
      nik         = COALESCE(EXCLUDED.nik, drivers.nik),
      driver_type = EXCLUDED.driver_type,
      updated_at  = NOW();

    v_imported := v_imported + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'imported', v_imported, 'skipped', v_skipped);
END;
$$;

GRANT EXECUTE ON FUNCTION import_staff(JSONB, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION import_drivers(JSONB, UUID, TEXT) TO authenticated, service_role;
