-- ============================================================
-- RAOS ENTERPRISE — 09_queue.sql
-- Sistem Antrian Pickup
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: pickup_queues
-- ────────────────────────────────────────────────────────────
CREATE TABLE pickup_queues (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id    UUID          NOT NULL REFERENCES airports(id),
  driver_id     UUID          NOT NULL REFERENCES drivers(id),
  queue_number  INTEGER       NOT NULL,
  status        queue_status  NOT NULL DEFAULT 'WAITING',
  tanggal       DATE          NOT NULL DEFAULT CURRENT_DATE,
  call_time     TIMESTAMPTZ,
  serve_time    TIMESTAMPTZ,
  done_time     TIMESTAMPTZ,
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_queue_number UNIQUE (airport_id, queue_number, tanggal),
  CONSTRAINT chk_queue_number CHECK (queue_number > 0)
);

COMMENT ON TABLE pickup_queues IS 'Antrian driver realtime per hari per bandara';

CREATE INDEX idx_queue_airport_date ON pickup_queues(airport_id, tanggal);
CREATE INDEX idx_queue_driver       ON pickup_queues(driver_id);
CREATE INDEX idx_queue_status       ON pickup_queues(status);
CREATE INDEX idx_queue_tanggal      ON pickup_queues(tanggal DESC);

-- ────────────────────────────────────────────────────────────
-- TABLE: queue_history
-- ────────────────────────────────────────────────────────────
CREATE TABLE queue_history (
  id        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id  UUID        NOT NULL REFERENCES pickup_queues(id) ON DELETE CASCADE,
  action    TEXT        NOT NULL,
  notes     TEXT,
  actor_id  UUID        REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_qhist_queue   ON queue_history(queue_id);
CREATE INDEX idx_qhist_created ON queue_history(created_at DESC);
