-- ============================================================
-- RAOS ENTERPRISE — 010_queue.sql
-- Sistem Antrian Pickup (Realtime)
-- ============================================================

CREATE TABLE IF NOT EXISTS pickup_queues (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id      UUID NOT NULL REFERENCES airports(id),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  queue_number    INTEGER NOT NULL,
  status          TEXT NOT NULL DEFAULT 'WAITING'
                    CHECK (status IN ('WAITING', 'CALLED', 'SERVING', 'DONE', 'SKIP', 'VIOLATION')),
  tanggal         DATE NOT NULL DEFAULT CURRENT_DATE,
  call_time       TIMESTAMPTZ,
  serve_time      TIMESTAMPTZ,
  done_time       TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (airport_id, queue_number, tanggal)
);

COMMENT ON TABLE pickup_queues IS 'Antrian pickup driver realtime per hari per bandara';

CREATE INDEX idx_queues_airport_date ON pickup_queues(airport_id, tanggal);
CREATE INDEX idx_queues_driver       ON pickup_queues(driver_id);
CREATE INDEX idx_queues_status       ON pickup_queues(status);

-- ============================================================
-- TABLE: queue_history (log setiap perubahan status)
-- ============================================================
CREATE TABLE IF NOT EXISTS queue_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  queue_id    UUID NOT NULL REFERENCES pickup_queues(id) ON DELETE CASCADE,
  action      TEXT NOT NULL,    -- 'CREATED', 'CALLED', 'SERVING', 'DONE', 'SKIP', 'VIOLATION'
  notes       TEXT,
  actor_id    UUID REFERENCES users(id),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_queue_history_queue     ON queue_history(queue_id);
CREATE INDEX idx_queue_history_timestamp ON queue_history(timestamp DESC);

-- ============================================================
-- FUNCTION: auto-log ke queue_history saat status berubah
-- ============================================================
CREATE OR REPLACE FUNCTION fn_log_queue_history()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO queue_history (queue_id, action, notes)
    VALUES (NEW.id, NEW.status, 'Status changed from ' || OLD.status || ' to ' || NEW.status);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_queue_status_history
  AFTER UPDATE ON pickup_queues
  FOR EACH ROW EXECUTE FUNCTION fn_log_queue_history();

-- ============================================================
-- FUNCTION: ambil nomor antrian berikutnya
-- ============================================================
CREATE OR REPLACE FUNCTION fn_next_queue_number(p_airport_id UUID)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(queue_number), 0) + 1
  INTO v_next
  FROM pickup_queues
  WHERE airport_id = p_airport_id
    AND tanggal = CURRENT_DATE;

  RETURN v_next;
END;
$$;

-- ============================================================
-- FUNCTION: daftar antrian (untuk driver self-register)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_register_queue(p_driver_id UUID)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_airport_id  UUID;
  v_queue_num   INTEGER;
  v_queue_id    UUID;
BEGIN
  SELECT airport_id INTO v_airport_id FROM drivers WHERE id = p_driver_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Driver tidak ditemukan'; END IF;

  -- Cek sudah dalam antrian hari ini
  IF EXISTS (
    SELECT 1 FROM pickup_queues
    WHERE driver_id = p_driver_id
      AND tanggal = CURRENT_DATE
      AND status NOT IN ('DONE', 'VIOLATION', 'SKIP')
  ) THEN
    RAISE EXCEPTION 'Driver sudah dalam antrian hari ini';
  END IF;

  v_queue_num := fn_next_queue_number(v_airport_id);

  INSERT INTO pickup_queues (airport_id, driver_id, queue_number, tanggal)
  VALUES (v_airport_id, p_driver_id, v_queue_num, CURRENT_DATE)
  RETURNING id INTO v_queue_id;

  INSERT INTO queue_history (queue_id, action)
  VALUES (v_queue_id, 'CREATED');

  RETURN v_queue_id;
END;
$$;

-- ============================================================
-- VIEW: v_queue_today (antrian aktif hari ini per bandara)
-- ============================================================
CREATE OR REPLACE VIEW v_queue_today AS
SELECT
  pq.id,
  pq.airport_id,
  a.code          AS airport_code,
  pq.queue_number,
  pq.status,
  pq.created_at   AS waktu_daftar,
  pq.call_time,
  pq.serve_time,
  d.driver_code,
  d.nama          AS nama_driver,
  d.driver_type,
  dl.latitude,
  dl.longitude,
  dl.last_seen
FROM pickup_queues pq
JOIN drivers  d  ON d.id = pq.driver_id
JOIN airports a  ON a.id = pq.airport_id
LEFT JOIN LATERAL (
  SELECT latitude, longitude, last_seen
  FROM driver_locations
  WHERE driver_id = pq.driver_id
  ORDER BY last_seen DESC LIMIT 1
) dl ON true
WHERE pq.tanggal = CURRENT_DATE
ORDER BY pq.airport_id, pq.queue_number;
