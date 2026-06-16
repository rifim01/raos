-- ============================================================
-- RAOS ENTERPRISE — 11_finance.sql
-- Finance: Transactions + Bills + External Income
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: finance_transactions
-- ────────────────────────────────────────────────────────────
CREATE TABLE finance_transactions (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID          NOT NULL REFERENCES airports(id),
  jenis       finance_jenis NOT NULL,
  kategori    TEXT          NOT NULL,
  nominal     NUMERIC(15,2) NOT NULL,
  keterangan  TEXT,
  tanggal     DATE          NOT NULL DEFAULT CURRENT_DATE,
  bukti_url   TEXT,
  created_by  UUID          REFERENCES users(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ft_nominal CHECK (nominal > 0)
);

COMMENT ON TABLE finance_transactions IS 'Transaksi keuangan harian — PEMASUKAN dan PENGELUARAN';

CREATE INDEX idx_ft_airport  ON finance_transactions(airport_id);
CREATE INDEX idx_ft_tanggal  ON finance_transactions(tanggal DESC);
CREATE INDEX idx_ft_jenis    ON finance_transactions(jenis);
CREATE INDEX idx_ft_kategori ON finance_transactions(kategori);

-- ────────────────────────────────────────────────────────────
-- TABLE: finance_bills
-- ────────────────────────────────────────────────────────────
CREATE TABLE finance_bills (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id      UUID        NOT NULL REFERENCES airports(id),
  vendor          TEXT        NOT NULL,
  invoice_number  TEXT,
  jumlah          NUMERIC(15,2) NOT NULL,
  jatuh_tempo     DATE        NOT NULL,
  status          bill_status NOT NULL DEFAULT 'UNPAID',
  keterangan      TEXT,
  bukti_url       TEXT,
  paid_at         TIMESTAMPTZ,
  created_by      UUID        REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_bill_jumlah CHECK (jumlah > 0)
);

COMMENT ON TABLE finance_bills IS 'Tagihan vendor — auto-update ke OVERDUE saat jatuh tempo';

CREATE INDEX idx_bills_airport     ON finance_bills(airport_id);
CREATE INDEX idx_bills_status      ON finance_bills(status);
CREATE INDEX idx_bills_jatuh_tempo ON finance_bills(jatuh_tempo);
CREATE INDEX idx_bills_vendor      ON finance_bills(vendor);

-- ────────────────────────────────────────────────────────────
-- TABLE: finance_external_income
-- ────────────────────────────────────────────────────────────
CREATE TABLE finance_external_income (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID          NOT NULL REFERENCES airports(id),
  sumber      TEXT          NOT NULL,
  nominal     NUMERIC(15,2) NOT NULL,
  tanggal     DATE          NOT NULL DEFAULT CURRENT_DATE,
  keterangan  TEXT,
  bukti_url   TEXT,
  created_by  UUID          REFERENCES users(id),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_ext_nominal CHECK (nominal > 0)
);

COMMENT ON TABLE finance_external_income IS 'Pendapatan luar — pendapatan di luar operasional utama';

CREATE INDEX idx_ext_income_airport ON finance_external_income(airport_id);
CREATE INDEX idx_ext_income_tanggal ON finance_external_income(tanggal DESC);
CREATE INDEX idx_ext_income_sumber  ON finance_external_income(sumber);

-- ────────────────────────────────────────────────────────────
-- TABLE: airport_daily_reports
-- ────────────────────────────────────────────────────────────
CREATE TABLE airport_daily_reports (
  id               UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id       UUID          NOT NULL REFERENCES airports(id),
  report_date      DATE          NOT NULL DEFAULT CURRENT_DATE,
  total_driver     INTEGER       NOT NULL DEFAULT 0,
  total_staff      INTEGER       NOT NULL DEFAULT 0,
  total_pickup     INTEGER       NOT NULL DEFAULT 0,
  total_income     NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_expense    NUMERIC(15,2) NOT NULL DEFAULT 0,
  attendance_rate  NUMERIC(5,2),
  queue_avg_wait_min NUMERIC(6,2),
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_daily_report UNIQUE (airport_id, report_date),
  CONSTRAINT chk_att_rate CHECK (attendance_rate BETWEEN 0 AND 100)
);

CREATE INDEX idx_daily_reports_airport ON airport_daily_reports(airport_id);
CREATE INDEX idx_daily_reports_date    ON airport_daily_reports(report_date DESC);
