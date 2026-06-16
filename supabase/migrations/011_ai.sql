-- ============================================================
-- RAOS ENTERPRISE — 011_ai.sql
-- Knowledge Base (RAG) + AI Chat + Airport KPI
-- ============================================================

-- Enable pgvector untuk embedding
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABLE: knowledge_documents
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_documents (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  category    TEXT NOT NULL CHECK (category IN (
                'SOP', 'KEBIJAKAN', 'REGULASI', 'PANDUAN',
                'FAQ', 'LAPORAN', 'LAINNYA'
              )),
  file_path   TEXT,
  content     TEXT,
  airport_id  UUID REFERENCES airports(id),  -- NULL = dokumen nasional
  is_active   BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE knowledge_documents IS 'Dokumen dasar pengetahuan untuk RAG — Rifim AI';

CREATE INDEX idx_knowledge_docs_category ON knowledge_documents(category);
CREATE INDEX idx_knowledge_docs_airport  ON knowledge_documents(airport_id);

CREATE TRIGGER trg_knowledge_docs_updated
  BEFORE UPDATE ON knowledge_documents
  FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- ============================================================
-- TABLE: knowledge_chunks (untuk RAG — vector similarity search)
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  chunk_text   TEXT NOT NULL,
  embedding    vector(1536),       -- OpenAI text-embedding-3-small / Supabase AI
  token_count  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE knowledge_chunks IS 'Potongan teks dokumen dengan vektor embedding untuk similarity search';

CREATE INDEX idx_knowledge_chunks_doc ON knowledge_chunks(document_id);
-- IVFFlat index untuk cosine similarity search (buat setelah data terisi cukup)
-- CREATE INDEX idx_knowledge_chunks_emb ON knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- FUNCTION: match_knowledge_chunks (RAG similarity search)
-- ============================================================
CREATE OR REPLACE FUNCTION fn_match_knowledge_chunks(
  query_embedding  vector(1536),
  match_threshold  FLOAT DEFAULT 0.7,
  match_count      INT   DEFAULT 5,
  p_airport_id     UUID  DEFAULT NULL
) RETURNS TABLE (
  id          UUID,
  document_id UUID,
  chunk_text  TEXT,
  similarity  FLOAT,
  doc_title   TEXT,
  doc_category TEXT
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.document_id,
    kc.chunk_text,
    1 - (kc.embedding <=> query_embedding) AS similarity,
    kd.title,
    kd.category
  FROM knowledge_chunks kc
  JOIN knowledge_documents kd ON kd.id = kc.document_id
  WHERE kd.is_active = true
    AND (p_airport_id IS NULL OR kd.airport_id IS NULL OR kd.airport_id = p_airport_id)
    AND 1 - (kc.embedding <=> query_embedding) > match_threshold
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- ============================================================
-- TABLE: ai_conversations
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_conversations (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  airport_id  UUID REFERENCES airports(id),
  question    TEXT NOT NULL,
  answer      TEXT NOT NULL,
  tokens_used INTEGER,
  model       TEXT DEFAULT 'claude-sonnet-4-6',
  context_chunks UUID[],          -- array dari knowledge_chunks.id yang dipakai
  rating      SMALLINT CHECK (rating BETWEEN 1 AND 5),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_conv_user    ON ai_conversations(user_id);
CREATE INDEX idx_ai_conv_airport ON ai_conversations(airport_id);
CREATE INDEX idx_ai_conv_created ON ai_conversations(created_at DESC);

-- ============================================================
-- TABLE: airport_daily_reports (KPI harian)
-- ============================================================
CREATE TABLE IF NOT EXISTS airport_daily_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  airport_id    UUID NOT NULL REFERENCES airports(id),
  report_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  total_driver  INTEGER NOT NULL DEFAULT 0,
  total_staff   INTEGER NOT NULL DEFAULT 0,
  total_pickup  INTEGER NOT NULL DEFAULT 0,
  total_income  DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_expense DECIMAL(15,2) NOT NULL DEFAULT 0,
  attendance_rate DECIMAL(5,2),   -- persen kehadiran staff
  queue_avg_wait_min DECIMAL(6,2),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (airport_id, report_date)
);

CREATE INDEX idx_daily_reports_airport ON airport_daily_reports(airport_id);
CREATE INDEX idx_daily_reports_date    ON airport_daily_reports(report_date);

-- ============================================================
-- FUNCTION: auto-generate laporan harian
-- ============================================================
CREATE OR REPLACE FUNCTION fn_generate_daily_report(p_airport_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_total_driver  INTEGER;
  v_total_staff   INTEGER;
  v_total_pickup  INTEGER;
  v_total_income  DECIMAL;
  v_total_expense DECIMAL;
  v_att_rate      DECIMAL;
  v_report_id     UUID;
BEGIN
  SELECT COUNT(*) INTO v_total_driver FROM drivers WHERE airport_id = p_airport_id AND status = 'ACTIVE';
  SELECT COUNT(*) INTO v_total_staff  FROM staff   WHERE airport_id = p_airport_id AND status = 'ACTIVE';

  SELECT COUNT(*) INTO v_total_pickup
  FROM pickup_queues
  WHERE airport_id = p_airport_id AND tanggal = p_date AND status = 'DONE';

  SELECT
    SUM(CASE WHEN jenis = 'PEMASUKAN'   THEN nominal ELSE 0 END),
    SUM(CASE WHEN jenis = 'PENGELUARAN' THEN nominal ELSE 0 END)
  INTO v_total_income, v_total_expense
  FROM finance_transactions
  WHERE airport_id = p_airport_id AND tanggal = p_date;

  -- Attendance rate
  SELECT
    ROUND(100.0 * COUNT(DISTINCT staff_id) FILTER (WHERE check_type = 'CHECK_IN')
          / NULLIF(v_total_staff, 0), 2)
  INTO v_att_rate
  FROM attendance
  WHERE airport_id = p_airport_id AND tanggal = p_date;

  INSERT INTO airport_daily_reports (
    airport_id, report_date,
    total_driver, total_staff, total_pickup,
    total_income, total_expense, attendance_rate
  ) VALUES (
    p_airport_id, p_date,
    v_total_driver, v_total_staff, COALESCE(v_total_pickup, 0),
    COALESCE(v_total_income, 0), COALESCE(v_total_expense, 0), COALESCE(v_att_rate, 0)
  )
  ON CONFLICT (airport_id, report_date) DO UPDATE
    SET total_driver    = EXCLUDED.total_driver,
        total_staff     = EXCLUDED.total_staff,
        total_pickup    = EXCLUDED.total_pickup,
        total_income    = EXCLUDED.total_income,
        total_expense   = EXCLUDED.total_expense,
        attendance_rate = EXCLUDED.attendance_rate
  RETURNING id INTO v_report_id;

  RETURN v_report_id;
END;
$$;
