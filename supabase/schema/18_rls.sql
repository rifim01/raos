-- ============================================================
-- RAOS ENTERPRISE — 18_rls.sql
-- Row Level Security — semua tabel
-- Role hierarchy: SUPER_ADMIN(5) > DIRECTOR(4) > COORDINATOR(3) > STAFF(2) > DRIVER(1)
-- ============================================================

-- Enable RLS
ALTER TABLE airports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE kasbon                ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedule        ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance            ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pickup_queues         ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll               ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_transactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_bills         ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_external_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE airport_daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents   ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs            ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- airports — read semua authenticated, write SUPER_ADMIN
-- ============================================================
CREATE POLICY "airports_select_all"   ON airports FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "airports_insert_admin" ON airports FOR INSERT WITH CHECK (fn_current_role_level() = 5);
CREATE POLICY "airports_update_admin" ON airports FOR UPDATE USING (fn_current_role_level() = 5);
CREATE POLICY "airports_delete_admin" ON airports FOR DELETE USING (fn_current_role_level() = 5);

-- ============================================================
-- users — baca sendiri; SUPER_ADMIN semua; DIRECTOR read semua
-- ============================================================
CREATE POLICY "users_select"
  ON users FOR SELECT
  USING (
    auth_user_id = auth.uid()             -- diri sendiri
    OR fn_current_role_level() >= 4       -- DIRECTOR+
  );

CREATE POLICY "users_insert_admin" ON users FOR INSERT WITH CHECK (fn_current_role_level() = 5);
CREATE POLICY "users_update_self"  ON users FOR UPDATE
  USING (auth_user_id = auth.uid() OR fn_current_role_level() = 5);
CREATE POLICY "users_delete_admin" ON users FOR DELETE USING (fn_current_role_level() = 5);

-- ============================================================
-- MACRO: airport_isolation helper (inline)
-- Pola berulang: level>=4 lihat semua, level=3 hanya airport sendiri
-- ============================================================

-- staff
CREATE POLICY "staff_select" ON staff FOR SELECT
  USING (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id());
