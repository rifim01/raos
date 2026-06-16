-- ============================================================
-- RAOS ENTERPRISE — 012_security.sql
-- Notifications + Audit + Activity Logs + RLS Policies
-- ============================================================

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  airport_id  UUID REFERENCES airports(id),
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'INFO'
                CHECK (type IN ('INFO', 'WARNING', 'SUCCESS', 'ERROR', 'QUEUE', 'PAYROLL', 'FINANCE')),
  is_read     BOOLEAN NOT NULL DEFAULT false,
  data        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notif_airport     ON notifications(airport_id);

-- ============================================================
-- TABLE: activity_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id),
  airport_id  UUID REFERENCES airports(id),
  action      TEXT NOT NULL,   -- 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'EXPORT'
  module      TEXT NOT NULL,   -- 'STAFF', 'DRIVER', 'PAYROLL', etc.
  entity_id   UUID,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user    ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_module  ON activity_logs(module);

-- ============================================================
-- TABLE: audit_logs (before/after values)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  table_name  TEXT NOT NULL,
  record_id   UUID,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_table   ON audit_logs(table_name, record_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- FUNCTION: generic audit trigger
-- ============================================================
CREATE OR REPLACE FUNCTION fn_audit_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO audit_logs (user_id, table_name, record_id, operation, old_value, new_value)
  VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Pasang audit trigger ke tabel kritis
CREATE TRIGGER audit_payroll    AFTER INSERT OR UPDATE OR DELETE ON payroll          FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_staff      AFTER INSERT OR UPDATE OR DELETE ON staff            FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_drivers    AFTER INSERT OR UPDATE OR DELETE ON drivers          FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();
CREATE TRIGGER audit_finance_tx AFTER INSERT OR UPDATE OR DELETE ON finance_transactions FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE airports             ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasbon               ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance           ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedule       ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll              ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_bills        ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_external_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_queues        ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents  ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport_daily_reports ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: cek role user saat ini
-- ============================================================
CREATE OR REPLACE FUNCTION fn_my_role()
RETURNS TEXT LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT r.name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION fn_my_role_level()
RETURNS INTEGER LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT r.level FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION fn_my_airport_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT airport_id FROM users WHERE id = auth.uid()
$$;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- airports: semua bisa read, hanya SUPER_ADMIN bisa write
CREATE POLICY "airports_read_all"
  ON airports FOR SELECT USING (true);

CREATE POLICY "airports_write_super_admin"
  ON airports FOR ALL
  USING (fn_my_role() = 'SUPER_ADMIN')
  WITH CHECK (fn_my_role() = 'SUPER_ADMIN');

-- ============================================================
-- users: baca data sendiri, SUPER_ADMIN baca semua
CREATE POLICY "users_own"
  ON users FOR SELECT USING (id = auth.uid() OR fn_my_role_level() >= 4);

CREATE POLICY "users_write_super_admin"
  ON users FOR ALL
  USING (fn_my_role() = 'SUPER_ADMIN')
  WITH CHECK (fn_my_role() = 'SUPER_ADMIN');

-- ============================================================
-- MACRO: airport_isolation — tabel dengan airport_id

-- staff
CREATE POLICY "staff_select"  ON staff FOR SELECT
  USING (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id());
CREATE POLICY "staff_insert"  ON staff FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));
CREATE POLICY "staff_update"  ON staff FOR UPDATE
  USING (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));
CREATE POLICY "staff_delete"  ON staff FOR DELETE
  USING (fn_my_role() = 'SUPER_ADMIN');

-- drivers
CREATE POLICY "drivers_select" ON drivers FOR SELECT
  USING (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id());
CREATE POLICY "drivers_write"  ON drivers FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));
CREATE POLICY "drivers_update" ON drivers FOR UPDATE
  USING (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));
CREATE POLICY "drivers_delete" ON drivers FOR DELETE
  USING (fn_my_role() = 'SUPER_ADMIN');

-- attendance: COORDINATOR+ bisa read semua bandara sendiri; STAFF hanya milik sendiri
CREATE POLICY "attendance_select" ON attendance FOR SELECT
  USING (
    fn_my_role_level() >= 4 OR
    airport_id = fn_my_airport_id() AND fn_my_role_level() >= 3 OR
    staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid())
  );
CREATE POLICY "attendance_insert" ON attendance FOR INSERT
  WITH CHECK (
    fn_my_role_level() >= 2 AND
    (fn_my_role_level() >= 3 OR staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()))
  );

-- payroll
CREATE POLICY "payroll_select" ON payroll FOR SELECT
  USING (
    fn_my_role_level() >= 4 OR
    (fn_my_role_level() = 3 AND staff_id IN (SELECT id FROM staff WHERE airport_id = fn_my_airport_id())) OR
    (fn_my_role_level() = 2 AND staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()))
  );
CREATE POLICY "payroll_write" ON payroll FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3);
CREATE POLICY "payroll_update" ON payroll FOR UPDATE
  USING (fn_my_role_level() >= 3);

-- payroll_items (ikut payroll)
CREATE POLICY "payroll_items_select" ON payroll_items FOR SELECT
  USING (payroll_id IN (SELECT id FROM payroll));
CREATE POLICY "payroll_items_write"  ON payroll_items FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3);

