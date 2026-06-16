-- ============================================================
-- RAOS ENTERPRISE — 15_triggers.sql
-- 1. updated_at  2. audit_log  3. payroll_calc
-- 4. queue_history  5. attendance GPS
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TRIGGER: updated_at (semua tabel yang punya kolom updated_at)
-- ────────────────────────────────────────────────────────────
CREATE TRIGGER trg_airports_updated
  BEFORE UPDATE ON airports
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_staff_updated
  BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_kasbon_updated
  BEFORE UPDATE ON kasbon
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_schedule_updated
  BEFORE UPDATE ON staff_schedule
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_drivers_updated
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_payroll_updated
  BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_finance_tx_updated
  BEFORE UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_finance_bills_updated
  BEFORE UPDATE ON finance_bills
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

CREATE TRIGGER trg_kdoc_updated
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ────────────────────────────────────────────────────────────
-- 2. TRIGGER: audit_log (INSERT/UPDATE/DELETE pada tabel kritis)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, table_name, record_id, operation, old_value, new_value)
  VALUES (
    fn_current_user_id(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP::audit_operation,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_payroll
  AFTER INSERT OR UPDATE OR DELETE ON payroll
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_staff
  AFTER INSERT OR UPDATE OR DELETE ON staff
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_drivers
  AFTER INSERT OR UPDATE OR DELETE ON drivers
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_finance_tx
  AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

CREATE TRIGGER trg_audit_finance_bills
  AFTER INSERT OR UPDATE OR DELETE ON finance_bills
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ────────────────────────────────────────────────────────────
-- 3. TRIGGER: auto-update kasbon sisa setelah payroll lunas
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_deduct_kasbon_after_payroll()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Saat payroll baru PAID, kurangi sisa kasbon
  IF NEW.status = 'PAID' AND (OLD.status IS DISTINCT FROM 'PAID') AND NEW.kasbon > 0 THEN
    UPDATE kasbon
    SET sisa = GREATEST(0, sisa - NEW.kasbon),
        status = CASE WHEN GREATEST(0, sisa - NEW.kasbon) = 0 THEN 'INACTIVE' ELSE status END,
        updated_at = NOW()
    WHERE staff_id = NEW.staff_id AND status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_kasbon_deduct_on_payroll
  AFTER UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION fn_deduct_kasbon_after_payroll();

-- ────────────────────────────────────────────────────────────
-- 4. TRIGGER: queue_history — log setiap perubahan status antrian
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_log_queue_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO queue_history (queue_id, action, notes)
    VALUES (NEW.id, 'CREATED', 'Antrian #' || NEW.queue_number || ' dibuat');

  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO queue_history (queue_id, action, notes)
    VALUES (NEW.id, NEW.status::TEXT, OLD.status || ' → ' || NEW.status);

    -- Set timestamp milestone
    IF NEW.status = 'CALLED' THEN
      NEW.call_time  := NOW();
    ELSIF NEW.status = 'SERVING' THEN
      NEW.serve_time := NOW();
    ELSIF NEW.status IN ('DONE', 'SKIP', 'VIOLATION') THEN
      NEW.done_time  := NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_queue_history
  BEFORE INSERT OR UPDATE ON pickup_queues
  FOR EACH ROW EXECUTE FUNCTION fn_log_queue_history();

-- ────────────────────────────────────────────────────────────
-- 5. TRIGGER: attendance GPS validation
-- Auto-set distance_meter + distance_status saat INSERT
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_attendance_validate_gps()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_lat    NUMERIC; v_lng NUMERIC; v_radius INTEGER;
  v_dist   NUMERIC;
BEGIN
  SELECT latitude, longitude, radius_meter
  INTO v_lat, v_lng, v_radius
  FROM airports WHERE id = NEW.airport_id;

  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL AND v_lat IS NOT NULL THEN
    v_dist := fn_calc_distance_meter(NEW.latitude, NEW.longitude, v_lat, v_lng);
    NEW.distance_meter  := v_dist;
    NEW.distance_status := CASE WHEN v_dist <= v_radius THEN 'VALID'::distance_status
                                ELSE 'INVALID'::distance_status END;
    NEW.gps_location    := NEW.latitude || ',' || NEW.longitude;
  ELSE
    NEW.distance_status := 'UNKNOWN'::distance_status;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attendance_gps
  BEFORE INSERT ON attendance
  FOR EACH ROW EXECUTE FUNCTION fn_attendance_validate_gps();

-- ────────────────────────────────────────────────────────────
-- TRIGGER: auto-create user on Supabase auth signup
-- ────────────────────────────────────────────────────────────
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();

-- ────────────────────────────────────────────────────────────
-- TRIGGER: finance_bills — auto OVERDUE jika jatuh tempo
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_check_bill_overdue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'UNPAID' AND NEW.jatuh_tempo < CURRENT_DATE THEN
    NEW.status := 'OVERDUE'::bill_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bill_overdue
  BEFORE INSERT OR UPDATE ON finance_bills
  FOR EACH ROW EXECUTE FUNCTION fn_check_bill_overdue();