CREATE POLICY "staff_insert" ON staff FOR INSERT
  WITH CHECK (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "staff_update" ON staff FOR UPDATE
  USING (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "staff_delete" ON staff FOR DELETE
  USING (fn_current_role_level() = 5);

-- kasbon
CREATE POLICY "kasbon_select" ON kasbon FOR SELECT
  USING (
    fn_current_role_level() >= 4
    OR (fn_current_role_level() = 3 AND airport_id = fn_current_airport_id())
    OR staff_id IN (SELECT id FROM staff WHERE user_id = fn_current_user_id())
  );
CREATE POLICY "kasbon_insert" ON kasbon FOR INSERT
  WITH CHECK (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "kasbon_update" ON kasbon FOR UPDATE
  USING (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "kasbon_delete" ON kasbon FOR DELETE USING (fn_current_role_level() = 5);

-- staff_schedule
CREATE POLICY "schedule_select" ON staff_schedule FOR SELECT
  USING (
    fn_current_role_level() >= 3
    OR staff_id IN (SELECT id FROM staff WHERE user_id = fn_current_user_id())
  );
CREATE POLICY "schedule_insert" ON staff_schedule FOR INSERT WITH CHECK (fn_current_role_level() >= 3);
CREATE POLICY "schedule_update" ON staff_schedule FOR UPDATE USING (fn_current_role_level() >= 3);
CREATE POLICY "schedule_delete" ON staff_schedule FOR DELETE USING (fn_current_role_level() >= 3);

-- attendance
CREATE POLICY "attendance_select" ON attendance FOR SELECT
  USING (
    fn_current_role_level() >= 4
    OR (fn_current_role_level() = 3 AND airport_id = fn_current_airport_id())
    OR staff_id IN (SELECT id FROM staff WHERE user_id = fn_current_user_id())
  );
CREATE POLICY "attendance_insert" ON attendance FOR INSERT
  WITH CHECK (
    fn_current_role_level() >= 3
    OR staff_id IN (SELECT id FROM staff WHERE user_id = fn_current_user_id())
  );

-- drivers
CREATE POLICY "drivers_select" ON drivers FOR SELECT
  USING (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id());
CREATE POLICY "drivers_insert" ON drivers FOR INSERT
  WITH CHECK (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "drivers_update" ON drivers FOR UPDATE
  USING (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "drivers_delete" ON drivers FOR DELETE USING (fn_current_role_level() = 5);

-- driver_locations
CREATE POLICY "driver_loc_select" ON driver_locations FOR SELECT
  USING (
    fn_current_role_level() >= 3
    OR driver_id IN (SELECT id FROM drivers WHERE user_id = fn_current_user_id())
  );
CREATE POLICY "driver_loc_insert" ON driver_locations FOR INSERT
  WITH CHECK (
    fn_current_role_level() >= 3
    OR driver_id IN (SELECT id FROM drivers WHERE user_id = fn_current_user_id())
  );

-- pickup_queues
CREATE POLICY "queue_select" ON pickup_queues FOR SELECT
  USING (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id());
CREATE POLICY "queue_insert" ON pickup_queues FOR INSERT
  WITH CHECK (
    fn_current_role_level() >= 2
    AND (fn_current_role_level() >= 3 OR airport_id = fn_current_airport_id())
  );
CREATE POLICY "queue_update" ON pickup_queues FOR UPDATE
  USING (fn_current_role_level() >= 3 OR airport_id = fn_current_airport_id());
CREATE POLICY "queue_delete" ON pickup_queues FOR DELETE USING (fn_current_role_level() >= 3);

-- queue_history (baca saja)
CREATE POLICY "qhist_select" ON queue_history FOR SELECT
  USING (queue_id IN (SELECT id FROM pickup_queues));
CREATE POLICY "qhist_insert" ON queue_history FOR INSERT WITH CHECK (fn_current_role_level() >= 2);

-- payroll
CREATE POLICY "payroll_select" ON payroll FOR SELECT
  USING (
    fn_current_role_level() >= 4
    OR (fn_current_role_level() = 3
        AND staff_id IN (SELECT id FROM staff WHERE airport_id = fn_current_airport_id()))
    OR staff_id IN (SELECT id FROM staff WHERE user_id = fn_current_user_id())
  );
CREATE POLICY "payroll_insert" ON payroll FOR INSERT WITH CHECK (fn_current_role_level() >= 3);
CREATE POLICY "payroll_update" ON payroll FOR UPDATE USING (fn_current_role_level() >= 3);
CREATE POLICY "payroll_delete" ON payroll FOR DELETE USING (fn_current_role_level() = 5);

-- payroll_items
CREATE POLICY "payroll_items_select" ON payroll_items FOR SELECT
  USING (payroll_id IN (SELECT id FROM payroll));
CREATE POLICY "payroll_items_write"  ON payroll_items FOR INSERT WITH CHECK (fn_current_role_level() >= 3);
CREATE POLICY "payroll_items_update" ON payroll_items FOR UPDATE USING (fn_current_role_level() >= 3);

-- finance_transactions
CREATE POLICY "ft_select" ON finance_transactions FOR SELECT
  USING (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id());
CREATE POLICY "ft_insert" ON finance_transactions FOR INSERT
  WITH CHECK (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "ft_update" ON finance_transactions FOR UPDATE
  USING (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "ft_delete" ON finance_transactions FOR DELETE USING (fn_current_role_level() = 5);

-- finance_bills
CREATE POLICY "fb_select" ON finance_bills FOR SELECT
  USING (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id());
CREATE POLICY "fb_insert" ON finance_bills FOR INSERT
  WITH CHECK (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "fb_update" ON finance_bills FOR UPDATE
  USING (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "fb_delete" ON finance_bills FOR DELETE USING (fn_current_role_level() = 5);

-- finance_external_income
CREATE POLICY "fei_select" ON finance_external_income FOR SELECT
  USING (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id());
CREATE POLICY "fei_insert" ON finance_external_income FOR INSERT
  WITH CHECK (fn_current_role_level() >= 3
    AND (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id()));
CREATE POLICY "fei_delete" ON finance_external_income FOR DELETE USING (fn_current_role_level() = 5);

-- airport_daily_reports
CREATE POLICY "adr_select" ON airport_daily_reports FOR SELECT
  USING (fn_current_role_level() >= 4 OR airport_id = fn_current_airport_id());
CREATE POLICY "adr_insert" ON airport_daily_reports FOR INSERT
  WITH CHECK (fn_current_role_level() >= 3);
CREATE POLICY "adr_update" ON airport_daily_reports FOR UPDATE
  USING (fn_current_role_level() >= 3);

-- knowledge_documents
CREATE POLICY "kdoc_select" ON knowledge_documents FOR SELECT
  USING (is_active = true
    AND (fn_current_role_level() >= 4 OR airport_id IS NULL OR airport_id = fn_current_airport_id()));
CREATE POLICY "kdoc_insert" ON knowledge_documents FOR INSERT WITH CHECK (fn_current_role_level() >= 3);
CREATE POLICY "kdoc_update" ON knowledge_documents FOR UPDATE USING (fn_current_role_level() >= 3);
CREATE POLICY "kdoc_delete" ON knowledge_documents FOR DELETE USING (fn_current_role_level() = 5);

-- knowledge_chunks
CREATE POLICY "kchunk_select" ON knowledge_chunks FOR SELECT
  USING (document_id IN (SELECT id FROM knowledge_documents));
CREATE POLICY "kchunk_insert" ON knowledge_chunks FOR INSERT WITH CHECK (fn_current_role_level() >= 3);
CREATE POLICY "kchunk_delete" ON knowledge_chunks FOR DELETE USING (fn_current_role_level() = 5);

-- ai_conversations
CREATE POLICY "ai_conv_select" ON ai_conversations FOR SELECT
  USING (user_id = fn_current_user_id() OR fn_current_role_level() = 5);
CREATE POLICY "ai_conv_insert" ON ai_conversations FOR INSERT
  WITH CHECK (user_id = fn_current_user_id());

-- notifications
CREATE POLICY "notif_select" ON notifications FOR SELECT
  USING (user_id = fn_current_user_id() OR fn_current_role_level() = 5);
CREATE POLICY "notif_insert" ON notifications FOR INSERT WITH CHECK (fn_current_role_level() >= 2);
CREATE POLICY "notif_update" ON notifications FOR UPDATE
  USING (user_id = fn_current_user_id());

-- activity_logs
CREATE POLICY "actlog_select" ON activity_logs FOR SELECT
  USING (
    fn_current_role_level() >= 4
    OR (fn_current_role_level() = 3 AND airport_id = fn_current_airport_id())
  );
CREATE POLICY "actlog_insert" ON activity_logs FOR INSERT WITH CHECK (true);

-- audit_logs
CREATE POLICY "auditlog_select" ON audit_logs FOR SELECT USING (fn_current_role_level() >= 4);
CREATE POLICY "auditlog_insert" ON audit_logs FOR INSERT WITH CHECK (true);
