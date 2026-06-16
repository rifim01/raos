-- ============================================================
-- RAOS ENTERPRISE — 009_finance.sql
-- Finance: Transactions + Bills + External Income
-- ============================================================

-- ============================================================
-- TABLE: finance_transactions (Sheet: Money)
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_transactions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID NOT NULL REFERENCES airports(id),
  jenis       TEXT NOT NULL CHECK (jenis IN ('PEMASUKAN', 'PENGELUARAN')),
  kategori    TEXT NOT NULL,
  nominal     DECIMAL(15,2) NOT NULL CHECK (nominal > 0),
  tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan  TEXT,
  bukti_url   TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE finance_transactions IS 'Transaksi keuangan harian — mapping Google Sheet KEUANGAN tab Money';

CREATE INDEX idx_finance_tx_airport ON finance_transactions(airport_id);
CREATE INDEX idx_finance_tx_tanggal ON finance_transactions(tanggal);
CREATE INDEX idx_finance_tx_jenis   ON finance_transactions(jenis);

CREATE TRIGGER trg_finance_tx_updated
  BEFORE UPDATE ON finance_transactions
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TABLE: finance_bills (Sheet: Tagihan)
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_bills (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id      UUID NOT NULL REFERENCES airports(id),
  vendor          TEXT NOT NULL,
  invoice_number  TEXT,
  jumlah          DECIMAL(15,2) NOT NULL CHECK (jumlah > 0),
  jatuh_tempo     DATE NOT NULL,
  status          TEXT NOT NULL DEFAULT 'UNPAID'
                    CHECK (status IN ('UNPAID', 'PAID', 'OVERDUE', 'DISPUTED')),
  keterangan      TEXT,
  bukti_url       TEXT,
  paid_at         TIMESTAMPTZ,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE finance_bills IS 'Tagihan / hutang vendor — mapping Google Sheet KEUANGAN tab Tagihan';

CREATE INDEX idx_bills_airport     ON finance_bills(airport_id);
CREATE INDEX idx_bills_status      ON finance_bills(status);
CREATE INDEX idx_bills_jatuh_tempo ON finance_bills(jatuh_tempo);

CREATE TRIGGER trg_bills_updated
  BEFORE UPDATE ON finance_bills
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Auto-update status tagihan jatuh tempo
CREATE OR REPLACE FUNCTION fn_update_bill_overdue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'UNPAID' AND NEW.jatuh_tempo < CURRENT_DATE THEN
    NEW.status := 'OVERDUE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bills_overdue
  BEFORE INSERT OR UPDATE ON finance_bills
  FOR EACH ROW EXECUTE FUNCTION fn_update_bill_overdue();

-- ============================================================
-- TABLE: finance_external_income (Sheet: Pendapatan Luar)
-- ============================================================
CREATE TABLE IF NOT EXISTS finance_external_income (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id  UUID NOT NULL REFERENCES airports(id),
  sumber      TEXT NOT NULL,
  nominal     DECIMAL(15,2) NOT NULL CHECK (nominal > 0),
  tanggal     DATE NOT NULL DEFAULT CURRENT_DATE,
  keterangan  TEXT,
  bukti_url   TEXT,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE finance_external_income IS 'Pendapatan di luar operasional utama — mapping Google Sheet KEUANGAN tab Pendapatan Luar';

CREATE INDEX idx_ext_income_airport ON finance_external_income(airport_id);
CREATE INDEX idx_ext_income_tanggal ON finance_external_income(tanggal);

-- ============================================================
-- VIEW: v_finance_summary (rekap per bandara per bulan)
-- ============================================================
CREATE OR REPLACE VIEW v_finance_summary AS
SELECT
  a.code AS airport_code,
  a.name AS airport_name,
  DATE_TRUNC('month', ft.tanggal)::DATE AS bulan,
  SUM(CASE WHEN ft.jenis = 'PEMASUKAN'   THEN ft.nominal ELSE 0 END) AS total_pemasukan,
  SUM(CASE WHEN ft.jenis = 'PENGELUARAN' THEN ft.nominal ELSE 0 END) AS total_pengeluaran,
  SUM(CASE WHEN ft.jenis = 'PEMASUKAN'   THEN ft.nominal ELSE -ft.nominal END) AS saldo,
  COUNT(*) AS jumlah_transaksi
FROM finance_transactions ft
JOIN airports a ON a.id = ft.airport_id
GROUP BY a.code, a.name, DATE_TRUNC('month', ft.tanggal);

-- ============================================================
-- VIEW: v_cashflow_nasional
-- ============================================================
CREATE OR REPLACE VIEW v_cashflow_nasional AS
SELECT
  DATE_TRUNC('month', tanggal)::DATE AS bulan,
  SUM(CASE WHEN jenis = 'PEMASUKAN'   THEN nominal ELSE 0 END) AS total_pemasukan,
  SUM(CASE WHEN jenis = 'PENGELUARAN' THEN nominal ELSE 0 END) AS total_pengeluaran,
  SUM(CASE WHEN jenis = 'PEMASUKAN'   THEN nominal ELSE -nominal END) AS net_cashflow
FROM finance_transactions
GROUP BY DATE_TRUNC('month', tanggal)
ORDER BY bulan DESC;
