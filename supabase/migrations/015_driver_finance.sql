-- ============================================================
-- RAOS ENTERPRISE — 015_driver_finance.sql
-- Driver Finance: Balance, Topup, Orders, KPI
-- ============================================================

CREATE TABLE IF NOT EXISTS driver_balance (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  airport_id   UUID NOT NULL REFERENCES airports(id),
  saldo        NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_topup  NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_tarik  NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id)
);

CREATE TABLE IF NOT EXISTS driver_topup (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id      UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  airport_id     UUID NOT NULL REFERENCES airports(id),
  jumlah         NUMERIC(12,2) NOT NULL,
  metode         TEXT NOT NULL DEFAULT 'TRANSFER',
  keterangan     TEXT,
  bukti_url      TEXT,
  diproses_oleh  UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_orders (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id    UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  airport_id   UUID NOT NULL REFERENCES airports(id),
  trip_id      UUID REFERENCES trips(id),
  tanggal      DATE NOT NULL DEFAULT CURRENT_DATE,
  jumlah_order INTEGER NOT NULL DEFAULT 0,
  pendapatan   NUMERIC(12,2) NOT NULL DEFAULT 0,
  potongan     NUMERIC(12,2) NOT NULL DEFAULT 0,
  bersih       NUMERIC(12,2) GENERATED ALWAYS AS (pendapatan - potongan) STORED,
  status       TEXT NOT NULL DEFAULT 'PENDING',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS driver_kpi (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id        UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  airport_id       UUID NOT NULL REFERENCES airports(id),
  bulan            INTEGER NOT NULL CHECK (bulan BETWEEN 1 AND 12),
  tahun            INTEGER NOT NULL,
  total_order      INTEGER NOT NULL DEFAULT 0,
  total_pendapatan NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_online_jam NUMERIC(6,2) NOT NULL DEFAULT 0,
  rating_avg       NUMERIC(3,2),
  pelanggaran      INTEGER NOT NULL DEFAULT 0,
  rank_cabang      INTEGER,
  rank_nasional    INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(driver_id, bulan, tahun)
);

CREATE INDEX IF NOT EXISTS idx_driver_topup_driver   ON driver_topup(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_orders_driver  ON driver_orders(driver_id, tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_driver_kpi_period     ON driver_kpi(bulan, tahun);
CREATE INDEX IF NOT EXISTS idx_driver_kpi_airport    ON driver_kpi(airport_id, tahun, bulan);

ALTER TABLE driver_balance  ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_topup    ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_kpi      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "driver_balance_read"  ON driver_balance  FOR SELECT USING (true);
CREATE POLICY "driver_balance_write" ON driver_balance  FOR ALL    USING (true);
CREATE POLICY "driver_topup_read"    ON driver_topup    FOR SELECT USING (true);
CREATE POLICY "driver_topup_write"   ON driver_topup    FOR ALL    USING (true);
CREATE POLICY "driver_orders_read"   ON driver_orders   FOR SELECT USING (true);
CREATE POLICY "driver_orders_write"  ON driver_orders   FOR ALL    USING (true);
CREATE POLICY "driver_kpi_read"      ON driver_kpi      FOR SELECT USING (true);
CREATE POLICY "driver_kpi_write"     ON driver_kpi      FOR ALL    USING (true);
