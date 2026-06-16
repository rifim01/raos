-- ============================================================
-- RAOS ENTERPRISE — 13_logs.sql
-- Notifications + Activity Logs + Audit Logs
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: notifications
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID              PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID              REFERENCES users(id) ON DELETE CASCADE,
  airport_id  UUID              REFERENCES airports(id),
  title       TEXT              NOT NULL,
  message     TEXT              NOT NULL,
  type        notification_type NOT NULL DEFAULT 'INFO',
  is_read     BOOLEAN           NOT NULL DEFAULT false,
  data        JSONB,
  created_at  TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE notifications IS 'Push notification in-app per user';

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notif_airport     ON notifications(airport_id);
CREATE INDEX idx_notif_created     ON notifications(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- TABLE: activity_logs
-- ────────────────────────────────────────────────────────────
CREATE TABLE activity_logs (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID        NOT NULL REFERENCES users(id),
  airport_id  UUID        REFERENCES airports(id),
  action      TEXT        NOT NULL,   -- CREATE, UPDATE, DELETE, LOGIN, EXPORT, PRINT
  module      TEXT        NOT NULL,   -- STAFF, DRIVER, PAYROLL, FINANCE, QUEUE, AUTH
  entity_id   UUID,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE activity_logs IS 'Log aktivitas user untuk monitoring dan compliance';

CREATE INDEX idx_actlog_user    ON activity_logs(user_id);
CREATE INDEX idx_actlog_airport ON activity_logs(airport_id);
CREATE INDEX idx_actlog_module  ON activity_logs(module);
CREATE INDEX idx_actlog_created ON activity_logs(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- TABLE: audit_logs (before/after values untuk data kritis)
-- ────────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID            REFERENCES users(id),
  table_name  TEXT            NOT NULL,
  record_id   UUID,
  operation   audit_operation NOT NULL,
  old_value   JSONB,
  new_value   JSONB,
  created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Audit trail perubahan data kritis (payroll, finance, staff)';

CREATE INDEX idx_auditlog_table   ON audit_logs(table_name, record_id);
CREATE INDEX idx_auditlog_user    ON audit_logs(user_id);
CREATE INDEX idx_auditlog_created ON audit_logs(created_at DESC);