-- finance_transactions
CREATE POLICY "finance_tx_select" ON finance_transactions FOR SELECT
  USING (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id());
CREATE POLICY "finance_tx_write"  ON finance_transactions FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));
CREATE POLICY "finance_tx_update" ON finance_transactions FOR UPDATE
  USING (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));

-- finance_bills
CREATE POLICY "bills_select" ON finance_bills FOR SELECT
  USING (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id());
CREATE POLICY "bills_write"  ON finance_bills FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));
CREATE POLICY "bills_update" ON finance_bills FOR UPDATE
  USING (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));

-- finance_external_income
CREATE POLICY "ext_income_select" ON finance_external_income FOR SELECT
  USING (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id());
CREATE POLICY "ext_income_write"  ON finance_external_income FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3 AND (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id()));

-- pickup_queues
CREATE POLICY "queue_select" ON pickup_queues FOR SELECT
  USING (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id());
CREATE POLICY "queue_insert" ON pickup_queues FOR INSERT
  WITH CHECK (fn_my_role_level() >= 2 AND (fn_my_role_level() >= 3 OR airport_id = fn_my_airport_id()));
CREATE POLICY "queue_update" ON pickup_queues FOR UPDATE
  USING (fn_my_role_level() >= 3 OR airport_id = fn_my_airport_id());

-- queue_history (baca saja berdasarkan akses queue)
CREATE POLICY "queue_history_select" ON queue_history FOR SELECT
  USING (queue_id IN (SELECT id FROM pickup_queues));
CREATE POLICY "queue_history_insert" ON queue_history FOR INSERT
  WITH CHECK (fn_my_role_level() >= 2);

-- notifications: hanya baca/edit milik sendiri
CREATE POLICY "notif_own" ON notifications FOR ALL
  USING (user_id = auth.uid() OR fn_my_role() = 'SUPER_ADMIN');

-- activity_logs: COORDINATOR+ bisa baca bandara sendiri
CREATE POLICY "activity_logs_select" ON activity_logs FOR SELECT
  USING (fn_my_role_level() >= 4 OR
         (fn_my_role_level() = 3 AND airport_id = fn_my_airport_id()));
CREATE POLICY "activity_logs_insert" ON activity_logs FOR INSERT
  WITH CHECK (true);  -- semua user bisa insert log sendiri

-- audit_logs: SUPER_ADMIN dan DIRECTOR saja
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT
  USING (fn_my_role_level() >= 4);
CREATE POLICY "audit_logs_insert" ON audit_logs FOR INSERT
  WITH CHECK (true);

-- knowledge: baca semua yg authenticated, write COORDINATOR+
CREATE POLICY "knowledge_docs_select" ON knowledge_documents FOR SELECT
  USING (is_active = true AND (fn_my_role_level() >= 4 OR airport_id IS NULL OR airport_id = fn_my_airport_id()));
CREATE POLICY "knowledge_docs_write"  ON knowledge_documents FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3);

CREATE POLICY "knowledge_chunks_select" ON knowledge_chunks FOR SELECT
  USING (document_id IN (SELECT id FROM knowledge_documents));
CREATE POLICY "knowledge_chunks_write"  ON knowledge_chunks FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3);

-- ai_conversations: milik sendiri, SUPER_ADMIN semua
CREATE POLICY "ai_conv_select" ON ai_conversations FOR SELECT
  USING (user_id = auth.uid() OR fn_my_role() = 'SUPER_ADMIN');
CREATE POLICY "ai_conv_insert" ON ai_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- airport_daily_reports
CREATE POLICY "daily_reports_select" ON airport_daily_reports FOR SELECT
  USING (fn_my_role_level() >= 4 OR airport_id = fn_my_airport_id());
CREATE POLICY "daily_reports_write"  ON airport_daily_reports FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3);
CREATE POLICY "daily_reports_update" ON airport_daily_reports FOR UPDATE
  USING (fn_my_role_level() >= 3);

-- driver_locations: driver sendiri + COORDINATOR+ bisa write; COORDINATOR+ bisa baca
CREATE POLICY "driver_loc_select" ON driver_locations FOR SELECT
  USING (fn_my_role_level() >= 3 OR
         driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));
CREATE POLICY "driver_loc_insert" ON driver_locations FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3 OR
              driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

-- kasbon
CREATE POLICY "kasbon_select" ON kasbon FOR SELECT
  USING (fn_my_role_level() >= 4 OR
         (fn_my_role_level() = 3 AND airport_id = fn_my_airport_id()) OR
         staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));
CREATE POLICY "kasbon_write" ON kasbon FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3);
CREATE POLICY "kasbon_update" ON kasbon FOR UPDATE
  USING (fn_my_role_level() >= 3);

-- staff_schedule
CREATE POLICY "schedule_select" ON staff_schedule FOR SELECT
  USING (fn_my_role_level() >= 3 OR
         staff_id IN (SELECT id FROM staff WHERE user_id = auth.uid()));
CREATE POLICY "schedule_write" ON staff_schedule FOR INSERT
  WITH CHECK (fn_my_role_level() >= 3);
CREATE POLICY "schedule_update" ON staff_schedule FOR UPDATE
  USING (fn_my_role_level() >= 3);
