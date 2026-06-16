-- ============================================================
-- RAOS ENTERPRISE — 12_ai.sql
-- Knowledge Base (RAG) + AI Conversations
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: knowledge_documents
-- ────────────────────────────────────────────────────────────
CREATE TABLE knowledge_documents (
  id           UUID               PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT               NOT NULL,
  category     knowledge_category NOT NULL,
  file_path    TEXT,
  content      TEXT,
  airport_id   UUID               REFERENCES airports(id),   -- NULL = nasional
  is_active    BOOLEAN            NOT NULL DEFAULT true,
  uploaded_by  UUID               REFERENCES users(id),
  created_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE knowledge_documents IS 'Dokumen sumber untuk RAG Rifim AI';
COMMENT ON COLUMN knowledge_documents.airport_id IS 'NULL = dokumen nasional (berlaku semua bandara)';

CREATE INDEX idx_kdoc_category  ON knowledge_documents(category);
CREATE INDEX idx_kdoc_airport   ON knowledge_documents(airport_id);
CREATE INDEX idx_kdoc_is_active ON knowledge_documents(is_active);

-- ────────────────────────────────────────────────────────────
-- TABLE: knowledge_chunks (vector embedding untuk similarity search)
-- ────────────────────────────────────────────────────────────
CREATE TABLE knowledge_chunks (
  id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id  UUID        NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index  INTEGER     NOT NULL,
  chunk_text   TEXT        NOT NULL,
  embedding    vector(1536),        -- OpenAI text-embedding-3-small (1536 dims)
  token_count  INTEGER,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_chunk UNIQUE (document_id, chunk_index)
);

COMMENT ON TABLE knowledge_chunks IS 'Potongan teks + vektor embedding untuk cosine similarity search';
COMMENT ON COLUMN knowledge_chunks.embedding IS 'text-embedding-3-small 1536 dims atau Supabase AI';

CREATE INDEX idx_kchunk_doc ON knowledge_chunks(document_id);
-- IVFFlat index — buat setelah minimal 1000 records terisi:
-- CREATE INDEX idx_kchunk_emb ON knowledge_chunks
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ────────────────────────────────────────────────────────────
-- TABLE: ai_conversations
-- ────────────────────────────────────────────────────────────
CREATE TABLE ai_conversations (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  airport_id     UUID        REFERENCES airports(id),
  question       TEXT        NOT NULL,
  answer         TEXT        NOT NULL,
  tokens_used    INTEGER,
  model          TEXT        NOT NULL DEFAULT 'claude-sonnet-4-6',
  context_chunks UUID[]      DEFAULT '{}',    -- knowledge_chunks.id yang dipakai
  rating         SMALLINT    CHECK (rating BETWEEN 1 AND 5),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE ai_conversations IS 'Riwayat tanya jawab Rifim AI per user';

CREATE INDEX idx_ai_conv_user    ON ai_conversations(user_id);
CREATE INDEX idx_ai_conv_airport ON ai_conversations(airport_id);
CREATE INDEX idx_ai_conv_created ON ai_conversations(created_at DESC);
